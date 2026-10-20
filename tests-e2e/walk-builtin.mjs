// Plays each built-in tour as a user who does what the steps ask, in English
// and Dutch: per step, whether it reached its element and how fast.
// APPS=files,deck runs some of them. Needs the built-in tours on; leaves
// folders, conversations, cards and events behind, as a real user would.
import path from 'node:path'
import { launch, login, api, occ, BASE, SHOTS } from './lib.mjs'
import { playTour } from './builtin-walk.mjs'

const APPS = { files: ['builtin-files', 'files'], talk: ['builtin-talk', 'spreed'], deck: ['builtin-deck', 'deck'], calendar: ['builtin-calendar', 'calendar'] }
const ONLY = process.env.APPS ? process.env.APPS.split(',') : Object.keys(APPS)
const USERS = { 'introvox-e2e-user': 'en', 'introvox-e2e-other': 'nl' }

const browser = await launch()
const admin = await login(browser, 'introvox-e2e-admin')
let failed = 0
for (const app of ONLY) {
  const [tourId, appId] = APPS[app]
  for (const [uid, lang] of Object.entries(USERS)) {
    const steps = (await api(admin.page, 'GET', `/apps/introvox/admin/steps?tour=${tourId}&lang=${lang}`)).data.steps
    await api(admin.page, 'POST', `/apps/introvox/admin/tours/${tourId}/reshow`)
    occ(`user:setting ${uid} core lang ${lang}`)
    const { context, page: p } = await login(browser, uid)
    await api(p, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
    let result
    try {
      await p.goto(`${BASE}/index.php/apps/${appId}/`)
      result = await playTour(p, steps, {
        onStep: (i) => p.screenshot({ path: path.join(SHOTS, `walk-${app}-${lang}-${String(i).padStart(2, '0')}.png`) }),
      })
    } catch (error) {
      result = { ok: false, lines: ['ERROR ' + error.message.split('\n')[0]] }
    } finally {
      await context.close()
      occ(`user:setting ${uid} core lang en`)
    }
    if (!result.ok) failed++
    console.log(`== ${app} / ${uid} (${lang})\n  ` + result.lines.join('\n  '))
  }
}
await browser.close()
console.log(failed ? `\n${failed} walks failed` : '\nall steps ok')
process.exit(failed ? 1 : 0)
