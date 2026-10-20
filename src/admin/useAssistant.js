import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'

const POLL_MS = 2000
// The task may still finish after this, but nobody waits that long for it
const GIVE_UP_MS = 5 * 60 * 1000

// Whether Nextcloud has a provider for free prompts (Artificial intelligence
// in the admin settings); null until asked. Asked once per page load.
const available = ref(null)

const loadAvailable = async () => {
  if (available.value !== null) {
    return
  }
  try {
    const { data } = await axios.get(generateUrl('/apps/introvox/admin/assistant'))
    available.value = data.available === true
  } catch (error) {
    available.value = false
  }
}

/**
 * Schedules a task (lib/Controller/AssistantController.php) and waits for it
 *
 * @param {string} kind translate or draft
 * @param {object} body What the route takes
 * @param {Function} stopped True once nobody waits any more (dialog closed)
 * @return {Promise<object|null>} { status: done, steps, language } or
 *   { status: failed, error }; null when stopped
 */
const runTask = async (kind, body, stopped) => {
  let task
  try {
    task = (await axios.post(generateUrl('/apps/introvox/admin/assistant/' + kind), body)).data.task
  } catch (error) {
    return { status: 'failed', error: error.response?.status === 429 ? 'too_often' : (error.response?.data?.error || 'failed') }
  }
  const deadline = Date.now() + GIVE_UP_MS
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
    if (stopped()) {
      return null
    }
    try {
      const { data } = await axios.get(generateUrl('/apps/introvox/admin/assistant/tasks/{id}', { id: task }))
      if (data.status !== 'running') {
        return data
      }
    } catch (error) {
      // A connection that drops for a moment is no reason to give up
    }
  }
  return { status: 'failed', error: 'timeout' }
}

// Why a task gave no steps (lib/Service/TourAssistant.php)
const assistantError = (error) => {
  switch (error) {
  case 'unavailable':
    return t('introvox', 'The Assistant is not set up on this Nextcloud.')
  case 'no_steps':
    return t('introvox', 'There are no steps to translate in this language.')
  case 'cut_off':
    return t('introvox', 'The answer was cut off: the AI provider allows shorter answers than a tour needs. Raise that limit in its settings, for the OpenAI integration "Max output tokens per request", and try again.')
  case 'unreadable':
    return t('introvox', 'The answer could not be used. Try again.')
  case 'changed':
    return t('introvox', 'The steps were changed meanwhile. Try again.')
  case 'too_often':
    return t('introvox', 'The Assistant was asked too often. Try again in an hour.')
  case 'timeout':
    return t('introvox', 'The Assistant did not answer in time. Try again later.')
  default:
    return t('introvox', 'The Assistant could not do this. Try again later.')
  }
}

export function useAssistant() {
  return { available, loadAvailable, runTask, assistantError }
}
