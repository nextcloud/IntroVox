import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { showError, showSuccess } from '@nextcloud/dialogs'

/**
 * Saving the steps of a tour in TourEditor (AdminController::saveSteps).
 *
 * Saves run one after another, so quick successive changes can never land
 * out of order. Each takes its language and list when the change is made,
 * not when its turn comes: by then the admin may have picked another
 * language, and the list on screen would be that language's.
 *
 * @param {object} editor TourEditor's steps, stepsLoaded, unsavedNewStepId,
 *   selectedLanguage, tourId and hasChanges (refs), and its loadOverrides()
 * @return {object} saving (a ref), persistSteps(), saveTranslation() and
 *   whenSaved(), which resolves once every save asked for so far is done
 */
export function useStepSaving({ steps, stepsLoaded, unsavedNewStepId, selectedLanguage, tourId, hasChanges, loadOverrides }) {
  const saving = ref(false)
  let saveQueue = Promise.resolve()

  const writeSteps = async ({ lang, list, tour }, notify) => {
    saving.value = true
    try {
      await axios.post(generateUrl('/apps/introvox/admin/steps'), {
        steps: list,
        lang,
        tour
      })
      if (lang === selectedLanguage.value && tour === tourId.value) {
        hasChanges.value = false
      }
      if (notify) {
        // TRANSLATORS: Message after the steps were saved
        showSuccess(t('introvox', 'Steps saved'))
      }
      // The first save for a language creates its override; refresh the dropdown
      await loadOverrides()
      return true
    } catch (error) {
      if (lang === selectedLanguage.value) {
        hasChanges.value = true
      }
      // TRANSLATORS: Error message; {error} is the technical reason, in English
      showError(t('introvox', 'Error saving: {error}', {error: error.message}))
      return false
    } finally {
      saving.value = false
    }
  }

  const persistSteps = ({ notify = false } = {}) => {
    // Never write a list that did not come from the server (see stepsLoaded)
    if (!stepsLoaded.value) {
      return saveQueue
    }
    const job = {
      lang: selectedLanguage.value,
      tour: tourId.value,
      list: JSON.parse(JSON.stringify(steps.value.filter(s => s.id !== unsavedNewStepId.value)))
    }
    saveQueue = saveQueue.then(() => writeSteps(job, notify))
    return saveQueue
  }

  // A translation checked in AssistantDialog: another language, through
  // the same queue
  const saveTranslation = (lang, list) => {
    saveQueue = saveQueue.then(() => writeSteps({ lang, list, tour: tourId.value }, false))
    return saveQueue
  }


  const whenSaved = () => saveQueue

  return { saving, persistSteps, saveTranslation, whenSaved }
}
