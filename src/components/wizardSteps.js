import { getPWAInstructions } from '../utils/deviceDetection.js'
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { openTriggerFor, popupOf } from '../utils/popups.mjs'
import { splitSelectorList } from '../utils/selectorList.mjs'

// --- Header navigation helpers ----------------------------------------------
// Nextcloud 34 ("Hub 26 Spring") moved the app navigation behind the "waffle"
// apps menu and the personal settings behind the account/avatar menu; 35 keeps
// that layout (verified on 35.0.0 beta 4). Those menu items only exist in the
// DOM once the menu is opened. The helpers below let a tour step open such a
// menu before it shows and close it again after.

// Always-visible header triggers (NC 34+). Used both as attach targets and as
// the buttons we click to reveal the hidden menu items.
const APPS_MENU_TRIGGER = '.app-menu__waffle, [aria-label="Open apps menu"]'
// Account/avatar menu trigger. NC 34+ wraps it in .header-menu__trigger; that
// class does not exist on NC <=33 (verified against the core bundle of 32.0.7
// and 33.0.1), where the markup is #user-menu.account-menu > button >
// .account-menu__avatar. The avatar class is the same on 32-35 and, unlike an
// aria-label (which core renders through t('core', ...) and therefore differs
// per language), it is language-independent — so it comes before any
// label-based match. #user-menu stays last as a wrapper-level fallback: it
// resolves, but highlights the whole container instead of the avatar.
const SETTINGS_MENU_TRIGGER = '.header-menu.account-menu .header-menu__trigger, #user-menu .header-menu__trigger, #user-menu .account-menu__avatar, #user-menu button, [aria-label="Settings menu"], #user-menu'
// Items inside the opened waffle menu (NC 34): anchors with per-app hrefs.
const APPS_MENU_ITEM = '[role="menu"] a.app-item'
// The opened waffle menu panel (the white popover box). Used as the attach
// target so the tooltip sits beside the whole menu instead of under it.
// `.app-menu__popover` is a stable direct class on the panel; the :has()
// variant is a fallback for older/newer markup.
const APPS_MENU_PANEL = '.app-menu__popover, [role="menu"].app-menu__popover, .v-popper__popper:has([role="menu"] a.app-item)'

// NC <=33 keeps the apps as an always-visible inline bar in the header
// (.app-menu__list with .app-menu-entry items) — no waffle, no data-id. The
// link lives inside the <li class="app-menu-entry">.
const NC33_FILES_ENTRY = '.app-menu-entry a[href*="/apps/files"], #appmenu a[href*="/apps/files"]'
// NC <=33 search is an icon button (#unified-search), not the NC 34 searchbar.
const NC33_SEARCH_TRIGGER = '#unified-search, [aria-label="Unified search"]'

// Track the trigger we opened ourselves (and an item that shows the menu is
// open), so cleanup never closes a menu the user opened on their own.
let _openedTrigger = null
let _openedItemSel = null

// Admin-entered selectors can be invalid; that must degrade to "not found"
// (the step waits aside for its element), not throw inside a tour step.
function safeQueryAll(selector) {
  try {
    return [...document.querySelectorAll(selector)]
  } catch (e) {
    return []
  }
}

// Page content comes from users too: a link in a Talk message or a shared
// README can match a selector like a[href*="/apps/spreed/"]. The tour never
// points at, let alone clicks, a link that leaves this Nextcloud.
function isForeignLink(el) {
  const link = el.closest('a[href]')
  if (!link) {
    return false
  }
  try {
    return new URL(link.href, window.location.href).origin !== window.location.origin
  } catch (e) {
    return true
  }
}

/**
 * The first element, trying a selector list in its written order, that
 * passes the test.
 *
 * @param {string} selector CSS selector list
 * @param {Function} usable Test for a matched element
 * @return {Element|undefined}
 */
function firstUsable(selector, usable) {
  for (const part of splitSelectorList(selector)) {
    const el = safeQueryAll(part).find(usable)
    if (el) {
      return el
    }
  }
  return undefined
}

