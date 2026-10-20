// Which tour, if any, a page load starts. The bootstrap (src/main.js) asks
// this before it loads anything else, so a page without a tour loads no tour
// code and makes no request. Plain data in, plain data out: tests-js checks
// the order of the rules without a browser.

import { isOnPage } from '../utils/pages.mjs'

// Where the bootstrap and WizardManager keep the tour's state
export const COMPLETED_KEY = 'introvox_completed'
export const VERSION_KEY = 'introvox_version'
export const RESUME_KEY = 'introvox_tour_resume'
export const PREVIEW_RESUME_KEY = 'introvox_preview_resume'
export const TOUR_ENDED_KEY = 'introvox_tour_ended'
// Start this app tour on its page: "Start" in the personal settings
export const START_KEY = 'introvox_start_tour'
export const START_TTL = 2 * 60 * 1000
// A share link (?introvox-tour=<id>, "Copy link" on the admin page) starts
// that tour on the page it opens
export const LINK_PARAM = 'introvox-tour'
export const TOUR_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/

// A tour that navigated to another page for its next step leaves a resume
// entry (WizardManager); a stale one must never hijack a later visit.
export const RESUME_TTL = 10 * 60 * 1000

// Right after a tour ends, the next page load starts no other tour: two
// tours in a row feel like one that does not stop.
export const TOUR_ENDED_TTL = 2 * 60 * 1000

/**
 * What kind of frame this page is in.
 *
 * @param {object} frame What the page knows about its frame
 * @param {boolean} frame.sameOriginParent Whether window.frameElement is
 *   readable, which it only is in a same-origin frame
 * @param {string} frame.name window.name
 * @param {string} frame.pickerName PICKER_FRAME_NAME
 * @param {string} frame.previewName PREVIEW_FRAME_NAME
 * @return {string|null} 'picker', 'preview', 'foreign' for a same-origin
 *   frame that is not ours, or null for a page of its own (a cross-origin
 *   embedding, such as a portal, counts as one)
 */
export function frameKind({ sameOriginParent, name, pickerName, previewName }) {
  if (!sameOriginParent) {
    return null
  }
  if (name === pickerName) {
    return 'picker'
  }
  if (name === previewName) {
    return 'preview'
  }
  return 'foreign'
}

/**
 * Whether the welcome tour is still open for this user on this device.
 * Done and Skip record wizard_disabled on the server; closing it, or Done
 * on an older version, only marks this browser. "Show again to everyone"
 * clears the server mark and raises the version.
 *
 * @param {object} welcome From the runtime state: { version, disabledByUser }
 * @param {object} local This browser: { completed, version }
 * @return {boolean}
 */
export function welcomeOpen(welcome, local) {
  if (welcome.enabled === false || welcome.disabledByUser) {
    return false
  }
  if (welcome.version && local.version && welcome.version !== local.version) {
    return true
  }
  return !local.completed
}

/**
 * The rules, in order. The first that applies decides.
 *
 * @param {object} context What the bootstrap read
 * @param {string|null} context.frame frameKind(); the preview frame is
 *   handled before this is asked
 * @param {object|null} context.resume The resume entry, if any
 * @param {boolean} context.onAdminPage IntroVox's own settings page, which
 *   has the admin intro (src/admin/adminIntro.js)
 * @param {object|null} context.start An explicit start request: { tourId,
 *   page, at }; the welcome tour's has no page
 * @param {string|null} context.link The tour a share link asks for (the
 *   bootstrap checked it is a tour id)
 * @param {object|null} context.runtime The 'introvox/runtime' initial state:
 *   { enabled, toursDisabled, welcome: { enabled, version, disabledByUser },
 *   tours: [{ id, page, version, anywhere }] }, or null when the page did not
 *   carry it
 * @param {object} context.local { completed, version } from localStorage
 * @param {number|null} context.tourEndedAt When a tour last ended in this tab
 * @param {string} context.pathname location.pathname
 * @param {number} context.now Date.now()
 * @return {object|null} { tour, resume } to carry a tour on; { tour,
 *   manual: true } for an explicit start; { tour: 'welcome', check: true } to
 *   let the tour code ask the server itself (the page had no runtime state);
 *   { tour } to start one; null for none
 */
export function chooseTour({ frame, resume, start, link = null, onAdminPage, runtime, local, tourEndedAt, pathname = '', now }) {
  // 1. The element picker, or someone else's same-origin frame
  if (frame === 'picker' || frame === 'foreign') {
    return null
  }
  // 2. A share link: like a start by hand, on the page the link opens.
  // Following one asks for that tour, so it goes before a tour that was
  // underway: leaving a page mid-tour, by typing the link, left an entry to
  // carry that one on (the bootstrap clears it). Whether this user may get
  // the tour is the server's to say.
  if (link && !onAdminPage) {
    return { tour: link, manual: true }
  }
  // 3. A tour that is underway carries on, whatever the rules below say.
  // Entries written before tours had ids have no tourId: those are the welcome tour's.
  if (resume && now - resume.at < RESUME_TTL) {
    return { tour: resume.tourId || 'welcome', resume }
  }
  // Started by hand from the personal settings: an app tour on its own
  // page, the welcome tour on whatever page comes next. It still has to be
  // one this user may get (the server checks)
  // (isOnPage counts no page as every page: an app tour always has one)
  const startsHere = start && start.tourId && (start.tourId === 'welcome' || (start.page && isOnPage(start.page, pathname)))
  if (startsHere && now - start.at < START_TTL) {
    return { tour: start.tourId, manual: true }
  }
  // 4. IntroVox's own settings page: the admin intro runs there
  if (onAdminPage) {
    return null
  }
  // 5. No runtime state on this page: the tour code asks the server, as
  // before this state existed
  if (!runtime) {
    return { tour: 'welcome', check: true }
  }
  // 6. Tours switched off for everyone, or by this user for themselves
  if (!runtime.enabled || runtime.toursDisabled) {
    return null
  }
  // 7. The welcome tour comes first
  if (welcomeOpen(runtime.welcome, local)) {
    return { tour: 'welcome', resume: null }
  }
  // 8. A tour just ended in this tab: the next one waits for a later visit
  if (tourEndedAt && now - tourEndedAt < TOUR_ENDED_TTL) {
    return null
  }
  // 9. The first app tour due here; one that starts anywhere is due on
  // every page
  const due = (runtime.tours || []).find(tour => tour && tour.id && (tour.anywhere === true || (tour.page && isOnPage(tour.page, pathname))))
  return due ? { tour: due.id } : null
}
