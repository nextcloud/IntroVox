// Starting a tour by hand from the personal settings (TourList.vue)
import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { showError } from '@nextcloud/dialogs'
import '@nextcloud/dialogs/style.css'

import { COMPLETED_KEY, RESUME_KEY, START_KEY, VERSION_KEY } from '../runtime/chooseTour.mjs'
import { ANYWHERE_PAGE, normalizePage } from '../utils/pages.mjs'

/**
 * @return {{restarting: object, restartTour: Function, startAppTour: Function}}
 */
export function useStartTour() {
  const restarting = ref(false)

  // On its own page: the page reads the request and starts the tour there
  // (chooseTour). A tour that starts anywhere has no page of its own.
  const startAppTour = (tour) => {
    const page = normalizePage(tour.page || ANYWHERE_PAGE)
    if (!page) {
      return
    }
    try {
      sessionStorage.setItem(START_KEY, JSON.stringify({ tourId: tour.id, page, at: Date.now() }))
    } catch (error) {
      showError(t('introvox', 'The tour could not be started.'))
      return
    }
    window.location.href = generateUrl(page)
  }

  // The keys WizardManager uses: clearing them makes the tour start again,
  // from the first step rather than where an earlier run left off on
  // another page.
  const restartTour = async () => {
    restarting.value = true
    try {
      localStorage.removeItem(COMPLETED_KEY)
      localStorage.removeItem(VERSION_KEY)
      sessionStorage.removeItem(RESUME_KEY)
      // Asked for by hand, so it also runs with tours switched off
      sessionStorage.setItem(START_KEY, JSON.stringify({ tourId: 'welcome', at: Date.now() }))
      await axios.post(generateUrl('/apps/introvox/personal/settings'), {
        wizardDisabled: false
      })
      // Let the button show that something is happening before leaving
      setTimeout(() => {
        window.location.href = generateUrl('/')
      }, 1000)
    } catch (error) {
      restarting.value = false
      // TRANSLATORS: Error message
      showError(t('introvox', 'Error restarting tour'))
    }
  }

  return { restarting, restartTour, startAppTour }
}
