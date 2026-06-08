import { getPWAInstructions } from '../utils/deviceDetection.js'
import { translate as t } from '@nextcloud/l10n'

function getBaseWizardSteps() {
  return [
    {
      id: 'welcome',
      title: t('introvox', '👋 Welcome to Nextcloud'),
      text: t('introvox', '<p>Nice to have you here! This short tour will help you get started quickly.</p><p>You can close this wizard at any time and open it again later.</p>'),
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
    {
      id: 'files',
      title: t('introvox', '📁 Files'),
      text: t('introvox', '<p>This is your main menu. Click here to view and manage all your files.</p><p>You can upload files, create folders and share with others.</p>'),
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
    {
      id: 'calendar',
      title: t('introvox', '📅 Calendar'),
      text: t('introvox', '<p>Here you\'ll find your personal calendar.</p><p>Schedule appointments, set reminders and share your calendar with others.</p>'),
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
    {
      id: 'search',
      title: t('introvox', '🔍 Search'),
      text: t('introvox', '<p>With the search bar you can quickly find files, contacts and more.</p><p>Just type what you\'re looking for and press Enter.</p>'),
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
    {
      id: 'intro',
      title: t('introvox', '🎯 Getting started'),
      text: t('introvox', '<p><strong>Nextcloud is your personal cloud storage!</strong></p><p>Here you can:</p><ul><li>📁 Upload, share and collaborate on files</li><li>📅 Manage your calendar</li><li>✉️ Send and receive email</li><li>👥 Keep track of contacts</li></ul>'),
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
    {
      id: 'features',
      title: t('introvox', '✨ Important features'),
      text: t('introvox', '<p><strong>Navigation:</strong></p><ul><li>Use the <strong>main menu</strong> (left) to switch between apps</li><li>Click on your <strong>username</strong> (top right) for settings</li><li>Use the <strong>search bar</strong> to quickly find files</li></ul>'),
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
    {
      id: 'tips',
      title: t('introvox', '💡 Useful tips'),
      text: t('introvox', '<p><strong>Did you know:</strong></p><ul><li>You can upload files by dragging them to your browser</li><li>You can directly share files with a link</li><li>You can also use Nextcloud as an app on your phone</li><li>All your data is stored privately and securely</li></ul>'),
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
    {
      id: 'complete',
      title: t('introvox', '🎉 Done!'),
      text: t('introvox', '<p>You\'re all set to get started!</p><p>If you want to see this tour again, you can find it in your personal settings.</p><p>Have fun with Nextcloud!</p>'),
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

export function getWizardSteps() {
  const steps = getBaseWizardSteps()

  // Always show PWA step, but skip if already installed
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    const instructions = getPWAInstructions()

    const stepsHtml = instructions.steps
      .map((step) => `<li>${step}</li>`)
      .join('')

    const pwaStep = {
      id: 'pwa',
      title: `${instructions.icon} ${instructions.title}`,
      text: `
        <p><strong>${t('introvox', 'Use Nextcloud as a real app!')}</strong></p>
        <p>${t('introvox', 'You can install Nextcloud as an app on your device. It then works just like any other app:')}</p>
        <ul>
          <li>${t('introvox', '✨ Own app icon on your home screen/dock')}</li>
          <li>${t('introvox', '⚡ Faster to open (no browser needed)')}</li>
          <li>${t('introvox', '🎯 Full focus without browser tabs')}</li>
          <li>${t('introvox', '📱 Also works offline for some features')}</li>
        </ul>
        <p><strong>${t('introvox', 'How to install the app:')}</strong></p>
        <ol>
          ${stepsHtml}
        </ol>
        <p><small>${t('introvox', '💡 You can also skip this step and install later whenever you want.')}</small></p>
      `,
      buttons: [
        {
          text: t('introvox', 'Back'),
          action: function() { this.back() },
          secondary: true
        },
        {
          text: t('introvox', 'Got it'),
          action: function() { this.next() }
        }
      ]
    }

    // Insert PWA step before the complete step (which is the last one)
    steps.splice(steps.length - 1, 0, pwaStep)
  }

  return steps
}

export async function loadCustomSteps() {
  try {
    const apiUrl = `${window.location.origin}/apps/introvox/api/steps`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.success) {
      // Trust whatever the server sends. Since 1.7.0 the API returns the full
      // Transifex-translated default set inline when no admin override exists,
      // so falling back to the client-side bundled defaults (which would re-
      // translate via the Vue translation bundle and pick e.g. NL for an IT
      // user without an IT bundle) is wrong.
      const hasSteps = Array.isArray(data.steps) && data.steps.length > 0

      return {
        steps: hasSteps ? data.steps : null,
        enabled: data.enabled !== false,
        version: data.version || '1'
      }
    }
  } catch (error) {
    // Failed to load custom steps, will use defaults
  }

  return { steps: null, enabled: true }
}
