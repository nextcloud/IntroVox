// Tours can span apps: a step with a page (/apps/spreed/) makes the tour go
// there and pick up again after the page load. The progress is kept per
// browser tab and expires (RESUME_TTL), so a stale entry never hijacks a
// later visit.
import { RESUME_TTL, TOUR_ENDED_KEY } from '../runtime/chooseTour.mjs'

/**
 * @param {string} key The sessionStorage key: the preview frame shares
 *   sessionStorage with the admin page, so it has a key of its own
 * @return {{read: Function, write: Function, clear: Function}}
 */
export function resumeStore(key) {
  return {
    read() {
      try {
        const resume = JSON.parse(sessionStorage.getItem(key))
        return resume && Date.now() - resume.at < RESUME_TTL ? resume : null
      } catch (e) {
        return null
      }
    },
    write(resume) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ ...resume, at: Date.now() }))
      } catch (e) {
        // Without sessionStorage the tour simply ends on the old page
      }
    },
    clear() {
      try {
        sessionStorage.removeItem(key)
      } catch (e) {
        // Nothing stored then either
      }
    },
  }
}

// The next page load in this tab starts no other tour (chooseTour)
export function markTourEnded() {
  try {
    sessionStorage.setItem(TOUR_ENDED_KEY, String(Date.now()))
  } catch (e) {
    // Then another tour may follow on the next page
  }
}
