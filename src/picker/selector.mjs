// Selector generation for the element picker (ElementPicker.vue).
//
// A step stores its target as a selector string that the tour resolves
// (findTarget in wizardSteps.js) on whatever page the user is on, in whatever
// language they use, possibly several Nextcloud updates later. So a good
// selector is not just unique right now: it avoids anything that changes
// between page loads (generated ids, state classes), between languages
// (aria-label, title, placeholder) or with layout (nth-of-type), and only
// falls back to position when nothing else identifies the element.
//
// .mjs rather than .js so the Node 20 test runner can import it (the package
// has no "type": "module"). Keep translatable strings out of this file: the
// l10n extractors only scan .vue and .js.

import { stripWebroot } from '../utils/pages.mjs'

// Attributes whose values are neither translated nor generated per page load.
// data-cy-* are Nextcloud's own end-to-end test hooks.
const STABLE_ATTRIBUTE = /^(data-cy(-[\w-]+)?|data-testid|data-test|data-id|data-app-id|name)$/

// Attributes that carry what users create or who they are, such as
// data-cy-files-list-row-name="Salaries 2026.xlsx". A selector goes to every
// user and into exports, so their values are never used.
const PERSONAL_ATTRIBUTE = /(name|fileid|file-id|user|owner|path|token|uid)$/

// What a click on an inner icon or label most likely meant to point at.
const INTERACTIVE = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]'

// Classes describing a momentary state rather than what the element is,
// including Vue's transition classes (fade-enter-active, …).
const STATE_CLASS = /(^|[-_])(active|hover|hovered|focus|focused|focus-visible|open|opened|selected|checked|disabled|expanded|collapsed|visible|hidden|current|loading|dragging|dragover|highlighted|pressed|enter-from|enter-to|leave-from|leave-to)$/
const TOOLING_CLASS = /^(introvox|shepherd|v-popper|router-link|sortable)/

const MAX_ANCESTOR_DEPTH = 4
const MAX_PROMOTE_DEPTH = 4

/**
 * @param {string} id An element id
 * @return {boolean} Whether it looks hand-written rather than generated
 */
export function isStableId(id) {
  if (!id || id.length > 64 || !/^[A-Za-z][\w-]*$/.test(id)) {
    return false
  }
  // Counters and uuids: vs1__combobox, uid-42, …
  if (/\d/.test(id)) {
    return false
  }
  // @nextcloud/vue builds ids from a prefix plus five random letters
  // (trigger-xkqfj, menu-abcde). A real five-letter word gets caught too
  // (header-start); that only costs a candidate, never a broken step.
  return !/(^|[-_])[a-z]{5}$/.test(id)
}

/**
 * @param {string} name A class name
 * @return {boolean} Whether it identifies what the element is, stably
 */
export function isStableClass(name) {
  if (!name || name.length > 64 || !/^-?[A-Za-z_][\w-]*$/.test(name)) {
    return false
  }
  if (/^(is|has)-/.test(name) || STATE_CLASS.test(name) || TOOLING_CLASS.test(name)) {
    return false
  }
  // Hashes from CSS modules and the like: _root_1x2y3, css-4kq8z2.
  if (/\d{3,}/.test(name)) {
    return false
  }
  return !name.split(/[-_]+/).some((part) => part.length >= 5 && /\d/.test(part) && /[a-z]/i.test(part))
}

// BEM element classes (app-menu__waffle) name one specific part of a
// component; modifiers (button-vue--vue-tertiary) describe a variant many
// elements share, so they are tried last.
function classRank(name) {
  if (name.includes('__')) {
    return 0
  }
  return name.includes('--') ? 2 : 1
}

/**
 * The part of a link that says where it goes, independent of the webroot and
 * of pretty URLs: /index.php/apps/files/ and /nextcloud/apps/files/ both
 * become /apps/files/.
 *
 * @param {string} href The raw href attribute
 * @param {string} baseUrl The document URL, to resolve relative links
 * @return {string|null} null for external, empty and in-page links
 */
export function hrefMatchValue(href, baseUrl) {
  if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) {
    return null
  }
  let url
  try {
    url = new URL(href, baseUrl)
    if (url.origin !== new URL(baseUrl).origin) {
      return null
    }
  } catch (e) {
    return null
  }
  const value = withoutPrivateParts(stripWebroot(url.pathname))
  return value && value !== '/' ? value : null
}

/**
 * A link path cut off before its first private part: a conversation or share
 * token (/call/<token>, /s/<token>), a file id (/f/42), a numeric id further
 * down, or anything that looks like a token. The picker would otherwise put
 * such ids, picked in the admin's own conversations and files, into a
 * selector every user receives.
 *
 * @param {string} path A path without webroot
 * @return {string}
 */
export function withoutPrivateParts(path) {
  const parts = path.split('/')
  const kept = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const afterIdRoute = ['call', 's', 'f'].includes(parts[i - 1]) && part !== ''
    const looksLikeId = /^\d+$/.test(part) || (part.length >= 8 && /\d/.test(part) && /[a-z]/i.test(part))
    if (afterIdRoute || looksLikeId) {
      return kept.join('/') + '/'
    }
    kept.push(part)
  }
  return path
}

/**
 * @param {string} name Attribute name
 * @param {string} value Attribute value
 * @return {boolean} Whether the value can go into a selector: a fixed,
 *   code-like name such as "files" or "upload-picker", never user data
 */
export function isStableAttributeValue(name, value) {
  if (name !== 'name' && PERSONAL_ATTRIBUTE.test(name)) {
    return false
  }
  return /^[a-z][a-z0-9_-]{0,40}$/.test(value)
}

