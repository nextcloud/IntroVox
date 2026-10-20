import DOMPurify from 'dompurify'

// Tour step texts are HTML, and Shepherd puts them into the page with
// innerHTML for every user. They come from admins, but also from imported
// tour files and from Transifex translations of the default steps, which
// nobody reviews for markup. Nextcloud's CSP stops scripts, not links, styles
// or fake forms, so only this formatting survives: what the docs promise and
// the default steps use.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'small', 'code', 'ul', 'ol', 'li', 'h3', 'h4', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel']

// A link that opens a new tab must not hand the tour page to the new one.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * @param {string} html A step text
 * @return {string} The text with only the allowed formatting left
 */
export function sanitizeStepHtml(html) {
  return DOMPurify.sanitize(String(html ?? ''), { ALLOWED_TAGS, ALLOWED_ATTR })
}

/**
 * For titles and button labels: plain text, which Shepherd would otherwise
 * parse as HTML.
 *
 * @param {string} text Text to show as is
 * @return {string}
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
