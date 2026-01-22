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
        return true // Don't show wizard
      }

      // If server version is newer, wizard should be shown again (for users who didn't disable it)
      if (serverVersion && localVersion && serverVersion !== localVersion) {
        return false
      }

      return completed
    }

    const markCompleted = async (serverVersion, disableWizard = true) => {
      localStorage.setItem(storageKey, 'true')
      if (serverVersion) {
        localStorage.setItem(versionKey, serverVersion)
      }

      // Track wizard completion
      await trackWizardComplete()

      // Optionally disable wizard for this user
      if (disableWizard) {
        try {
          await axios.post(generateUrl('/apps/introvox/personal/settings'), {
            wizardDisabled: true
          })
        } catch (error) {
          // Failed to auto-disable wizard
        }
      }
    }

    const skipWizard = async (serverVersion) => {
      // Track wizard skip
      await trackWizardSkip()
      // Mark as completed and permanently disable wizard (but don't track completion again)
      localStorage.setItem(storageKey, 'true')
      if (serverVersion) {
        localStorage.setItem(versionKey, serverVersion)
      }
      try {
        await axios.post(generateUrl('/apps/introvox/personal/settings'), {
          wizardDisabled: true
        })
      } catch (error) {
        // Failed to auto-disable wizard
      }
    }

    const reset = () => {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(versionKey)
    }

    // Track wizard start event
    const trackWizardStart = async () => {
      try {
        await axios.post(generateUrl('/apps/introvox/api/wizard/start'))
      } catch (error) {
        console.error('Failed to track wizard start:', error)
      }
    }

    // Track wizard complete event
    const trackWizardComplete = async () => {
      try {
        await axios.post(generateUrl('/apps/introvox/api/wizard/complete'))
      } catch (error) {
        console.error('Failed to track wizard complete:', error)
      }
    }

    // Track wizard skip event
    const trackWizardSkip = async () => {
      try {
        await axios.post(generateUrl('/apps/introvox/api/wizard/skip'))
      } catch (error) {
        console.error('Failed to track wizard skip:', error)
      }
    }

    const initTour = async () => {
      // Try to load custom steps from admin settings
      const response = await loadCustomSteps()

      // Check if wizard is globally disabled
      if (response && response.enabled === false) {
        return false
      }

      const serverVersion = response ? response.version : '1'
      const customSteps = response ? response.steps : null
      let stepsToUse = customSteps || getWizardSteps()

      // Filter out disabled steps (handle both boolean false and string "false")
      stepsToUse = stepsToUse.filter(step => {
        const isEnabled = step.enabled !== false && step.enabled !== 'false' && step.enabled !== 0
        return isEnabled
      })

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
            return // Skip this step if element doesn't exist
          }
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

      // Setup event listeners
      tour.on('complete', () => {
        // Don't auto-disable here, it's handled by the specific button actions
      })

      tour.on('cancel', () => {
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
        // Track wizard start
        await trackWizardStart()
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
            return false
          }
          return true
        }

        // Poll for readiness
        const checkReadiness = () => {
          if (checkNextcloudWizard() && checkNavigationBar()) {
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

          if (!stepsResponse || stepsResponse.enabled === false) {
            return
          }

          if (stepsResponse.languageDisabled) {
            return
          }

          waitForNextcloudReady().then(async () => {
            setTimeout(async () => {
              await startTour()
            }, 1000)
          })
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
