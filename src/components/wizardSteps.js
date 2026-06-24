import { getPWAInstructions } from '../utils/deviceDetection.js'
import { translate as t } from '@nextcloud/l10n'

// --- NC34 header navigation helpers -----------------------------------------
// Nextcloud 34 ("Hub 26 Spring") moved the app navigation behind the "waffle"
// apps menu and the personal settings behind the account/avatar menu. Those
// menu items only exist in the DOM once the menu is opened. The helpers below
// let a tour step open such a menu before it shows and close it again after.

// Always-visible header triggers (NC 34). Used both as attach targets and as
// the buttons we click to reveal the hidden menu items.
const APPS_MENU_TRIGGER = '.app-menu__waffle, [aria-label="Open apps menu"]'
const SETTINGS_MENU_TRIGGER = '.header-menu.account-menu .header-menu__trigger, [aria-label="Settings menu"]'
// Items inside the opened waffle menu (NC 34): anchors with per-app hrefs.
const APPS_MENU_ITEM = '[role="menu"] a.app-item'

// Track the trigger we opened ourselves, so cleanup never closes a menu the
// user opened on their own.
let _openedTrigger = null

/**
 * Open a header menu (if not already open) and resolve once an item inside it
 * has rendered. Uses requestAnimationFrame polling so it works whether the menu
 * animates open or appears instantly (reduced motion), capped by a timeout so a
 * future DOM change degrades to a centered step instead of hanging.
 *
 * @param {string} triggerSel CSS selector for the menu trigger button
 * @param {string} itemSel CSS selector for an item that appears once open
 * @param {number} timeout Max wait in ms before resolving anyway
 * @return {Promise<void>}
 */
