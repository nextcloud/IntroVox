// When a tour may start: once the page is built, and nothing of the page's
// own is in the way.
import { dialogOpen, findTarget } from './wizardSteps'

/**
 * An app builds its own interface after the page has loaded, Talk and Deck
 * with their own scripts. Wait for it (the first step's element, else the
 * app's content), for no dialog of the app's own to be open, and for the tab
 * to be in view; at most 15 seconds.
 *
 * @param {object} firstStep The tour's first step options
 */
export async function waitForAppReady(firstStep) {
  const selector = typeof firstStep?.attachTo?.element === 'string' && !firstStep.openFirst ? firstStep.attachTo.element : ''
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const content = selector ? findTarget(selector) : document.querySelector('#app-content, #app-content-vue, #content-vue, .app-content')
    if (content && !dialogOpen() && document.visibilityState === 'visible') {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

// Nextcloud's own first-run wizard is not showing
const noFirstRunWizard = () => !document.querySelector('.firstrunwizard, #firstrunwizard, [class*="first-run"], [id*="first-run"]')

// The header is there and has a height
const headerShown = () => {
  const header = document.querySelector('#header') || document.querySelector('header') || document.querySelector('#navigation') || document.querySelector('[role="banner"]')
  return !!header && header.offsetHeight > 0
}

// The apps menu is rendered. NC <=33 renders the apps as an inline bar; NC
// 34+ only has the waffle button, its entries exist once the menu is opened.
// Without the waffle check this never matched on 34/35, so every tour waited
// out the full timeout before starting.
const appMenuShown = () => !!document.querySelector('.app-menu__waffle, .app-menu-list .app-menu-entry, nav.app-menu li, [aria-label="Applications menu"] li')

/**
 * Resolves once Nextcloud's own page is ready for a tour, or after 10 seconds
 *
 * @return {Promise<void>}
 */
export function waitForNextcloudReady() {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      attempts++
      if ((noFirstRunWizard() && headerShown() && appMenuShown()) || attempts >= 100) {
        resolve()
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Nextcloud adds this script only when its first-run wizard, or "What's new"
// after an upgrade, is about to open. The wizard itself mounts a little after
// the page is ready, too late for waitForNextcloudReady to see it.
const FIRST_RUN_SCRIPT = 'script[src*="/firstrunwizard/js/firstrunwizard-activate"]'
const FIRST_RUN_DIALOG = '.first-run-wizard'

/**
 * Resolves once a tour may start on this page: a moment after the page is
 * ready, for pop-ups that open right after it, and after Nextcloud's first-run
 * wizard, when one is coming, has opened and been closed again. A tour that
 * started under it would count as seen, unseen.
 *
 * @return {Promise<void>}
 */
export async function afterPopups() {
  await sleep(300)
  await waitForNextcloudReady()
  if (!document.querySelector(FIRST_RUN_SCRIPT)) {
    return
  }
  // It opens within a second or so; give it 5 s
  for (let waited = 0; waited < 5000 && !document.querySelector(FIRST_RUN_DIALOG); waited += 100) {
    await sleep(100)
  }
  // Then as long as the user takes: no tour on top of it
  while (document.querySelector(FIRST_RUN_DIALOG)?.getClientRects().length) {
    await sleep(250)
  }
}

/**
 * Resolves once no dialog is open and the tab is in view, right before a tour
 * starts; at most 15 seconds, then it starts anyway.
 *
 * @return {Promise<void>}
 */
export async function whenPageClear() {
  for (let waited = 0; waited < 15000 && (dialogOpen() || document.visibilityState !== 'visible'); waited += 200) {
    await sleep(200)
  }
}
