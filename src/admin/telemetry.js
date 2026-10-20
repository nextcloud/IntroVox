import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { showError, showSuccess } from '@nextcloud/dialogs'

/**
 * What telemetry sends (lib/Service/TelemetryService.php), for the
 * Statistics pane and the question after the admin intro
 *
 * @return {string[]}
 */
export function telemetryCollected() {
  return [
    t('introvox', 'Step counts per language (e.g., EN: 8, NL: 5)'),
    t('introvox', 'Total user count and active users'),
    t('introvox', 'How often the tour was started, finished and skipped'),
    t('introvox', 'IntroVox, Nextcloud, and PHP version numbers'),
    t('introvox', 'A unique hash of your instance URL (privacy-friendly identifier)'),
    t('introvox', 'Basic server configuration (database, OS, web server, Docker, country, language, timezone)'),
    t('introvox', 'Whether this Nextcloud has an Enterprise subscription, and your IntroVox license key if you entered one')
  ]
}

/**
 * @return {string[]}
 */
export function telemetryNotCollected() {
  return [
    // TRANSLATORS: Item in a list of data the usage statistics never contain
    t('introvox', 'Step content or titles'),
    t('introvox', 'User names or email addresses'),
    // TRANSLATORS: Item in a list of data the usage statistics never contain
    t('introvox', 'Your actual server URL'),
    t('introvox', 'Personal data of the people who use your Nextcloud')
  ]
}

/**
 * Switch telemetry on or off, with a message either way
 *
 * @param {boolean} enabled Share or not
 * @return {Promise<boolean>} Whether it was saved
 */
export async function setTelemetry(enabled) {
  try {
    const response = await axios.post(generateUrl('/apps/introvox/admin/telemetry'), { enabled })
    if (response.data.success) {
      showSuccess(enabled
        // TRANSLATORS: Message after the anonymous usage statistics were switched on
        ? t('introvox', 'Telemetry enabled')
        // TRANSLATORS: Message after the anonymous usage statistics were switched off
        : t('introvox', 'Telemetry disabled'))
      return true
    }
  } catch (error) {
    // Below
  }
  // TRANSLATORS: Error message
  showError(t('introvox', 'Error saving telemetry setting'))
  return false
}
