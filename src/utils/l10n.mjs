/**
 * Options for a translation that Vue renders as TEXT: an interpolation
 * ({{ }}), or a bound prop that ends up as text or an attribute (:label,
 * :aria-label, :placeholder, :helper-text, NcNoteCard :text, the name and
 * text of showConfirmation).
 *
 *   t(appId, text, { tour: name }, undefined, TEXT)
 *   n(appId, singular, plural, count, { tour: name }, TEXT)
 *
 * (In code the app id and the text stay literals, so the Transifex bot sees
 * the string: tests-js/l10n-bot-visibility.test.js.)
 *
 * By default translate() HTML-escapes placeholder values and runs the result
 * through DOMPurify. Vue escapes text by itself, so at a text site that shows
 * "Tom &amp; Jerry" instead of "Tom & Jerry"; and DOMPurify, once a value
 * brings a "<", strips tags and re-serializes "&" as "&amp;". Hence both off.
 *
 * Everywhere else keep the library default, which is safe:
 * - HTML sites (a tour step's text or title, v-html, innerHTML)
 * - toasts (showError, showSuccess, showWarning, showInfo): @nextcloud/dialogs
 *   puts the message through innerHTML and shows its innerText. Escaped
 *   values then read correctly, while an unescaped "<img onerror=…>" from a
 *   group or tour name would run.
 *
 * Forgetting TEXT costs a visible "&amp;"; using it at an HTML site or in a
 * toast opens a hole. tests-js/l10n-escaping.test.js guards both.
 */
export const TEXT = Object.freeze({ escape: false, sanitize: false })