function openMenuAndWait(triggerSel, itemSel, timeout = 1500) {
  return new Promise((resolve) => {
    const trigger = document.querySelector(triggerSel)
    if (!trigger) {
      resolve()
      return
    }
    // Only click (and remember) if the menu isn't already open.
    if (!document.querySelector(itemSel)) {
      trigger.click()
      _openedTrigger = trigger
    }
    const start = Date.now()
    const tick = () => {
      if (document.querySelector(itemSel) || Date.now() - start > timeout) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/**
 * Close the menu we opened in openMenuAndWait, if it's still open. No-op when
 * the user opened the menu themselves (we never stored a trigger then).
 */
export function closeOpenedMenu() {
  if (_openedTrigger && document.querySelector(APPS_MENU_ITEM)) {
    _openedTrigger.click() // toggle closed
  }
  _openedTrigger = null
}

/**
 * Resolve the first matching element for a list of selectors, returned as a
 * function so Shepherd evaluates it lazily at show-time (not at build-time).
 *
 * @param {...string} selectors CSS selectors tried in order
 * @return {function(): (Element|undefined)}
 */
function firstMatch(...selectors) {
  return () => {
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        return el
      }
    }
    return undefined
  }
}

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
      text: t('introvox', '<p>Files is where you view and manage everything you store.</p><p>On Nextcloud 34 your apps live behind the apps menu (top left) — open it to find Files.</p>'),
      attachTo: {
        // NC <=33 pinned the app in the header; NC 34 keeps everything behind
        // the always-visible apps menu (waffle). Try the pinned entry first,
        // then fall back to the waffle so the step always has a visible target.
        element: firstMatch(
          '#appmenu li[data-id="files"]',
          'a.app-menu-entry[href*="/apps/files"]',
          '[data-id="files"]',
          APPS_MENU_TRIGGER,
        ),
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
      id: 'appsmenu',
      title: t('introvox', '🧭 All your apps'),
      text: t('introvox', '<p>Switch between Files, Calendar, Mail, Contacts and more from the apps menu.</p><p>Click it any time to jump to another app.</p>'),
      // Only relevant where the apps menu (waffle) exists, i.e. NC 34+.
      showOn: () => !!document.querySelector(APPS_MENU_TRIGGER),
      // Open the waffle menu before showing so we can point at a real app entry
      // inside it. Degrades to the closed waffle button if the menu never opens.
      beforeShowPromise: () => openMenuAndWait(APPS_MENU_TRIGGER, APPS_MENU_ITEM),
      attachTo: {
        element: firstMatch(
          '[role="menu"] a.app-item[href*="/apps/files/"]',
          APPS_MENU_ITEM,
          APPS_MENU_TRIGGER,
        ),
        on: 'bottom'
      },
      // Don't let clicks reach the highlighted item — that would navigate away
      // or close the menu mid-step.
      canClickTarget: false,
      when: {
        hide() { closeOpenedMenu() },
        cancel() { closeOpenedMenu() }
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
        // NC 34+ renders an inline searchbar (.unified-search-input); NC <=33 used an
        // icon button (.unified-search__trigger). Try them in order so the step targets
        // the real search on every supported version — .header-menu__trigger is the last
        // resort (on NC 34 alone it would land on the notifications bell).
        element: firstMatch(
          '.unified-search-input',
          '.unified-search__trigger',
          '.header-menu__trigger',
        ),
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
      id: 'settings',
      title: t('introvox', '⚙️ Your account & settings'),
      text: t('introvox', '<p>Your profile, personal settings and the log out button live under your avatar (top right).</p><p>Click it whenever you want to adjust your account.</p>'),
      attachTo: {
        // The account/avatar menu trigger is always visible. We point at it
        // rather than auto-opening it (its items only exist once opened).
        element: firstMatch(
          SETTINGS_MENU_TRIGGER,
          '#settings .header-menu__trigger',
          '#expand',
        ),
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
      text: t('introvox', '<p><strong>Finding your way around:</strong></p><ul><li>Use the <strong>apps menu</strong> (top left) to switch between apps</li><li>Open your <strong>avatar</strong> (top right) for your account and settings</li><li>Use the <strong>search bar</strong> to quickly find files and more</li></ul>'),
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

// Behavioral fields that cannot survive JSON serialization (functions) and so
// can never come from the server / admin-authored steps. When the server
// provides the default set inline, we re-attach these by step id.
const BEHAVIORAL_FIELDS = ['attachTo', 'beforeShowPromise', 'when', 'showOn', 'canClickTarget', 'advanceOn']

/**
 * Layer the client-side behavioral fields (function attachTo, beforeShowPromise,
 * when, showOn, …) of the bundled default steps onto server-provided steps,
 * keyed by id. The server stays authoritative for title/text/order/enabled;
 * we only restore behaviors that JSON can't carry. Steps that exist only on the
 * client (e.g. the auto-open "appsmenu" step) are injected after their anchor.
 *
 * Server steps carry attachTo as a plain string selector. When a matching base
 * step exists, its richer function attachTo wins; otherwise the string is kept
 * (WizardManager wraps any string selector in a lazy function).
 *
 * @param {Array<object>} serverSteps Steps returned by the API
 * @return {Array<object>} Enriched steps
 */
export function enrichSteps(serverSteps) {
  const base = getBaseWizardSteps()
  const baseById = new Map(base.map((s) => [s.id, s]))
  const serverIds = new Set(serverSteps.map((s) => s.id))

  const enriched = serverSteps.map((step) => {
    const baseStep = baseById.get(step.id)
    if (!baseStep) {
      return step
    }
    const merged = { ...step }
    for (const field of BEHAVIORAL_FIELDS) {
      if (field in baseStep) {
        merged[field] = baseStep[field]
      }
    }
    return merged
  })

  // Inject client-only base steps (no server twin) right after the step that
  // precedes them in the base order, so ordering stays intuitive.
  base.forEach((baseStep, index) => {
    if (serverIds.has(baseStep.id)) {
      return
    }
    const anchorId = index > 0 ? base[index - 1].id : null
    const at = anchorId ? enriched.findIndex((s) => s.id === anchorId) : -1
    if (at >= 0) {
      enriched.splice(at + 1, 0, baseStep)
    } else {
      enriched.push(baseStep)
    }
  })

  return enriched
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
