import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * An own task of the checklist on the Dashboard, opened from there: done
 * (ApiController::checklistOpened). A chunk of its own, so the bootstrap
 * every page loads stays small; only such a page loads it.
 *
 * @param {string} id The task's id
 * @return {Promise}
 */
export const reportCheck = (id) => axios.post(generateUrl('/apps/introvox/api/checklist/{id}', { id }))
