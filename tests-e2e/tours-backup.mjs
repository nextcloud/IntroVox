// Several suites start from a list without tours of an admin's own, and
// delete them. These keep them:
//   node tours-backup.mjs save      exports each to backup/<id>.zip
//   node tours-backup.mjs restore   imports them again, on or off as they were,
//                                   and empties backup/
// all.mjs does both. An imported tour is a new tour: who saw it and its
// statistics start over.
import fs from 'node:fs'
import path from 'node:path'
import { launch, login, api, DIR } from './lib.mjs'

const BACKUP = path.join(DIR, 'backup')
const action = process.argv[2]
if (!['save', 'restore'].includes(action)) {
  console.error('Usage: node tours-backup.mjs save|restore')
  process.exit(2)
}

const browser = await launch()
const { page } = await login(browser, 'introvox-e2e-admin')
const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours

if (action === 'save') {
  // A backup not restored yet holds tours that may be gone from the server
  if (fs.existsSync(BACKUP)) {
    console.error('backup/ is still there: run "node tours-backup.mjs restore" first')
    await browser.close()
    process.exit(1)
  }
  fs.mkdirSync(BACKUP, { recursive: true })
  const own = (await tours()).filter(t => !t.builtin)
  const index = []
  for (const tour of own) {
    const bytes = await page.evaluate(async (id) => {
      const response = await fetch(OC.generateUrl(`/apps/introvox/admin/tours/${id}/export`), { headers: { requesttoken: OC.requestToken } })
      if (!response.ok) throw new Error(`export ${id}: ${response.status}`)
      return [...new Uint8Array(await response.arrayBuffer())]
    }, tour.id)
    fs.writeFileSync(path.join(BACKUP, `${tour.id}.zip`), Buffer.from(bytes))
    index.push({ id: tour.id, name: tour.name, enabled: tour.enabled })
  }
  fs.writeFileSync(path.join(BACKUP, 'tours.json'), JSON.stringify(index, null, 2))
  console.log(`saved ${index.length} tours: ${index.map(t => t.id).join(' ') || 'none'}`)
} else {
  const indexFile = path.join(BACKUP, 'tours.json')
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : []
  const present = new Set((await tours()).map(t => t.name))
  const restored = []
  for (const saved of index) {
    // Still there (no suite deleted it): leave it as it is
    if (present.has(saved.name)) {
      fs.rmSync(path.join(BACKUP, `${saved.id}.zip`))
      continue
    }
    const bytes = [...fs.readFileSync(path.join(BACKUP, `${saved.id}.zip`))]
    const result = await page.evaluate(async ({ bytes, name }) => {
      const body = new FormData()
      body.append('file', new File([new Uint8Array(bytes)], name))
      const response = await fetch(OC.generateUrl('/apps/introvox/admin/tours/import'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body })
      return { status: response.status, data: await response.json().catch(() => null) }
    }, { bytes, name: `${saved.id}.zip` })
    const id = result.data?.tour?.id
    if (!id) {
      console.log(`could not import ${saved.id}: ${result.status} ${JSON.stringify(result.data)}; the file stays in backup/`)
      continue
    }
    if (saved.enabled) {
      await api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: true } })
    }
    fs.rmSync(path.join(BACKUP, `${saved.id}.zip`))
    restored.push(id === saved.id ? id : `${saved.id} (now ${id})`)
  }
  if (fs.readdirSync(BACKUP).every(file => file === 'tours.json')) {
    fs.rmSync(BACKUP, { recursive: true })
  }
  console.log(`restored ${restored.length} tours: ${restored.join(' ') || 'none'}`)
}
await browser.close()
