import { getPWAInstructions, isPWAInstallable } from '../utils/deviceDetection.js'
import { translate as t } from '@nextcloud/l10n'

// Base wizard steps (without PWA step)
const baseWizardSteps = [
  // Welkom stap
  {
    id: 'welcome',
    title: '👋 Welkom bij Nextcloud',
    text: `
      <p>Leuk dat je er bent! Deze korte tour helpt je om snel op weg te gaan.</p>
      <p>Je kunt op elk moment deze wizard afsluiten en later weer openen.</p>
    `,
    buttons: [
      {
        text: 'Sla over',
        action: 'markCompleted',
        secondary: true
      },
      {
        text: 'Start tour',
        action: function() { this.next() }
      }
    ]
  },

  // Files app
  {
    id: 'files',
    title: '📁 Bestanden',
    text: `
      <p>Dit is je hoofdmenu. Klik hier om al je bestanden te bekijken en te beheren.</p>
      <p>Je kunt bestanden uploaden, mappen maken en delen met anderen.</p>
    `,
    attachTo: {
      element: '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]',
      on: 'right'
    },
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Calendar app
  {
    id: 'calendar',
    title: '📅 Agenda',
    text: `
      <p>Hier vind je je persoonlijke agenda.</p>
      <p>Plan afspraken, stel herinneringen in en deel je agenda met anderen.</p>
      <p>Je kunt je agenda ook synchroniseren met je telefoon of andere apparaten.</p>
    `,
    attachTo: {
      element: '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]',
      on: 'right'
    },
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Search
  {
    id: 'search',
    title: '🔍 Zoeken',
    text: `
      <p>Met de zoekbalk kun je snel bestanden, contacten en meer vinden.</p>
      <p>Typ gewoon wat je zoekt en druk op Enter.</p>
      <p>Je kunt ook filteren op bestandstype of datum.</p>
    `,
    attachTo: {
      element: 'button[data-v-ce3a06f2][aria-describedby="aiext"][aria-label="Unified search"][type="button"], button[aria-label="Unified search"], .header-menu__trigger, [data-v-ce3a06f2].button-vue__wrapper button, .unified-search__trigger',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Introductie
  {
    id: 'intro',
    title: '🎯 Aan de slag',
    text: `
      <p><strong>Nextcloud is jouw persoonlijke cloudopslag!</strong></p>
      <p>Hier kun je:</p>
      <ul>
        <li>📁 Bestanden uploaden, delen en samenwerken</li>
        <li>📅 Je agenda beheren</li>
        <li>✉️ E-mail versturen en ontvangen</li>
        <li>👥 Contacten bijhouden</li>
      </ul>
    `,
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Features
  {
    id: 'features',
    title: '✨ Belangrijke functies',
    text: `
      <p><strong>Navigatie:</strong></p>
      <ul>
        <li>Gebruik het <strong>hoofdmenu</strong> (links) om tussen apps te schakelen</li>
        <li>Klik op je <strong>gebruikersnaam</strong> (rechts boven) voor instellingen</li>
        <li>Gebruik de <strong>zoekbalk</strong> om snel bestanden te vinden</li>
      </ul>
    `,
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Tips
  {
    id: 'tips',
    title: '💡 Handige tips',
    text: `
      <p><strong>Wist je dat:</strong></p>
      <ul>
        <li>Je bestanden kunt uploaden door ze naar je browser te slepen</li>
        <li>Je bestanden direct kunt delen met een link</li>
        <li>Je Nextcloud ook als app op je telefoon kunt gebruiken</li>
        <li>Al je data privé en veilig is opgeslagen</li>
      </ul>
    `,
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Volgende',
        action: function() { this.next() }
      }
    ]
  },

  // Complete
  {
    id: 'complete',
    title: '🎉 Klaar!',
    text: `
      <p>Je bent helemaal klaar om te beginnen!</p>
      <p>Als je deze tour nog een keer wilt zien, kun je die opnieuw starten via <strong>Instellingen → IntroVox</strong>.</p>
      <p>Veel plezier met Nextcloud!</p>
    `,
    buttons: [
      {
        text: 'Vorige',
        action: function() { this.back() },
        secondary: true
      },
      {
        text: 'Afronden',
        action: 'markCompleted'
      }
    ]
  }
]

// Function to get wizard steps with PWA step
export function getWizardSteps() {
  const steps = [...baseWizardSteps]

  // Always show PWA step, but skip if already installed
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    const instructions = getPWAInstructions()

    // Build the steps HTML
    const stepsHtml = instructions.steps
      .map((step, index) => `<li>${step}</li>`)
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
          text: 'Vorige',
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
    console.log('📡 Fetching custom steps from:', apiUrl)

    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log('📡 API response:', data)

    if (data.success) {
      // Return the full response including enabled status
      const hasCustomSteps = !data.useDefault && data.steps && data.steps.length > 0
      if (hasCustomSteps) {
        console.log(`📋 Loaded ${data.steps.length} custom wizard steps from admin settings`)
      } else {
        console.log('📋 Using default wizard steps (no custom steps configured)')
      }

      return {
        steps: hasCustomSteps ? data.steps : null,
        enabled: data.enabled !== false
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load custom steps, using defaults:', error)
  }

  return { steps: null, enabled: true }
}

// Export for backward compatibility (but use getWizardSteps() instead)
export const wizardSteps = getWizardSteps()
