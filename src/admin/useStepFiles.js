import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { showConfirmation, showError, showSuccess, showWarning } from '@nextcloud/dialogs'

/**
 * The steps of one language of a tour in TourEditor: back to the translated
 * defaults, and out to and in from a JSON file (AdminController's reset,
 * export and import). A whole tour with its media moves with Export tour in
 * the Tours list instead (useTours.js).
 *
 * @param {object} editor TourEditor's selectedLanguage, tourId, loading and
 *   overrideLanguages (refs), and its loadSteps(), loadOverrides() and
 *   whenSaved()
 * @return {object} fileInputRef (the hidden file input), resetToDefault(),
 *   exportSteps(), triggerImport() and handleImportFile()
 */
export function useStepFiles({ selectedLanguage, tourId, loading, overrideLanguages, loadSteps, loadOverrides, whenSaved }) {
  const fileInputRef = ref(null)

  const resetToDefault = async () => {
    const confirmed = await showConfirmation({
      // TRANSLATORS: Title of the dialog that asks whether to delete the steps written for this language
      name: t('introvox', 'Discard override'),
      text: t('introvox', 'Discard the custom steps for this language and fall back to the auto-translated defaults?'),
    })
    if (confirmed) {
      // A save still in the queue would bring the override back afterwards
      await whenSaved()
      try {
        loading.value = true
        const langBeingReset = selectedLanguage.value
        await axios.post(generateUrl('/apps/introvox/admin/reset'), {
          lang: langBeingReset,
          tour: tourId.value
        })
        await loadOverrides()
        // If we just removed the currently selected non-English language, jump back to English
        if (langBeingReset !== 'en' && !overrideLanguages.value.find(l => l.code === langBeingReset)) {
          selectedLanguage.value = 'en'
        }
        await loadSteps()
        showSuccess(t('introvox', 'Override discarded — language now uses auto-translated defaults'))
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
        showError(t('introvox', 'Error resetting: {error}', { error: errorMsg }))
      } finally {
        loading.value = false
      }
    }
  }

  const exportSteps = async () => {
    try {
      loading.value = true
      const response = await axios.post(generateUrl('/apps/introvox/admin/export'), {
        lang: selectedLanguage.value,
        tour: tourId.value
      })

      if (response.data.success) {
        // Create a blob and download the file
        const blob = new Blob([response.data.data], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = response.data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        // TRANSLATORS: Message after the steps were downloaded as a file
        showSuccess(t('introvox', 'Steps exported'))
      } else {
        // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
        showError(t('introvox', 'Error exporting steps: {error}', { error: response.data.error }))
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
      showError(t('introvox', 'Error exporting steps: {error}', { error: errorMsg }))
    } finally {
      loading.value = false
    }
  }

  const triggerImport = () => {
    if (fileInputRef.value) {
      fileInputRef.value.click()
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files[0]
    if (!file) {
      return
    }
    // A save still in the queue would overwrite the import afterwards
    await whenSaved()

    try {
      loading.value = true
      const fileContent = await file.text()

      const response = await axios.post(generateUrl('/apps/introvox/admin/import'), {
        fileContent: fileContent,
        tour: tourId.value
      })

      if (response.data.success) {
        showSuccess(
          // TRANSLATORS: %n is the number of imported steps; {language} is a language code, such as "de" or "pt_BR"
          n('introvox', 'Imported %n step ({language})', 'Imported %n steps ({language})', response.data.stepsCount, {
            language: response.data.language
          })
        )
        const missingMedia = response.data.missingMedia || []
        if (missingMedia.length > 0) {
          showWarning(
            // TRANSLATORS: %n is the number of images and videos that were left out of the import
            n('introvox', 'An image or video in the file is not on this server and was left out.',
            '%n images or videos in the file are not on this server and were left out.',
            missingMedia.length))
        }

        // If imported language is different from current, switch to it
        if (response.data.language !== selectedLanguage.value) {
          selectedLanguage.value = response.data.language
        }

        // Reload steps to show imported data
        await loadSteps()
      } else {
        // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
        showError(t('introvox', 'Error importing steps: {error}', { error: response.data.error }))
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
      showError(t('introvox', 'Error importing steps: {error}', { error: errorMsg }))
    } finally {
      loading.value = false
      // Reset file input
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }
  }

  return { fileInputRef, resetToDefault, exportSteps, triggerImport, handleImportFile }
}
