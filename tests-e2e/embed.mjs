// <introvox-tour-list> in another app: the Help page of helplinks loads it
// with TourListEmbed and styles its links itself. Each link is a tour's
// share link. Skipped on a server without helplinks.
import path from 'node:path'
import { launch, login, check, summary, assert, BASE } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const USER = 'introvox-e2e-user'
const browser = await launch()
const textsOf = async (p, selector) => (await p.locator(selector).allTextContents()).map(text => text.replace(/\s+/g, ' ').trim())

await check('embed: the Help page lists the same tours as the personal settings, and a link starts its tour', async () => {
  const { context, page: p } = await login(browser, USER, { landing: '/index.php/settings/user' })
  const help = await p.goto(BASE + '/index.php/apps/helplinks/')
  if (!help.ok()) {
    await context.close()
    return 'skipped: no helplinks on this server'
  }
  await p.locator('introvox-tour-list .introvox-tour-list__link').first().waitFor({ timeout: 20000 })
  // The welcome tour's link first, then one per tour
  const buttons = await textsOf(p, 'introvox-tour-list .introvox-tour-list__name')
  const links = await p.locator('introvox-tour-list .introvox-tour-list__link').evaluateAll(as => as.map(a => new URL(a.href).pathname))
  await p.screenshot({ path: path.join(DIR, 'shots', 'host-help.png'), fullPage: true })

  await p.goto(BASE + '/index.php/settings/user/introvox-help')
  await p.locator('.introvox-tour-list__tour').first().waitFor({ timeout: 20000 }).catch(() => {})
  const personal = await textsOf(p, '.introvox-tour-list__name')

  await p.goto(BASE + '/index.php/apps/helplinks/')
  const button = p.locator('introvox-tour-list .introvox-tour-list__link').nth(1)
  await button.waitFor({ timeout: 20000 })
  const name = (await button.textContent()).trim()
  await button.click()
  await p.waitForURL(url => !url.pathname.includes('/apps/helplinks/') && !url.pathname.includes('/apps/introvox/tour/'), { timeout: 20000 })
  const started = await p.locator('.shepherd-element:visible').first().waitFor({ timeout: 30000 }).then(() => true, () => false)
  const landed = new URL(p.url()).pathname
  await context.close()

  assert(buttons.length > 1 && JSON.stringify(buttons.slice(1)) === JSON.stringify(personal), JSON.stringify({ buttons, personal }))
  assert(links.every(link => /\/apps\/introvox\/tour\/[a-z0-9-]+$/.test(link)) && links[0].endsWith('/tour/welcome'), JSON.stringify(links))
  assert(started, `${name}: no step on ${landed}`)
  return `${buttons.length - 1} tours; ${name} started on ${landed}`
})

await browser.close()
process.exit(summary() ? 1 : 0)
