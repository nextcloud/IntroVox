// introvox-e2e-admin2 in the container, an admin with the password in .pw
import { execFileSync } from 'node:child_process'
import { CONTAINER, PASSWORD, occ } from './nc32.mjs'

const UID = 'introvox-e2e-admin2'
try { occ('user:delete', UID) } catch (e) {}
execFileSync('docker', ['exec', '-i', '-u', 'www-data', '-e', 'OC_PASS', CONTAINER, 'php', 'occ', 'user:add', '--password-from-env', '--group', 'admin', UID], { env: { ...process.env, OC_PASS: PASSWORD } })
occ('user:setting', UID, 'core', 'lang', 'en')
occ('user:setting', UID, 'firstrunwizard', 'show', '99.0.0')
console.log('nc32 user ready')
