// HTML rules for the step text editor (StepTextEditor.vue). Plain string
// work, so tests-js can check it without a DOM.

// What the editor can show and write back with the same meaning: exactly the
// tour's allowlist (utils/stepHtml.js). <b> and <i> come back as <strong> and
// <em>.
export const EDITOR_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'small', 'code', 'ul', 'ol', 'li', 'h3', 'h4', 'a']

// Attributes the editor keeps. Links always get target="_blank", and the
// tour sets rel on every such link itself (stepHtml.js).
const KEPT_ATTRIBUTES = { a: ['href', 'target'] }
const DROPPED_ATTRIBUTES = { a: ['rel'] }

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g
const ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/g

/**
 * The HTML in a step text that users never see, such as "<style>" or
 * "<p class>": the tour removes it before showing the step, and the editor
 * leaves it out. It only goes from the stored text once the admin changes the
 * text in the editor, and the editor says so.
 *
 * @param {string} html A step text
 * @return {string[]} Those parts; empty when there are none
 */
export function hiddenHtml(html) {
  const found = new Set()
  const text = String(html ?? '')
  if (text.includes('<!--')) {
    found.add('<!-- -->')
  }
  for (const [, rawName, rawAttributes] of text.matchAll(TAG)) {
    const name = rawName.toLowerCase()
    if (!EDITOR_TAGS.includes(name)) {
      found.add(`<${name}>`)
      continue
    }
    for (const [, rawAttribute] of rawAttributes.matchAll(ATTRIBUTE)) {
      const attribute = rawAttribute.toLowerCase()
      const known = [...(KEPT_ATTRIBUTES[name] || []), ...(DROPPED_ATTRIBUTES[name] || [])]
      if (!known.includes(attribute)) {
        found.add(`<${name} ${attribute}>`)
      }
    }
  }
  return [...found]
}

/**
 * The editor's HTML as the tour wants it. The editor puts the text of every
 * list item in a <p>, which the tour gives a paragraph's margin, and an empty
 * editor still holds one empty paragraph.
 *
 * @param {string} html What the editor produced
 * @return {string} The step text to store
 */
export function cleanEditorHtml(html) {
  const cleaned = String(html ?? '').replace(/<li><p>((?:(?!<\/?p>)[\s\S])*?)<\/p>/g, '<li>$1')
  return /^(<p><\/p>)*$/.test(cleaned) ? '' : cleaned
}

/**
 * The address an admin typed for a link, as one the tour keeps:
 * "nextcloud.com" becomes https://nextcloud.com, and a path on this
 * Nextcloud stays a path.
 *
 * @param {string} input What was typed
 * @return {string} The href, or '' for anything but a web, mail or phone
 *   address or a path (javascript:, data: and the like)
 */
export function normalizeHref(input) {
  const href = String(input ?? '').trim()
  if (!href) {
    return ''
  }
  if (/^(https?:|mailto:|tel:)/i.test(href) || /^[/#?.]/.test(href)) {
    return href
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return ''
  }
  return 'https://' + href
}
