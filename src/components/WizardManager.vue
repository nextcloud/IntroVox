<template>
  <div class="wizard-manager">
    <!-- Wizard draait via Shepherd.js, geen visuele template nodig -->
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'
import { translate as t } from '@nextcloud/l10n'
import { getWizardSteps, loadCustomSteps } from './wizardSteps'

export default {
  name: 'WizardManager',
  setup() {
    let tour = null
    const storageKey = 'introvox_completed'

    const isCompleted = () => {
      return localStorage.getItem(storageKey) === 'true'
    }

    const markCompleted = () => {
      localStorage.setItem(storageKey, 'true')
    }

    const reset = () => {
      localStorage.removeItem(storageKey)
    }

    const initTour = async () => {
      // Try to load custom steps from admin settings
      const response = await loadCustomSteps()

      // Check if wizard is globally disabled
      if (response && response.enabled === false) {
        console.log('⚠️ Wizard is globally disabled by administrator')
        return false
      }

      const customSteps = response ? response.steps : null
      const stepsToUse = customSteps || getWizardSteps()

      tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'nextcloud-wizard-step',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: { enabled: true },
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
              text: step.buttons?.[0]?.text || t('introvox', 'Skip'),
              action: step.buttons?.[0]?.action === 'markCompleted' ? 'markCompleted' : tour.cancel,
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
                  markCompleted()
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
        markCompleted()
      })

      tour.on('cancel', () => {
        console.log('Wizard cancelled - marking as completed')
        markCompleted()
      })
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

      // Auto-start wizard for new users, but wait for Nextcloud to be ready
      if (!isCompleted()) {
        waitForNextcloudReady().then(async () => {
          setTimeout(async () => {
            await startTour()
          }, 1000)
        })
      }
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
