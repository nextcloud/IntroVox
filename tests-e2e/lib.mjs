import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const DIR = path.dirname(new URL(import.meta.url).pathname)
export const FIXTURES = path.join(DIR, '..', 'tests-php', 'fixtures')
export const SHOTS = path.join(DIR, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

// Where the suites run: config.local.json, see README.md
const configFile = path.join(DIR, 'config.local.json')
if (!fs.existsSync(configFile)) {
  console.error('No config.local.json: copy config.example.json and fill it in, see README.md')
  process.exit(2)
}
export const CONFIG = JSON.parse(fs.readFileSync(configFile, 'utf8'))
export const BASE = CONFIG.base
export const PASSWORD = fs.readFileSync(path.join(DIR, '.pw'), 'utf8').trim()
// The Nextcloud folder on the server
export const NC = CONFIG.nextcloud || '/var/www/nextcloud'

// A shell command on the Nextcloud server, as the ssh user (who can sudo)
export const ssh = (command, input) => execFileSync('ssh', ['-o', 'BatchMode=yes', CONFIG.ssh, command], { encoding: 'utf8', input })
export const occ = (args) => ssh(`cd ${NC} && sudo -u www-data php occ ${args}`)
// PHP with Nextcloud loaded; code goes in single quotes, so it uses double ones
export const php = (code) => ssh(`cd ${NC} && sudo -u www-data php -r 'require "lib/base.php"; ${code}'`)

// A fresh user with the test password, in English, past the first-run wizard
export const addUser = (uid, group = '') => ssh(
  `cd ${NC} && (sudo -u www-data php occ user:delete ${uid} >/dev/null 2>&1; true) && sudo -u www-data bash -c 'read -r OC_PASS; export OC_PASS; php occ user:add --password-from-env --display-name "${uid}" ${group ? '--group ' + group : ''} ${uid}' >/dev/null && sudo -u www-data php occ user:setting ${uid} core lang en && sudo -u www-data php occ user:setting ${uid} firstrunwizard show 99.0.0`,
  PASSWORD + '\n')

// Every rate-limit counter in Redis, under every cache prefix (the prefix
// changes when apps change), so suites can run one after another
export const clearRateLimits = () => ssh(`redis-cli --scan --pattern '*OC\\\\Security\\\\RateLimiting*' | while read -r key; do redis-cli unlink "$key" >/dev/null; done`)

export async function launch() {
  return chromium.launch({
    executablePath: CONFIG.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
}

// A logged-in context. skipTour: pretend the tour was seen, so it does not
// cover pages the test wants to use.
export async function login(browser, user, { skipTour = true } = {}) {
  // A regular Chrome user agent: Talk shows a "browser not supported" banner
  // over its buttons for HeadlessChrome.
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  })
  if (skipTour) {
    await context.addInitScript(() => {
      localStorage.setItem('introvox_completed', 'true')
    })
  }
  // Other apps' popups that cover the page, such as notices for new users:
  // config "dismiss", the selectors of their close buttons, clicked as soon
  // as they show. Waiting for them would let a tour start on the landing page.
  if (CONFIG.dismiss?.length) {
    await context.addInitScript((selectors) => {
      const close = () => selectors.forEach(selector => document.querySelectorAll(selector).forEach(button => button.click()))
      new MutationObserver(close).observe(document, { childList: true, subtree: true })
    }, CONFIG.dismiss)
  }
  const page = await context.newPage()
  await page.goto(BASE + '/index.php/login')
  await page.fill('input[name="user"]', user)
  await page.fill('input[name="password"]', PASSWORD)
  await Promise.all([
    // domcontentloaded: the landing page's load event can wait long on slow
    // previews, and nothing here needs it
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }),
    page.click('button[type="submit"]'),
  ])
  return { context, page }
}

// Axios-like call from inside the page, with or without the CSRF token.
export async function api(page, method, url, body, { token = true } = {}) {
  return page.evaluate(async ({ method, url, body, token }) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (token) headers.requesttoken = OC.requestToken
    const response = await fetch(OC.generateUrl(url), { method, headers, body: body ? JSON.stringify(body) : undefined })
    let data = null
    try { data = await response.json() } catch (e) {}
    return { status: response.status, data }
  }, { method, url, body, token })
}

// The connection drops now and then. Wait until the server answers again.
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(BASE + '/status.php')
      if (response.ok) return
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

const NETWORK = /net::ERR_|Timeout \d+ms exceeded|fetch failed/

const results = []
// ONLY=regex runs just the checks whose name matches (plus what they need).
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null

export async function check(name, fn, page) {
  if (ONLY && !ONLY.test(name)) return
  const started = Date.now()
  try {
    let note
    try {
      note = await fn()
    } catch (error) {
      if (!NETWORK.test(error.message)) throw error
      console.log(`RETRY ${name} — ${error.message.split('\n')[0]}`)
      await waitForServer()
      note = await fn()
    }
    results.push({ name, ok: true, note })
    console.log(`PASS  ${name}${note ? ' — ' + note : ''} (${Date.now() - started} ms)`)
  } catch (error) {
    results.push({ name, ok: false, note: error.message })
    console.log(`FAIL  ${name} — ${error.message.split('\n')[0]}`)
    if (page) {
      const file = path.join(SHOTS, name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png')
      await page.screenshot({ path: file, fullPage: false }).catch(() => {})
      console.log(`      screenshot: ${file}`)
    }
  }
}

export function summary() {
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  return failed.length
}

export function assert(condition, message) {
  if (!condition) throw new Error(message)
}
