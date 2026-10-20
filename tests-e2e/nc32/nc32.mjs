// The Nextcloud 32 container from config.local.json ("nc32"), see README.md
import { execFileSync } from 'node:child_process'
import { CONFIG } from '../lib.mjs'

export { launch, PASSWORD, FIXTURES, SHOTS, DIR } from '../lib.mjs'
export const BASE = CONFIG.nc32?.base || 'http://localhost:8032'
export const CONTAINER = CONFIG.nc32?.container || 'introvox-nc32'
export const ADMIN_PASSWORD = CONFIG.nc32?.adminPassword
export const occ = (...args) => execFileSync('docker', ['exec', '-u', 'www-data', CONTAINER, 'php', 'occ', ...args], { encoding: 'utf8' })
