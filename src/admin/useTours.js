import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { showConfirmation, showError, showInfo, showSuccess, showWarning } from '@nextcloud/dialogs'

// Why a tour package was refused (lib/Service/TourPackage.php, TourTransfer.php)
const packageError = (data) => {
  switch (data?.error) {
  case 'nothing_to_export':
    return t('introvox', 'The welcome tour has no steps of your own to export: it uses the translated default steps every Nextcloud has.')
  case 'too_large':
    return t('introvox', 'The file is too large to import.')
  case 'too_large_for_server':
    return t('introvox', 'The file is larger than this server accepts for uploads. Put it in your Files and choose it from there.')
  case 'newer_version':
    return t('introvox', 'This tour comes from a newer IntroVox. Update IntroVox here first.')
  case 'bad_tour':
    // TRANSLATORS: {detail} is a technical description of the problem, in English
    return t('introvox', 'The tour in the file is not valid: {detail}', { detail: data.detail || '' })
  case 'too_many_tours':
    // TRANSLATORS: %n is the maximum number of tours, currently 50
    return n('introvox', 'There is already %n tour, the most there can be.', 'There are already %n tours, the most there can be.', Number(data.detail) || 50)
  case 'view_only':
    return t('introvox', 'This file is shared with you for viewing only, so it cannot be imported.')
  case 'not_found':
  case 'no_file':
    return t('introvox', 'The file could not be found.')
  default:
    return t('introvox', 'This is not a tour exported from IntroVox.')
  }
}

const download = (blob, name) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * The list of tours and what an admin does with a tour as a whole: switch it
 * on or off, show it again, delete, copy a link to it, export and import it
 * (lib/Controller/ToursController.php). The step editor in AdminApp only
 * opens and closes a tour.
 *
 * @param {object} options Options
 * @param {Function} options.onChanged Gets a tour the server changed, so a
 *   copy elsewhere (the tour open in the editor) can follow
 * @return {object} The list and its actions
 */
