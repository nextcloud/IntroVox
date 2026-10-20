// The welcome tour's own bookkeeping: a mark in this browser (localStorage),
// the person's switch on the server (wizard_disabled), and its counters in
// the statistics (/api/wizard/*). App tours keep theirs on the server only
// (WizardManager's tourEvent).
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { COMPLETED_KEY, VERSION_KEY } from '../runtime/chooseTour.mjs'

// Counting is best effort; the tour goes on
const count = (event) => axios.post(generateUrl('/apps/introvox/api/wizard/{event}', { event })).catch(() => {})

const switchOff = () => axios.post(generateUrl('/apps/introvox/personal/settings'), { wizardDisabled: true }).catch(() => {})

/**
 * Mark the welcome tour done in this browser, at this version
 *
 * @param {string} serverVersion The tour's version, if known
 */
export function markWelcomeSeen(serverVersion) {
  localStorage.setItem(COMPLETED_KEY, 'true')
  if (serverVersion) {
    localStorage.setItem(VERSION_KEY, serverVersion)
  }
}

/**
 * Whether the welcome tour is done for this person in this browser. Their
 * switch always wins; a newer version on the server opens it again for
 * everyone else ("Show again to everyone").
 *
 * @param {string} serverVersion The tour's version on the server
 * @param {boolean} userDisabledWizard Whether they switched it off
 * @return {boolean}
 */
export function isWelcomeDone(serverVersion, userDisabledWizard) {
  if (userDisabledWizard) {
    return true
  }
  const localVersion = localStorage.getItem(VERSION_KEY)
  if (serverVersion && localVersion && serverVersion !== localVersion) {
    return false
  }
  return localStorage.getItem(COMPLETED_KEY) === 'true'
}

export const trackWelcomeStart = () => count('start')

/**
 * Done: counted, marked here, and switched off on the server
 *
 * @param {string} serverVersion The tour's version
 */
export async function finishWelcome(serverVersion) {
  markWelcomeSeen(serverVersion)
  await count('complete')
  await switchOff()
}

/**
 * Skipped: counted as such, and otherwise as done
 *
 * @param {string} serverVersion The tour's version
 */
export async function skipWelcome(serverVersion) {
  await count('skip')
  markWelcomeSeen(serverVersion)
  await switchOff()
}

// Forget the mark in this browser (window.introVox.reset)
export function resetWelcome() {
  localStorage.removeItem(COMPLETED_KEY)
  localStorage.removeItem(VERSION_KEY)
}
