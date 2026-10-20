import { loadState } from '@nextcloud/initial-state'
import { getRequestToken } from '@nextcloud/auth'
import { FRAME_READY_EVENT, PICKER_FRAME_NAME, PREVIEW_FRAME_NAME } from './frame/frameNames.js'
import {
  chooseTour,
  frameKind,
  COMPLETED_KEY,
  LINK_PARAM,
  PREVIEW_RESUME_KEY,
  RESUME_KEY,
  RESUME_TTL,
  START_KEY,
  TOUR_ENDED_KEY,
  TOUR_ID_PATTERN,
  VERSION_KEY
} from './runtime/chooseTour.mjs'

// Every logged-in page loads this file, so it stays small: it decides
// whether a tour runs (chooseTour), from what the page itself carries (the
// 'introvox/runtime' initial state, lib/Listener/LoadScripts.php), and only
// then loads the tour code, a chunk of its own (src/runtime/tour.js).

// Webpack adds that chunk with a script tag; Nextcloud's CSP admits it by
// the nonce, which is the request token in base64.
// eslint-disable-next-line no-undef, camelcase
__webpack_nonce__ = btoa(getRequestToken() || '')

const loadTour = () => import(/* webpackChunkName: "tour" */ './runtime/tour.js')

const read = (storage, key) => {
  try {
    return storage.getItem(key)
  } catch (e) {
    return null
  }
}

// An own task of the checklist on the Dashboard opened from there
// (lib/Service/Checklist.php, CHECK_PARAM and CUSTOM_ID)
const CHECK_PARAM = 'introvox-check'
const CHECK_ID_PATTERN = /^c-[a-z0-9]{8}$/

// A parameter taken out of the address, so a reload or a bookmark does not
// use it again
const takeParam = (name, pattern) => {
  const url = new URL(window.location.href)
  const value = url.searchParams.get(name)
  if (value === null) {
    return null
  }
  url.searchParams.delete(name)
  window.history.replaceState(window.history.state, '', url)
  return pattern.test(value) ? value : null
}

const reportCheck = (id) => import(/* webpackChunkName: "checklist" */ './runtime/checklist.js')
  .then(module => module.reportCheck(id))
  .catch(() => {
    // It stays open in the list, to open again
  })

const readJson = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key))
  } catch (e) {
    return null
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // The frame names only count inside the admin page's own iframe:
  // frameElement is null in a top-level tab, which another website could
  // have opened with one of these names to keep the tour from starting.
  let sameOriginParent = false
  try {
    sameOriginParent = !!window.frameElement
  } catch (e) {
    // A cross-origin parent: a page of its own
  }
  const frame = frameKind({
    sameOriginParent,
    name: window.name,
    pickerName: PICKER_FRAME_NAME,
    previewName: PREVIEW_FRAME_NAME
  })

  if (frame === 'picker' || frame === 'preview') {
    window.frameElement.dispatchEvent(new CustomEvent(FRAME_READY_EVENT))
  }

  // The admin's tour preview (src/preview/TourPreview.vue) calls this as
  // soon as the frame has loaded, possibly before the tour code has. The
  // tour code replaces it with WizardManager's own once it is in.
  if (frame === 'preview') {
    let preview = null
    window.introVoxPreview = {
      run: async (...args) => {
        // A failed load is not kept: the next run tries again
        preview = preview || loadTour().then(module => module.mountPreview()).catch((error) => {
          preview = null
          throw error
        })
        return (await preview).run(...args)
      },
      hasPendingResume: () => {
        const resume = readJson(sessionStorage, PREVIEW_RESUME_KEY)
        return !!resume && Date.now() - resume.at < RESUME_TTL
      }
    }
    return
  }

  const check = takeParam(CHECK_PARAM, CHECK_ID_PATTERN)
  if (check) {
    reportCheck(check)
  }

  // Starting the tour by hand, as docs/user/personal-settings.md describes;
  // WizardManager puts its own in place once it runs.
  window.introVox = {
    start: () => loadTour().then(module => module.startManually()),
    reset: () => {
      try {
        localStorage.removeItem(COMPLETED_KEY)
        localStorage.removeItem(VERSION_KEY)
      } catch (e) {
        // Nothing stored then either
      }
    },
    isCompleted: () => read(localStorage, COMPLETED_KEY) === 'true'
  }

  const runtime = loadState('introvox', 'runtime', null)
  // A share link's tour (TOUR_ID_PATTERN). The server read it with the page
  // as well: an app that sends its start page on at once (Deck goes to
  // Upcoming cards) has dropped it from the address before this runs.
  const fromAddress = takeParam(LINK_PARAM, TOUR_ID_PATTERN)
  const link = fromAddress || (TOUR_ID_PATTERN.test(runtime?.link || '') ? runtime.link : null)
  const choice = chooseTour({
    frame,
    resume: readJson(sessionStorage, RESUME_KEY),
    start: readJson(sessionStorage, START_KEY),
    link,
    onAdminPage: !!document.getElementById('introvox-admin-app'),
    runtime,
    local: {
      completed: read(localStorage, COMPLETED_KEY) === 'true',
      version: read(localStorage, VERSION_KEY)
    },
    tourEndedAt: Number(read(sessionStorage, TOUR_ENDED_KEY)) || null,
    pathname: window.location.pathname,
    now: Date.now()
  })

  // A start request is used once
  if (choice?.manual) {
    try {
      sessionStorage.removeItem(START_KEY)
      // The tour a link starts takes the place of one that was underway
      if (choice.tour === link) {
        sessionStorage.removeItem(RESUME_KEY)
      }
    } catch (e) {
      // They expire by themselves (START_TTL, RESUME_TTL)
    }
  }

  if (choice) {
    loadTour().then(module => module.startTour(choice))
  }
})