/**
 * Which side of the target the tooltip should go, following the position
 * guide in docs/admin/managing-steps.md: below the header, right of the left
 * sidebar, left of anything on the right, above anything at the bottom.
 *
 * @param {{top: number, bottom: number, left: number, right: number}} rect Target rectangle
 * @param {number} width Viewport width
 * @param {number} height Viewport height
 * @return {string} right, left, top or bottom
 */
export function suggestPosition(rect, width, height) {
  const centerX = (rect.left + rect.right) / 2
  if (rect.top < height * 0.15) {
    return 'bottom'
  }
  if (rect.bottom > height * 0.85) {
    return 'top'
  }
  if (centerX < width / 3) {
    return 'right'
  }
  if (centerX > (width * 2) / 3) {
    return 'left'
  }
  return 'bottom'
}

/**
 * The element a click most likely meant. Clicks land on the innermost node —
 * a <path> inside an icon, a <span> inside a button — while a step should
 * point at the button itself.
 *
 * @param {Element} node The event target
 * @return {Element}
 */
export function promoteTarget(node) {
  const svg = node.closest('svg')
  const el = svg && svg.parentElement ? svg.parentElement : node
  let current = el
  for (let depth = 0; current && depth < MAX_PROMOTE_DEPTH; depth++) {
    if (current.matches(INTERACTIVE)) {
      return current
    }
    current = current.parentElement
  }
  return el
}

/**
 * A short human label for the hover highlight, e.g. button.app-menu__waffle.
 * Not a verified selector; buildSelectors() is for that.
 *
 * @param {Element} el The element
 * @return {string}
 */
export function describeElement(el) {
  let label = el.localName
  if (el.id && isStableId(el.id)) {
    label += '#' + el.id
  }
  return label + stableClasses(el).slice(0, 2).map((name) => '.' + name).join('')
}

function stableClasses(el) {
  return [...el.classList].filter(isStableClass).sort((a, b) => classRank(a) - classRank(b))
}

function quote(value) {
  return '"' + value.replace(/["\\]/g, '\\$&') + '"'
}

// Candidate selectors for one element on its own, most robust first.
function simpleSelectors(el) {
  const { CSS } = el.ownerDocument.defaultView
  const out = []
  if (el.id && isStableId(el.id)) {
    out.push('#' + CSS.escape(el.id))
  }
  for (const { name, value } of el.attributes) {
    if (STABLE_ATTRIBUTE.test(name)) {
      out.push(value && isStableAttributeValue(name, value) ? `[${name}=${quote(value)}]` : `[${name}]`)
    }
  }
  if (el.localName === 'a') {
    const path = hrefMatchValue(el.getAttribute('href'), el.ownerDocument.URL)
    if (path) {
      out.push(`a[href*=${quote(path)}]`)
    }
  }
  out.push(...stableClasses(el).map((name) => '.' + CSS.escape(name)))
  return out
}

// Two classes together, for when no single class is unique.
function classPairs(el) {
  const { CSS } = el.ownerDocument.defaultView
  const classes = stableClasses(el).slice(0, 5).map((name) => '.' + CSS.escape(name))
  const out = []
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      out.push(classes[i] + classes[j])
    }
  }
  return out
}

function matchesOnly(doc, selector, el) {
  try {
    const found = doc.querySelectorAll(selector)
    return found.length === 1 && found[0] === el
  } catch (e) {
    return false
  }
}

function nthOfType(el) {
  const tag = el.localName
  const siblings = el.parentElement ? [...el.parentElement.children].filter((child) => child.localName === tag) : [el]
  return siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(el) + 1})` : tag
}

// Last resort: the element's place in the tree, anchored at the nearest
// ancestor that does have a stable unique selector of its own.
function positionalPath(el) {
  const doc = el.ownerDocument
  const parts = [nthOfType(el)]
  let current = el.parentElement
  while (current && current !== doc.body && current !== doc.documentElement) {
    const anchor = simpleSelectors(current).find((selector) => matchesOnly(doc, selector, current))
    if (anchor) {
      parts.unshift(anchor)
      return parts.join(' > ')
    }
    parts.unshift(nthOfType(current))
    current = current.parentElement
  }
  parts.unshift('body')
  return parts.join(' > ')
}

/**
 * Selectors that match exactly this element in its document, best first.
 * Each step down in robustness is only tried when the one before found
 * nothing: the element alone, then two of its classes together, then
 * narrowed down by an ancestor.
 *
 * @param {Element} el The target
 * @param {number} max How many alternatives to return
 * @return {Array<{selector: string, fragile: boolean}>} Never empty: when
 *   nothing stable identifies the element, a positional path is returned and
 *   marked fragile
 */
export function buildSelectors(el, max = 4) {
  const doc = el.ownerDocument
  const own = simpleSelectors(el)

  let found = own.filter((selector) => matchesOnly(doc, selector, el))

  if (found.length === 0) {
    found = classPairs(el).filter((selector) => matchesOnly(doc, selector, el))
  }

  if (found.length === 0) {
    const inner = [...own, el.localName]
    let ancestor = el.parentElement
    for (let depth = 0; ancestor && ancestor !== doc.body && depth < MAX_ANCESTOR_DEPTH && found.length < max; depth++) {
      for (const outer of simpleSelectors(ancestor)) {
        for (const selector of inner) {
          const combined = `${outer} ${selector}`
          if (found.length < max && !found.includes(combined) && matchesOnly(doc, combined, el)) {
            found.push(combined)
          }
        }
      }
      ancestor = ancestor.parentElement
    }
  }

  if (found.length === 0) {
    return [{ selector: positionalPath(el), fragile: true }]
  }
  return found.slice(0, max).map((selector) => ({ selector, fragile: false }))
}