export function useTours({ onChanged = () => {} } = {}) {
  const tours = ref([])
  // Tours for everyone, the main switch under Settings
  const toursEnabledAll = ref(true)

  const tourTitle = (tour) => (tour?.id === 'welcome' ? t('introvox', 'Welcome tour') : (tour?.name || ''))

  const loadTours = async () => {
    try {
      const { data } = await axios.get(generateUrl('/apps/introvox/admin/tours'))
      tours.value = data.tours || []
      toursEnabledAll.value = data.toursEnabled !== false
    } catch (error) {
      showError(t('introvox', 'The tours could not be loaded.'))
    }
  }

  const replaceTour = (tour) => {
    tours.value = tours.value.map(candidate => (candidate.id === tour.id ? { ...candidate, ...tour } : candidate))
    onChanged(tour)
  }

  const toggleTour = async (tour, enabled) => {
    try {
      const { data } = await axios.put(generateUrl('/apps/introvox/admin/tours/{id}', { id: tour.id }), { tour: { enabled } })
      replaceTour(data.tour)
    } catch (error) {
      showError(error.response?.data?.error === 'needs_steps'
        ? t('introvox', 'Add a step in the main language before you switch this tour on.')
        : t('introvox', 'The tour could not be switched on or off.'))
      await loadTours()
    }
  }

  const reshowTour = async (tour) => {
    const confirmed = await showConfirmation({
      name: t('introvox', 'Show again to everyone'),
      // TRANSLATORS: {tour} is the name of a tour, such as "Talk"
      text: t('introvox', 'Everyone who saw {tour} gets it again the next time, except people who switched tours off.', { tour: tourTitle(tour) }, undefined, TEXT),
    })
    if (!confirmed) {
      return
    }
    try {
      await axios.post(generateUrl('/apps/introvox/admin/tours/{id}/reshow', { id: tour.id }))
      // TRANSLATORS: {tour} is the name of a tour, such as "Talk"
      showSuccess(t('introvox', '{tour} will be shown again', { tour: tourTitle(tour) }))
    } catch (error) {
      showError(t('introvox', 'The tour could not be shown again.'))
    }
  }

  const removeTour = async (tour) => {
    const confirmed = await showConfirmation({
      // TRANSLATORS: Dialog title; {tour} is the name of a tour, such as "Talk"
      name: t('introvox', 'Delete {tour}', { tour: tourTitle(tour) }, undefined, TEXT),
      text: t('introvox', 'The tour and its steps in every language are deleted. Export it first if you may want it back.'),
    })
    if (!confirmed) {
      return
    }
    try {
      await axios.delete(generateUrl('/apps/introvox/admin/tours/{id}', { id: tour.id }))
      await loadTours()
    } catch (error) {
      showError(t('introvox', 'The tour could not be deleted.'))
    }
  }

  // A link that opens the tour's page and starts it there (chooseTour), for
  // a welcome mail, say: through the login first if need be
  // (LinkController). Like a start by hand: only for people who may get the
  // tour, and not counted in the statistics.
  const copyLink = async (tour) => {
    const link = window.location.origin + generateUrl('/apps/introvox/tour/{id}', { id: tour.id })
    try {
      await navigator.clipboard.writeText(link)
      if (tour.enabled) {
        // TRANSLATORS: {tour} is the name of a tour, such as "Talk"
        showSuccess(t('introvox', 'Link to {tour} copied', { tour: tourTitle(tour) }))
      } else {
        // The link starts nothing until then (LinkController opens Files)
        // TRANSLATORS: {tour} is the name of a tour, such as "Talk". "Switched off" is the tour's switch in the list of tours
        showWarning(t('introvox', 'Link to {tour} copied. The tour is switched off: the link starts it once you switch it on.', { tour: tourTitle(tour) }))
      }
    } catch (error) {
      // No clipboard here (refused, or not a secure page): copy it by hand
      showInfo(link, { timeout: -1 })
    }
  }

  // The whole tour as a .zip: settings, steps in every language, media
  const exportTour = async (tour) => {
    try {
      const response = await axios.get(generateUrl('/apps/introvox/admin/tours/{id}/export', { id: tour.id }), { responseType: 'blob' })
      download(response.data, 'introvox-tour-' + tour.id + '.zip')
    } catch (error) {
      // An error comes back as a blob too
      let data = null
      try {
        data = JSON.parse(await error.response?.data?.text())
      } catch (e) {
        // Not JSON: a network error
      }
      showError(data?.error === 'nothing_to_export' ? packageError(data) : t('introvox', 'The tour could not be exported.'))
    }
  }

  const reportImport = (result) => {
    showSuccess(result.kind === 'welcome'
      // TRANSLATORS: {languages} is a comma-separated list of language codes, such as "de, fr"
      ? t('introvox', 'The welcome tour\'s steps were imported for {languages}', { languages: result.languages.join(', ') })
      // TRANSLATORS: {tour} is the name of a tour, such as "Talk"
      : t('introvox', 'Imported {tour}. It stays switched off until you switch it on.', { tour: result.tour?.name || '' }))
    if (result.droppedGroups?.length) {
      // TRANSLATORS: {groups} is a comma-separated list of group names
      showWarning(t('introvox', 'These groups do not exist here and were left out: {groups}', { groups: result.droppedGroups.join(', ') }))
    }
    if (result.mediaLeftOut > 0) {
      // TRANSLATORS: %n is the number of images and videos that were left out of the import
      showWarning(n('introvox', '%n image or video was left out: missing from the file, or over this server\'s limits.', '%n images or videos were left out: missing from the file, or over this server\'s limits.', result.mediaLeftOut))
    }
    if (result.appMissing) {
      // TRANSLATORS: {app} is the technical ID of an app, such as "spreed"
      showWarning(t('introvox', 'The app {app} is not installed here. The tour can only start once it is.', { app: result.appMissing }))
    }
  }

  /**
   * A tour package, uploaded or from the admin's own Files. A package of
   * the welcome tour replaces its steps, so that is asked first.
   *
   * @param {object} source { file } or { path }
   * @param {boolean} replaceWelcome Confirmed already
   */
  const importTour = async (source, replaceWelcome = false) => {
    const confirmation = replaceWelcome ? '1' : ''
    let body = { path: source.path, replaceWelcome: confirmation }
    if (source.file) {
      body = new FormData()
      body.append('file', source.file)
      body.append('replaceWelcome', confirmation)
    }
    let result
    try {
      result = (await axios.post(generateUrl('/apps/introvox/admin/tours/import'), body)).data
    } catch (error) {
      const data = error.response?.data
      if (data?.error !== 'confirm_welcome') {
        showError(packageError(data))
        return
      }
      const confirmed = await showConfirmation({
        // TRANSLATORS: Dialog title
        name: t('introvox', 'Replace the welcome tour?'),
        // TRANSLATORS: {languages} is a comma-separated list of language codes, such as "de, fr"
        text: t('introvox', 'The welcome tour\'s own steps in {languages} are replaced by the ones in the file.', { languages: (data.languages || []).join(', ') }, undefined, TEXT),
        labelConfirm: t('introvox', 'Replace'),
      })
      if (confirmed) {
        await importTour(source, true)
      }
      return
    }
    await loadTours()
    reportImport(result)
  }

  return {
    tours,
    toursEnabledAll,
    tourTitle,
    loadTours,
    replaceTour,
    toggleTour,
    reshowTour,
    removeTour,
    copyLink,
    exportTour,
    importTour
  }
}
