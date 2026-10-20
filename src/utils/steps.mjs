// Whether a step is switched on, as lib/Service/StepValidator::isEnabled()
// decides it: older exports wrote false as "false", 0 or "0".

/**
 * @param {object} step A step
 * @return {boolean}
 */
export function isStepEnabled(step) {
  return ![false, 'false', 0, '0'].includes(step?.enabled)
}