/**
 * The element a step points at: the first match that is not a link to
 * another site. In a list, an earlier selector goes before a later one,
 * wherever their elements are in the page.
 *
 * @param {string} selector CSS selector list
 * @return {Element|undefined}
 */
export function findTarget(selector) {
  // An element without a box (display: none, or a menu entry hidden on a
  // narrow screen) has nothing to point at: the step waits aside instead.
  return firstUsable(selector, el => !isForeignLink(el) && el.getClientRects().length > 0)
}

function safeQuery(selector) {
  return findTarget(selector) || null
}

// "Open first" is for menus. Clicking whatever else a selector matches (a
// log-out link, a delete button) on every user's page at tour start is not
// something a tour step should be able to do, however it got configured.
function findMenuButton(selector) {
  return firstUsable(selector, el => !isForeignLink(el)
    && el.matches('[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded]'))
}

/**
 * Open a header menu (if not already open) and resolve once an item inside it
 * has rendered. Uses requestAnimationFrame polling so it works whether the menu
 * animates open or appears instantly (reduced motion), capped by a timeout so a
 * future DOM change degrades to a step waiting aside instead of hanging.
 *
 * @param {string} triggerSel CSS selector for the menu trigger button
 * @param {string} itemSel CSS selector for an item that appears once open
 * @param {number} timeout Max wait in ms before resolving anyway
 * @return {Promise<void>}
 */
