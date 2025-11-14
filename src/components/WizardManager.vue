<template>
  <div class="wizard-manager">
    <!-- Wizard draait via Shepherd.js, geen visuele template nodig -->
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'
import { translate as t, getLanguage } from '@nextcloud/l10n'
import { getWizardSteps, loadCustomSteps } from './wizardSteps'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

export default {
  name: 'WizardManager',
  setup() {
    let tour = null
    const storageKey = 'introvox_completed'
    const versionKey = 'introvox_version'

    const isCompleted = (serverVersion, userDisabledWizard) => {
      const completed = localStorage.getItem(storageKey) === 'true'
      const localVersion = localStorage.getItem(versionKey)

      // If user permanently disabled wizard, ALWAYS respect that
      // (admin can only override by resetting the user preference via "Show to all users" button,
      //  which deletes the wizard_disabled setting from the database)
      if (userDisabledWizard) {
        console.log('⏭️ Wizard permanently disabled by user preference')
        return true // Don't show wizard
      }

      // If server version is newer, wizard should be shown again (for users who didn't disable it)
      if (serverVersion && localVersion && serverVersion !== localVersion) {
        console.log(`🔄 Wizard version changed from ${localVersion} to ${serverVersion} - showing wizard again`)
        return false
      }

      return completed
    }

    const markCompleted = async (serverVersion, disableWizard = true) => {
      localStorage.setItem(storageKey, 'true')
      if (serverVersion) {
        localStorage.setItem(versionKey, serverVersion)
      }

      // Optionally disable wizard for this user
      if (disableWizard) {
        try {
          await axios.post(generateUrl('/apps/introvox/personal/settings'), {
            wizardDisabled: true
          })
          console.log('✅ Wizard automatically disabled after completion')
        } catch (error) {
          console.warn('⚠️ Failed to auto-disable wizard:', error)
        }
      }
    }

    const skipWizard = async (serverVersion) => {
      // Mark as completed and permanently disable wizard
      await markCompleted(serverVersion, true)
      console.log('⏭️ Wizard skipped and permanently disabled')
    }

    const reset = () => {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(versionKey)
    }

    const initTour = async () => {
      // Try to load custom steps from admin settings
      const response = await loadCustomSteps()

      // Check if wizard is globally disabled
      if (response && response.enabled === false) {
        console.log('⚠️ Wizard is globally disabled by administrator')
        return false
      }

      const serverVersion = response ? response.version : '1'
      const customSteps = response ? response.steps : null
      let stepsToUse = customSteps || getWizardSteps()

      // Filter out disabled steps (handle both boolean false and string "false")
      stepsToUse = stepsToUse.filter(step => {
        const isEnabled = step.enabled !== false && step.enabled !== 'false' && step.enabled !== 0
        console.log(`Step ${step.id}: enabled=${step.enabled}, isEnabled=${isEnabled}`)
        return isEnabled
      })
      console.log(`✅ Using ${stepsToUse.length} enabled wizard steps out of ${customSteps?.length || getWizardSteps().length} total`)

      tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'nextcloud-wizard-step',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true,
            label: 'Close'
          },
          modalOverlayOpeningPadding: 12,
          modalOverlayOpeningRadius: 16
        }
      })

      console.log(`🎨 Initializing wizard with ${stepsToUse.length} steps${customSteps ? ' (custom)' : ' (default)'}`)

      // Add all steps
      stepsToUse.forEach((step, index) => {
        // Normalize attachTo for custom steps (might be string instead of object)
        let attachTo = null
        if (step.attachTo) {
          if (typeof step.attachTo === 'string') {
            // Custom step format: simple string selector
            attachTo = {
              element: step.attachTo,
              on: step.position || 'right'
            }
          } else if (step.attachTo.element) {
            // Default step format: object with element and on
            attachTo = step.attachTo
          }
        }

        // For steps with attachTo, check if element exists
        if (attachTo) {
          const element = document.querySelector(attachTo.element)
          if (!element) {
            console.log(`⚠️ Wizard: Skipping step "${step.id}" - element not found:`, attachTo.element)
            return // Skip this step if element doesn't exist
          }
          console.log(`✅ Wizard: Adding step "${step.id}" - element found`)
        } else {
          console.log(`✅ Wizard: Adding centered step "${step.id}"`)
        }

        // Generate buttons dynamically based on position
        const isFirstStep = index === 0
        const isLastStep = index === stepsToUse.length - 1

        let buttons = []

        if (isFirstStep) {
          // First step: Skip button + Next/Start button
          buttons = [
            {
              text: step.buttons?.[0]?.text || t('introvox', 'Skip and don\'t show again'),
              action: 'skipWizard',
              secondary: true
            },
            {
              text: step.buttons?.[1]?.text || t('introvox', 'Start tour'),
              action: tour.next
            }
          ]
        } else if (isLastStep) {
          // Last step: Back button + Complete button
          buttons = [
            {
              text: t('introvox', 'Back'),
              action: tour.back,
              secondary: true
            },
            {
              text: step.buttons?.[1]?.text || t('introvox', 'Done'),
              action: 'markCompleted'
            }
          ]
        } else {
          // Middle steps: Back button + Next button
          buttons = [
            {
              text: t('introvox', 'Back'),
              action: tour.back,
              secondary: true
            },
            {
              text: t('introvox', 'Next'),
              action: tour.next
            }
          ]
        }

        // Use custom buttons if explicitly provided (unless it's position-dependent)
        if (step.buttons && !isFirstStep && !isLastStep) {
          buttons = step.buttons
        }

        // Determine if step should be centered (no attachTo)
        const stepClasses = attachTo
          ? 'nextcloud-wizard-step'
          : 'nextcloud-wizard-step shepherd-centered'

        tour.addStep({
          ...step,
          attachTo: attachTo,
          classes: stepClasses,
          buttons: buttons.map(btn => ({
            ...btn,
            action: btn.action === 'markCompleted'
              ? () => {
                  markCompleted(serverVersion)
                  tour.complete()
                }
              : btn.action === 'skipWizard'
              ? () => {
                  skipWizard(serverVersion)
                  tour.complete()
                }
              : btn.action
          }))
        })
      })

      console.log(`✅ Wizard initialized with ${tour.steps.length} active steps`)

      // Setup event listeners
      tour.on('complete', () => {
        console.log('Wizard completed')
        // Don't auto-disable here, it's handled by the specific button actions
      })

      tour.on('cancel', () => {
        console.log('Wizard cancelled via X button - closing without disabling')
        // Just mark as completed in localStorage without disabling the wizard
        localStorage.setItem(storageKey, 'true')
        if (serverVersion) {
          localStorage.setItem(versionKey, serverVersion)
        }
      })

      return serverVersion
    }

    const startTour = async () => {
      if (!tour) {
        await initTour()
      }
      if (tour) {
        tour.start()
      }
    }

    const waitForNextcloudReady = () => {
      return new Promise((resolve) => {
        // Check if Nextcloud's own first-run wizard is active
        const checkNextcloudWizard = () => {
          // Look for Nextcloud's first-run wizard elements
          const introVox = document.querySelector('.firstrunwizard') ||
                                   document.querySelector('#firstrunwizard') ||
                                   document.querySelector('[class*="first-run"]') ||
                                   document.querySelector('[id*="first-run"]')

          if (introVox) {
            console.log('⏳ Nextcloud first-run wizard detected, waiting...')
            return false
          }
          return true
        }

        // Check if navigation bar is visible
        const checkNavigationBar = () => {
          const navigationBar = document.querySelector('#header') ||
                                document.querySelector('header') ||
                                document.querySelector('#navigation') ||
                                document.querySelector('[role="banner"]')

          if (!navigationBar || navigationBar.offsetHeight === 0) {
            console.log('⏳ Navigation bar not visible yet, waiting...')
            return false
          }
          return true
        }

        // Poll for readiness
        const checkReadiness = () => {
          if (checkNextcloudWizard() && checkNavigationBar()) {
            console.log('✅ Nextcloud ready, navigation bar visible')
            resolve()
          } else {
            setTimeout(checkReadiness, 500)
          }
        }

        // Start checking after a short delay
        setTimeout(checkReadiness, 500)
      })
    }

    onMounted(() => {
      console.log('🎨 First Use Wizard (Vue) loaded')

      // Expose to window for manual control
      window.introVox = {
        start: startTour,
        reset: reset,
        isCompleted: isCompleted
      }

      // Check with backend to see if wizard should be shown
      Promise.all([
        loadCustomSteps(),
        axios.get(generateUrl('/apps/introvox/personal/settings')).catch(() => ({ data: { wizardDisabledByUser: false } }))
      ]).then(([stepsResponse, personalResponse]) => {
        const serverVersion = stepsResponse ? stepsResponse.version : '1'
        const userDisabledWizard = personalResponse?.data?.wizardDisabledByUser || false

        // Auto-start wizard for new users or when version changed
        if (!isCompleted(serverVersion, userDisabledWizard)) {
          // Check if user's language is enabled in admin settings
          const userLanguage = getLanguage()
          const baseLang = userLanguage.substring(0, 2) // Extract base language (e.g., 'en_US' -> 'en')
          console.log('🌍 User language detected:', userLanguage, '(base:', baseLang + ')')

          if (!stepsResponse || stepsResponse.enabled === false) {
            console.log('⚠️ Wizard is globally disabled by administrator')
            return
          }

          if (stepsResponse.languageDisabled) {
            console.log('⚠️ Wizard skipped: User language (' + baseLang + ') is not enabled in admin settings')
            console.log('ℹ️ Administrator needs to enable this language in Admin Settings → IntroVox')
            return
          }

          console.log('✅ Wizard enabled for user language:', baseLang)

          waitForNextcloudReady().then(async () => {
            setTimeout(async () => {
              await startTour()
            }, 1000)
          })
        } else {
          console.log('✅ Wizard already completed for current version or disabled by user')
        }
      })
    })

    onUnmounted(() => {
      if (tour) {
        tour.complete()
      }
    })

    return {
      startTour,
      reset,
      isCompleted
    }
  }
}
</script>

<style scoped>
.wizard-manager {
  /* No visible UI needed, wizard is overlay-based */
}
</style>
