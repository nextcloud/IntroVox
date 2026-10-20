// node builtin.mjs            prints the built-in tours that are on
// node builtin.mjs "<ids>"    switches exactly those on, the others off
import { launch, login, api } from './lib.mjs'
const browser = await launch()
const { page } = await login(browser, 'introvox-e2e-admin')
const tours = (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours.filter(t => t.id.startsWith('builtin-'))
if (process.argv.length > 2) {
  const on = new Set(process.argv[2].split(' ').filter(Boolean))
  for (const tour of tours) {
    await api(page, 'PUT', `/apps/introvox/admin/tours/${tour.id}`, { tour: { enabled: on.has(tour.id) } })
  }
}
const now = (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours.filter(t => t.id.startsWith('builtin-') && t.enabled)
console.log(now.map(t => t.id).join(' '))
await browser.close()
