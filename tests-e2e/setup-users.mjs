// The users the suites share, made afresh: admin (not in the test group),
// admin2, user (in introvox-e2e) and other, all in English, with the password
// in .pw. The admin tour counts as seen, or it would cover the admin page
// (admin-intro.mjs unmarks it for admin2).
import { occ, addUser } from './lib.mjs'

try { occ('group:add introvox-e2e') } catch (e) {}
for (const [uid, group] of [['introvox-e2e-admin', 'admin'], ['introvox-e2e-admin2', 'admin'], ['introvox-e2e-user', 'introvox-e2e'], ['introvox-e2e-other', '']]) {
  addUser(uid, group)
  occ(`user:setting ${uid} introvox admin_intro_done 1`)
}
console.log('users ready')
