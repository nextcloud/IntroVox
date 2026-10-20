/**
 * The bundled default steps point at their element with smarter logic than a
 * selector (enrichSteps in components/wizardSteps.js), which replaces the
 * stored selector at runtime. Once the admin changes where a step points,
 * their choice must win, so such a step is flagged customTarget.
 *
 * @param {object} data The step as edited
 * @param {object} saved The step as it was before editing
 * @return {object} A copy, flagged when the element or menu changed
 */
export function withTargetFlag(data, saved = {}) {
  const changed = (data.attachTo || '') !== (saved.attachTo || '')
    || (data.openFirst || '') !== (saved.openFirst || '')
  return changed ? { ...data, customTarget: true } : { ...data }
}
