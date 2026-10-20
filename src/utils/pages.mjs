// Pages a tour step belongs to. Nextcloud URLs differ per instance (a webroot
// such as /nextcloud, with or without /index.php), so steps store the part
// that is the same everywhere: /apps/spreed/, /apps/files/, /settings/user.
//
// .mjs so the Node 20 test runner can import it (tests-js/pages.test.js).

// Apps that also answer on a short route outside /apps/<id>/: an open Talk
// conversation lives at /call/<token>, a file link at /f/<id>. Without this
// a step picked inside a conversation would store that one conversation as
// its page, and landing on /call/… would count as not reaching Talk. The
// lazy prefix absorbs a webroot, which pretty URLs carry without /index.php.
const APP_ROUTES = [
  [/^.*?\/call\//, '/apps/spreed/call/'],
  [/^.*?\/f\//, '/apps/files/f/'],
]

/**
 * @param {string} pathname A URL path on this instance
 * @return {string} The path from /apps/ or /settings/ on, or else without
 *   webroot and /index.php. Still a substring of the real URL, so fit for
 *   matching links (a[href*=…]).
 */
export function stripWebroot(pathname) {
  const appStart = pathname.search(/\/(apps|settings)\//)
  return appStart !== -1 ? pathname.slice(appStart) : pathname.replace(/^.*\/index\.php(?=\/)/, '')
}

/**
 * @param {string} pathname A URL path on this instance
 * @return {string} stripWebroot(), with short app routes (/call/, /f/)
 *   mapped to the app they belong to
 */
export function instancePath(pathname) {
  const path = stripWebroot(pathname)
  for (const [route, appPath] of APP_ROUTES) {
    if (route.test(path)) {
      return path.replace(route, appPath)
    }
  }
  return path
}

/**
 * The page to store for a step picked on this path: the app (/apps/spreed/),
 * not the exact URL, which holds the id of one conversation, folder or file.
 *
 * @param {string} pathname The path the element was picked on
 * @return {string}
 */
export function stepPageFor(pathname) {
  const path = instancePath(pathname)
  const app = path.match(/^\/apps\/[^/]+\//)
  return app ? app[0] : path
}

/**
 * @param {string} page A step's page as the admin entered it
 * @return {string} With a leading slash; '' for no page, and for anything
 *   that is not a plain path on this instance
 */
export function normalizePage(page) {
  // Browsers drop tabs and newlines inside URLs and read \\ as /, so
  // "/\\evil.example" and "/\\t/evil.example" are other sites too.
  const trimmed = (typeof page === 'string' ? page : '').trim()
  if (!trimmed || /[\u0000-\u001f\u007f\\]/.test(trimmed)) {
    return ''
  }
  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  // A second leading slash makes a protocol-relative URL (//evil.example),
  // and generateUrl() only prefixes the webroot, which is often empty. A
  // scheme (https:, javascript:) never belongs in a page either.
  if (path.startsWith('//') || /^\/?[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return ''
  }
  return path
}

/**
 * @param {string} page A step's page ('' or unset means any page)
 * @param {string} pathname The current location.pathname
 * @return {boolean}
 */
export function isOnPage(page, pathname) {
  const wanted = normalizePage(page)
  if (!wanted) {
    return true
  }
  // Compare whole segments: /apps/files/ must not match /apps/files_sharing/
  const withSlash = (path) => (path.endsWith('/') ? path : path + '/')
  return withSlash(instancePath(pathname)).startsWith(withSlash(instancePath(wanted)))
}

/**
 * Where a tour starts, in the fixed form the server checks access on: an
 * app (/apps/<id>/…, and the short routes /call/ and /f/), or a plain page
 * of this Nextcloud. Mirrors TourValidator::pageTrigger() in PHP; both are
 * tested on tests-php/fixtures/page-triggers.json.
 *
 * @param {string} input A path an admin typed or picked
 * @return {object|null} { type: 'app', app } or { type: 'page', page }, or
 *   null for anything that is not a plain path here
 */
export function pageTrigger(input) {
  if (typeof input !== 'string') {
    return null
  }
  let path = input.trim()
  if (path === '' || path.length > 200) {
    return null
  }
  if (path[0] !== '/') {
    path = '/' + path
  }
  if (/^\/index\.php(\/|$)/.test(path)) {
    path = path.slice('/index.php'.length)
  }
  // Only letters, digits, - _ and slashes: no %, no dots, no \, no :, no //
  if (!/^(\/[A-Za-z0-9_-]+)+\/?$/.test(path)) {
    return null
  }
  if (/^\/call(\/|$)/.test(path)) {
    return { type: 'app', app: 'spreed' }
  }
  if (/^\/f(\/|$)/.test(path)) {
    return { type: 'app', app: 'files' }
  }
  const app = path.match(/^\/apps\/([^/]+)/)
  if (app) {
    return /^[a-z][a-z0-9_]{0,63}$/.test(app[1]) ? { type: 'app', app: app[1] } : null
  }
  return { type: 'page', page: path.replace(/\/$/, '') }
}

/**
 * Where a link or "Start" in the personal settings opens a tour that has no
 * page of its own (the welcome tour, a tour that starts anywhere): Files,
 * which every Nextcloud has
 */
export const ANYWHERE_PAGE = '/apps/files/'

/**
 * Mirrors TourValidator::triggerPage() in PHP
 *
 * @param {object} trigger A tour's trigger ({ type: 'app' | 'page' | 'any', … })
 * @return {string} The page it starts on, for isOnPage() and to open it; ''
 *   for a tour that starts anywhere
 */
export function triggerPage(trigger) {
  return trigger?.type === 'app' ? `/apps/${trigger.app}/` : (trigger?.page || '')
}
