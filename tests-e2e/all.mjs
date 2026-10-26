// Every suite, each after clearing the rate limits. Most expect the built-in
// tours off, share-links needs them on; whatever the admin set is put back
// afterwards, the welcome tour gets its own steps back, and the admin's own
// tours, which several suites delete, are imported again.
// SUITES="runtime media" runs just those.
import { execFileSync, spawnSync } from 'node:child_process'
import { clearRateLimits, DIR } from './lib.mjs'

const BUILTIN_OFF = ['app-tours', 'editor', 'runtime', 'media', 'statistics-export', 'links-timing', 'builtin-tours', 'checklist', 'app-states', 'admin-intro']
const BUILTIN_ON = ['share-links', 'embed']
const chosen = process.env.SUITES ? process.env.SUITES.split(/\s+/).filter(Boolean) : [...BUILTIN_OFF, ...BUILTIN_ON]

const builtin = (ids) => execFileSync('node', ['builtin-switch.mjs', ...(ids === undefined ? [] : [ids])], { cwd: DIR, encoding: 'utf8' }).trim()
const run = (suite) => {
  clearRateLimits()
  console.log(`=== ${suite}`)
  const result = spawnSync('node', [`${suite}.mjs`], { cwd: DIR, encoding: 'utf8' })
  const lines = (result.stdout + result.stderr).split('\n').filter(line => /^(FAIL|RETRY)|passed$/.test(line))
  console.log(lines.join('\n') || `exit ${result.status}`)
  return result.status === 0
}

const before = builtin()
console.log(`built-in tours on before: ${before || 'none'}`)
// Several suites delete the admin's own tours: kept aside, put back after
console.log(execFileSync('node', ['tours-backup.mjs', 'save'], { cwd: DIR, encoding: 'utf8' }).trim())
let failed = 0
try {
  builtin('')
  for (const suite of chosen.filter(s => !BUILTIN_ON.includes(s))) failed += run(suite) ? 0 : 1
  if (chosen.some(s => BUILTIN_ON.includes(s))) {
    builtin('builtin-files builtin-talk builtin-deck builtin-calendar')
    for (const suite of chosen.filter(s => BUILTIN_ON.includes(s))) failed += run(suite) ? 0 : 1
  }
} finally {
  console.log(`built-in tours on after: ${builtin(before) || 'none'}`)
  console.log(execFileSync('node', ['reset-welcome.mjs'], { cwd: DIR, encoding: 'utf8' }).trim())
  console.log(execFileSync('node', ['tours-backup.mjs', 'restore'], { cwd: DIR, encoding: 'utf8' }).trim())
}
console.log(failed ? `\n${failed} suites failed` : '\nall suites passed')
process.exit(failed ? 1 : 0)
