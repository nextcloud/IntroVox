import { getPWAInstructions } from '../utils/deviceDetection.js'
import { translate as t } from '@nextcloud/l10n'

// Function to get base wizard steps (without PWA step) with translations
function getBaseWizardSteps() {
  return [
    // Welkom stap
    {
      id: 'welcome',
      title: t('introvox', 'step_welcome_title'),
      text: t('introvox', 'step_welcome_text'),
      buttons: [
        {
          text: t('introvox', 'Skip'),
          action: 'markCompleted',
          secondary: true
        },
        {
          text: t('introvox', 'Start tour'),
          action: function() { this.next() }
        }
      ]
    },

    // Files app
    {
      id: 'files',
      title: t('introvox', 'step_files_title'),
      text: t('introvox', 'step_files_text'),
      attachTo: {
        element: '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]',
        on: 'right'
      },
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Calendar app
    {
      id: 'calendar',
      title: t('introvox', 'step_calendar_title'),
      text: t('introvox', 'step_calendar_text'),
      attachTo: {
        element: '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]',
        on: 'right'
      },
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Search
    {
      id: 'search',
      title: t('introvox', 'step_search_title'),
      text: t('introvox', 'step_search_text'),
      attachTo: {
        element: '.unified-search__trigger, .header-menu__trigger',
        on: 'bottom'
      },
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Introductie
    {
      id: 'intro',
      title: t('introvox', 'step_intro_title'),
      text: t('introvox', 'step_intro_text'),
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Features
    {
      id: 'features',
      title: t('introvox', 'step_features_title'),
      text: t('introvox', 'step_features_text'),
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Tips
    {
      id: 'tips',
      title: t('introvox', 'step_tips_title'),
      text: t('introvox', 'step_tips_text'),
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Next'),
          action: function() { this.next() }
        }
      ]
    },

    // Complete
    {
      id: 'complete',
      title: t('introvox', 'step_complete_title'),
      text: t('introvox', 'step_complete_text'),
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Done'),
          action: 'markCompleted'
        }
      ]
    }
  ]
}

// Function to get wizard steps with PWA step
export function getWizardSteps() {
  const steps = getBaseWizardSteps()

  // Always show PWA step, but skip if already installed
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    const instructions = getPWAInstructions()

    // Build the steps HTML
    const stepsHtml = instructions.steps
      .map((step) => `<li>${step}</li>`)
      .join('')

    // Create PWA step
    const pwaStep = {
      id: 'pwa',
      title: `${instructions.icon} ${instructions.title}`,
      text: `
        <p><strong>Gebruik Nextcloud als een echte app!</strong></p>
        <p>Je kunt Nextcloud installeren als app op je apparaat. Dan werkt het net als elke andere app:</p>
        <ul>
          <li>✨ Eigen app-icoon op je startscherm/dock</li>
          <li>⚡ Sneller openen (geen browser nodig)</li>
          <li>🎯 Volledige focus zonder browser-tabbladen</li>
          <li>📱 Werkt ook offline voor sommige functies</li>
        </ul>
        <p><strong>Zo installeer je de app:</strong></p>
        <ol>
          ${stepsHtml}
        </ol>
        <p><small>💡 Je kunt deze stap ook overslaan en later installeren wanneer je wilt.</small></p>
      `,
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: 'Begrepen',
          action: function() { this.next() }
        }
      ]
    }

    // Insert PWA step before the complete step (which is the last one)
    steps.splice(steps.length - 1, 0, pwaStep)
  }

  return steps
}

// Function to load custom steps from API
export async function loadCustomSteps() {
  try {
    // Use absolute URL with window.location.origin
    const apiUrl = `${window.location.origin}/apps/introvox/api/steps`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.success) {
      // Return the full response including enabled status
      const hasCustomSteps = !data.useDefault && data.steps && data.steps.length > 0

      return {
        steps: hasCustomSteps ? data.steps : null,
        enabled: data.enabled !== false,
        version: data.version || '1'
      }
    }
  } catch (error) {
    // Failed to load custom steps, will use defaults
  }

  return { steps: null, enabled: true }
}
