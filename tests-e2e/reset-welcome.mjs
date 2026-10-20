// Back to the welcome tour's own steps in English and Dutch: most suites
// put test steps in it
import { launch, login, api } from './lib.mjs'

const browser = await launch()
const { page } = await login(browser, 'introvox-e2e-admin')
for (const lang of ['en', 'nl']) {
  const r = await api(page, 'POST', '/apps/introvox/admin/reset', { lang })
  console.log(`welcome tour ${lang}: ${r.status === 200 ? 'reset' : 'reset failed, ' + r.status}`)
}
await browser.close()