function openMenuAndWait(triggerSel, itemSel, timeout = 1500) {
  return new Promise((resolve) => {
    const trigger = findMenuButton(triggerSel)
    if (!trigger) {
      resolve()
      return
    }
    // Only click (and remember) if the menu isn't already open.
    if (!safeQuery(itemSel)) {
      trigger.click()
      _openedTrigger = trigger
      _openedItemSel = itemSel
    }
    const start = Date.now()
    const tick = () => {
      if (safeQuery(itemSel) || Date.now() - start > timeout) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/**
 * Resolve once an element matching the selector exists, or after the
 * timeout (the step then waits aside for it). Apps like Talk render their
 * interface after the page load, so right after navigating to one the
 * target is often not there yet.
 *
 * @param {string} selector CSS selector
 * @param {number} timeout Max wait in ms
 * @return {Promise<void>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (safeQuery(selector) || Date.now() - start > timeout) {
        resolve()
        return
      }
      setTimeout(tick, 100)
    }
    tick()
  })
}

/**
 * A blinking arrow next to a step's element, on the side the step is on,
 * pointing at it (css/wizard.css). It follows the element while the step
 * shows, through scrolling and the page moving.
 *
 * @param {HTMLElement} target The step's element
 * @param {HTMLElement} stepElement The step itself, with Shepherd's placement
 * @return {Function} Takes it away
 */
export function showPointer(target, stepElement) {
  const pointer = document.createElement('div')
  pointer.className = 'introvox-pointer'
  pointer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(pointer)
  // Clear of the element's outline, in the room the step leaves
  const gap = 4
  let frame = 0
  const place = () => {
    const rect = target.getBoundingClientRect()
    const side = (stepElement.getAttribute('data-popper-placement') || 'bottom').split('-')[0]
    const [x, y] = {
      top: [rect.left + rect.width / 2, rect.top - gap],
      left: [rect.left - gap, rect.top + rect.height / 2],
      right: [rect.right + gap, rect.top + rect.height / 2],
    }[side] || [rect.left + rect.width / 2, rect.bottom + gap]
    pointer.dataset.side = side
    pointer.style.left = x + 'px'
    pointer.style.top = y + 'px'
    frame = requestAnimationFrame(place)
  }
  place()
  return () => {
    cancelAnimationFrame(frame)
    pointer.remove()
  }
}

// What counts as a field to fill in
const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="hidden"]), textarea, [contenteditable=""], [contenteditable="true"]'

/**
 * Keep a step's forward button off until the field it points at has text,
 * for "Continue with: Filling in the field" (a conversation's name, say). A
 * step on a wrapper looks at the field inside it. One without a field, or
 * whose field went away (its dialog closed), lets the user on.
 *
 * @param {HTMLElement} target The step's element
 * @param {NodeList} buttons The step's forward button
 * @return {Function} Stops watching
 */
export function holdUntilFilled(target, buttons) {
  const field = target.matches(FIELD) ? target : target.querySelector(FIELD)
  const update = () => {
    const filled = !field || !field.isConnected || (field.value ?? field.textContent ?? '').trim() !== ''
    buttons.forEach(button => {
      button.disabled = !filled
    })
  }
  update()
  field?.addEventListener('input', update)
  // A field filled by the page itself, or taken away, sends no input event
  const timer = setInterval(update, 500)
  return () => {
    clearInterval(timer)
    field?.removeEventListener('input', update)
  }
}

// Nextcloud's dialogs sit in a .modal-mask (NcModal, NcDialog, the file
// picker); some apps use a native <dialog>
const DIALOG = '.modal-mask, dialog[open]'

/**
 * @return {boolean} Whether one of the page's dialogs is open. Their masks
 *   are position: fixed, so offsetParent is always null; a box says it shows.
 */
export function dialogOpen() {
  return safeQueryAll(DIALOG).some(dialog => dialog.getClientRects().length > 0)
}

/**
 * Keep a class on the body while a dialog is open, so a step waiting aside
 * moves out of the way of the dialog's buttons, which Nextcloud puts on the
 * right (css/wizard.css).
 *
 * @param {number} interval How often to look, in ms
 * @return {Function} Stops looking, and takes the class off
 */
export function followDialogs(interval = 300) {
  const update = () => document.body.classList.toggle('introvox-dialog-open', dialogOpen())
  update()
  const timer = setInterval(update, interval)
  return () => {
    clearInterval(timer)
    document.body.classList.remove('introvox-dialog-open')
  }
}

/**
 * Call back once a step's element is there. For an element that only appears
 * after the user does something the steps before asked for, such as a button
 * in the conversation they are creating or in a file's details they open:
 * that can take longer than any wait before the step shows.
 *
 * @param {Function} resolveTarget The step's attachTo.element
 * @param {Function} found Called once, when it resolves
 * @param {number} interval How often to look, in ms
 * @return {Function} Stops looking
 */
export function whenTargetAppears(resolveTarget, found, interval = 300) {
  const timer = setInterval(() => {
    if (resolveTarget()) {
      clearInterval(timer)
      found()
    }
  }, interval)
  return () => clearInterval(timer)
}

/**
 * Call back once a click step's element is gone without the click: the
 * dialog it was in closed some other way, with its ✕, Escape or a shortcut
 * that saves. Shown again, the step waits aside with Next, like one whose
 * element is not there yet, instead of leaving only Back or ending the tour.
 *
 * @param {HTMLElement} target The step's element
 * @param {Function} gone Called once, when it is no longer on the page
 * @param {number} interval How often to look, in ms
 * @return {Function} Stops looking
 */
export function whenTargetGone(target, gone, interval = 500) {
  const timer = setInterval(() => {
    if (!target.isConnected || !target.getClientRects().length) {
      clearInterval(timer)
      gone()
    }
  }, interval)
  return () => clearInterval(timer)
}

/**
 * Keep the menu a step points into open while the step shows. Nextcloud
 * 35's apps menu closes 180 ms after the pointer leaves it or its button
 * (AppMenu's scheduleClose), so moving the mouse to the tour's own tooltip
 * closed the very menu the step was about. The leave events are stopped on
 * their way to the menu (capture phase, which non-bubbling events have too).
 *
 * @param {Element} target The step's element
 * @param {string} triggerSelector The step's "open first" button, if any
 * @return {function(): void|null} Releases the menu again; null when the
 *   target is not in a menu
 */
export function holdMenuOpen(target, triggerSelector) {
  const popup = popupOf(target)
  if (!popup && !triggerSelector) {
    return null
  }
  const trigger = (triggerSelector && findMenuButton(triggerSelector)) || (popup && openTriggerFor(popup))
  const kept = [popup, trigger].filter(Boolean)
  const onLeave = (event) => {
    const el = event.target
    // el.contains(): the leave on a wrapper around the menu button counts too
    if (el?.nodeType === 1 && kept.some(k => k === el || k.contains(el) || el.contains(k))) {
      event.stopImmediatePropagation()
    }
  }
  const types = ['pointerleave', 'mouseleave']
  types.forEach(type => window.addEventListener(type, onLeave, true))
  return () => types.forEach(type => window.removeEventListener(type, onLeave, true))
}

/**
 * Close the menu we opened in openMenuAndWait, if it's still open. No-op when
 * the user opened the menu themselves (we never stored a trigger then).
 */
export function closeOpenedMenu() {
  if (_openedTrigger && safeQuery(_openedItemSel)) {
    _openedTrigger.click() // toggle closed
  }
  _openedTrigger = null
  _openedItemSel = null
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
      const el = findTarget(sel)
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
      // TRANSLATORS: Title of the first step of the welcome tour; keep the emoji
      title: t('introvox', '👋 Welcome to Nextcloud'),
      text: t('introvox', '<p>Nice to have you here! This short tour will help you get started quickly.</p><p>You can close this wizard at any time and open it again later.</p>'),
      buttons: [
        {
          // TRANSLATORS: Button (verb): ends the tour now
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
      // TRANSLATORS: Title of a step of the welcome tour; keep the emoji
      title: t('introvox', '📁 Files & apps'),
      text: t('introvox', '<p>Files is where you view and manage everything you store.</p><p>You will find it in the apps menu (top left) — together with Calendar, Mail, Contacts and more. Click the menu any time to switch apps.</p>'),
      // On NC 34 the apps live behind the waffle, so open it first and point at
      // the Files entry inside the menu. On NC <=33 there is no waffle at all
      // (the apps sit in an always-visible inline bar), so openMenuAndWait finds
      // no trigger, resolves immediately without clicking anything, and the step
      // highlights the inline Files entry instead.
      beforeShowPromise: () => openMenuAndWait(APPS_MENU_TRIGGER, APPS_MENU_ITEM),
      attachTo: {
        // NC 34: the open menu panel (tooltip sits to its right). NC <=33: the
        // inline Files entry in the always-visible app bar. Falls back to the
        // closed waffle button if the menu can't be opened.
        element: firstMatch(
          APPS_MENU_PANEL,
          '[role="menu"] a.app-item[href*="/apps/files/"]',
          NC33_FILES_ENTRY,
          APPS_MENU_TRIGGER,
        ),
        on: 'right-start'
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
      // TRANSLATORS: Noun: title of a step of the welcome tour about the search; keep the emoji
      title: t('introvox', '🔍 Search'),
      text: t('introvox', '<p>With the search bar you can quickly find files, contacts and more.</p><p>Just type what you\'re looking for and press Enter.</p>'),
      attachTo: {
        // NC 34 renders an inline searchbar (.unified-search-input). NC <=33 has
        // an icon button with id #unified-search. Try the NC 34 bar first, then
        // the NC <=33 button; .header-menu__trigger is a last resort (on NC 34
        // alone it would land on the notifications bell).
        element: firstMatch(
          '.unified-search-input',
          NC33_SEARCH_TRIGGER,
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
      // TRANSLATORS: Title of a step of the welcome tour; keep the emoji
      title: t('introvox', '🎯 Getting started'),
      // TRANSLATORS: Text of a step in the welcome tour. Words in bold are names in Nextcloud: use the words Nextcloud shows in your language
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
      // TRANSLATORS: Title of a step of the welcome tour; keep the emoji
      title: t('introvox', '✨ Important features'),
      // TRANSLATORS: Text of a step in the welcome tour. Words in bold are names in Nextcloud: use the words Nextcloud shows in your language
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
      // TRANSLATORS: Title of a step of the welcome tour; keep the emoji
      title: t('introvox', '💡 Useful tips'),
      // TRANSLATORS: Text of a step in the welcome tour. Words in bold are names in Nextcloud: use the words Nextcloud shows in your language
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
      // TRANSLATORS: Title of the last step of the welcome tour; keep the emoji
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
          // TRANSLATORS: Button: closes the step about installing Nextcloud as an app and goes on
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

// The subset that decides what a step points at. The admin UI sets
// customTarget on a step once its target is edited; from then on the admin's
// selector wins over the bundled one.
const TARGETING_FIELDS = ['attachTo', 'beforeShowPromise', 'when', 'canClickTarget']

/**
 * Give a step with a string selector and an openFirst selector the same
 * treatment the bundled Files step has: click openFirst (a menu button)
 * before showing, so a target inside that menu exists, and close it again
 * afterwards. The target itself is not clickable, so the menu stays put.
 *
 * @param {object} step A step with openFirst set
 * @return {object}
 */
function withOpenFirst(step) {
  if (step.beforeShowPromise || typeof step.attachTo !== 'string' || !step.attachTo) {
    return step
  }
  const trigger = step.openFirst
  const target = step.attachTo
  const userWhen = step.when || {}
  return {
    ...step,
    beforeShowPromise: () => openMenuAndWait(trigger, target),
    canClickTarget: false,
    when: {
      ...userWhen,
      hide() {
        closeOpenedMenu()
        userWhen.hide?.call(this)
      },
      cancel() {
        closeOpenedMenu()
        userWhen.cancel?.call(this)
      }
    }
  }
}

/**
 * Layer the client-side behavioral fields (function attachTo, beforeShowPromise,
 * when, showOn, …) of the bundled default steps onto server-provided steps,
 * keyed by id. The server stays authoritative for which steps exist, their
 * order and their copy; we only restore behaviors that JSON can't carry.
 *
 * A base step with no server twin is deliberately NOT added. The server owns
 * the step list: when an admin removes a default step from their tour, the API
 * stops returning it, and re-adding it here would resurrect a step they chose
 * to delete — in the bundled default wording, ignoring their customized copy.
 * The bundled set exists only as an offline fallback (see getWizardSteps) and
 * as the source of the behavioral fields below.
 *
 * Server steps carry attachTo as a plain string selector. When a matching base
 * step exists, its richer function attachTo wins, unless the admin changed the
 * target (customTarget); otherwise the string is kept (WizardManager wraps any
 * string selector in a lazy function). Steps with openFirst get a menu-opening
 * beforeShowPromise, see withOpenFirst().
 *
 * @param {Array<object>} serverSteps Steps returned by the API
 * @return {Array<object>} Enriched steps
 */
export function enrichSteps(serverSteps) {
  const baseById = new Map(getBaseWizardSteps().map((s) => [s.id, s]))

  return serverSteps.map((step) => {
    const baseStep = baseById.get(step.id)
    const merged = { ...step }
    if (baseStep) {
      for (const field of BEHAVIORAL_FIELDS) {
        if (step.customTarget && TARGETING_FIELDS.includes(field)) {
          continue
        }
        if (field in baseStep) {
          merged[field] = baseStep[field]
        }
      }
    }
    return step.openFirst ? withOpenFirst(merged) : merged
  })
}

export async function loadCustomSteps() {
  try {
    // @nextcloud/axios sends the CSRF request token the route requires, and
    // generateUrl() respects a webroot and instances without pretty URLs.
    const { data } = await axios.get(generateUrl('/apps/introvox/api/steps'))

    if (data.success) {
      // Trust whatever the server sends. Since 1.7.0 the API returns the full
      // Transifex-translated default set inline when no admin override exists,
      // so falling back to the client-side bundled defaults (which would re-
      // translate via the Vue translation bundle and pick e.g. NL for an IT
      // user without an IT bundle) is wrong. No steps (every step switched off,
      // or for other groups) means no tour, not the bundled one.
      return {
        steps: Array.isArray(data.steps) ? data.steps : null,
        enabled: data.enabled !== false,
        version: data.version || '1'
      }
    }
  } catch (error) {
    // Failed to load custom steps, will use defaults
  }

  return { steps: null, enabled: true }
}
