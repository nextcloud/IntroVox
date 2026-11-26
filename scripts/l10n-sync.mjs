#!/usr/bin/env node
// Copied from voxcloud-apps/design@850d21108, l10n/tools/l10n-sync.mjs. Do not edit here: change it in design and run sync-to-apps.sh.
/**
 * l10n-sync: translations while VoxCloud runs its own Weblate (design l10n/RULES.md, L23 and L25).
 *
 * translationfiles/<lang>/<appid>.po is the source of the translations, and Weblate is its only
 * writer. translationfiles/templates/<appid>.pot and l10n/<lang>.js|json are derived, with
 * Nextcloud's own translationtool (pinned in l10n-audit.mjs), the way Nextcloud's bot does it.
 *
 *   node scripts/l10n-sync.mjs pot     [--app DIR] [--force]  POT from the source; rewritten only when its content changed
 *   node scripts/l10n-sync.mjs import  [--app DIR] [--force]  one-off: l10n/<lang>.json → translationfiles/<lang>/<appid>.po
 *   node scripts/l10n-sync.mjs build   [--app DIR]            .po → l10n/<lang>.js|json, fuzzy entries left out
 *   node scripts/l10n-sync.mjs check   [--app DIR]            exit 1 when the POT or l10n/ is out of date
 *
 * --app defaults to the repository this script sits in (scripts/ → ..).
 * Requires: node >= 20, php, xgettext, msgattrib (gettext).
 *
 * Why the details matter:
 * - convert-po-files ships fuzzy entries as translations; build removes them first (msgattrib).
 * - The POT is compared without its creation date and #: references, so a line shift elsewhere
 *   in the code does not make it "out of date".
 * - The #: references are relative to the app. translationtool works on a temp copy and hands
 *   xgettext absolute paths; pot strips that prefix, and check fails on an absolute reference.
 * - import keeps a translation that equals its msgid: for an app the bot synced, that is a real
 *   translation ("Dashboard"), and leaving it out would show it to translators as missing.
 *   Keys that are not in the POT any more are reported and left out.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { appIdOf, copyDir, ensureDockerCi, parsePot } from './l10n-audit.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

function usage(code) {
	console.error('Usage: node l10n-sync.mjs pot|import|build|check [--app DIR] [--force]')
	process.exit(code)
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 27, ...opts })
	if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`)
	return r
}

/** A copy of the app in a temp dir named after the app id (translationtool needs that name). */
function withCopy(app, fn) {
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vox-l10n-sync-')))
	try {
		return fn(copyDir(app, base))
	} finally {
		fs.rmSync(base, { recursive: true, force: true })
	}
}

/** The POT without what changes on every run or with every edit elsewhere in a file. */
function potContent(text) {
	return text
		.split('\n')
		.filter((l) => !l.startsWith('#:') && !l.startsWith('"POT-Creation-Date:'))
		.join('\n')
}

function potFile(app, appid) {
	return path.join(app, 'translationfiles', 'templates', `${appid}.pot`)
}

/** A #: reference that is not relative to the app: an absolute path, such as a temp copy's. */
const absoluteRef = (text) => text.split('\n').some((l) => l.startsWith('#:') && l.slice(2).trim().split(/\s+/).some((r) => r.startsWith('/')))

/**
 * Builds the POT with translationtool. Returns { changed, absolute, path }. Writes only when
 * write is true; force rewrites even when only the references differ.
 */
function pot(app, appid, { write, force = false }) {
	const fresh = withCopy(app, (dir) => {
		fs.rmSync(path.join(dir, 'translationfiles', 'templates'), { recursive: true, force: true })
		run('php', [ensureDockerCi(), 'create-pot-files'], { cwd: dir })
		const text = fs.readFileSync(potFile(dir, appid), 'utf8')
		// translationtool hands xgettext absolute paths, so the #: references name this temp copy.
		// Make them relative to the app: stable between runs and machines, and no local paths.
		return text.split('\n').map((l) => (l.startsWith('#:') ? l.split(`${dir}${path.sep}`).join('') : l)).join('\n')
	})
	if (absoluteRef(fresh)) throw new Error('the POT still has absolute #: references after making them relative')
	const target = potFile(app, appid)
	const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
	const absolute = current !== null && absoluteRef(current)
	const changed = current === null || absolute || force || potContent(current) !== potContent(fresh)
	if (changed && write) {
		fs.mkdirSync(path.dirname(target), { recursive: true })
		fs.writeFileSync(target, fresh)
	}
	return { changed, absolute, path: path.relative(app, target) }
}

function languages(dir) {
	const l10n = path.join(dir, 'l10n')
	return fs.existsSync(l10n)
		? fs.readdirSync(l10n).filter((f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'en.json').map((f) => f.slice(0, -5)).sort()
		: []
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
const ncKey = (e) => (e.plural !== null ? `_${e.msgid}_::_${e.plural}_` : e.msgid)

/** One-off: l10n/<lang>.json → translationfiles/<lang>/<appid>.po, against the committed POT. */
function importJson(app, appid, { force }) {
	const target = potFile(app, appid)
	if (!fs.existsSync(target)) throw new Error(`${path.relative(app, target)} missing: run "pot" first`)
	const entries = parsePot(fs.readFileSync(target, 'utf8'), app)
	const keys = new Set(entries.map(ncKey))
	for (const lang of languages(app)) {
		const out = path.join(app, 'translationfiles', lang, `${appid}.po`)
		if (fs.existsSync(out) && !force) {
			console.log(`${lang}: ${path.relative(app, out)} exists, left alone (--force overwrites)`)
			continue
		}
		const data = JSON.parse(fs.readFileSync(path.join(app, 'l10n', `${lang}.json`), 'utf8'))
		const tr = data.translations || {}
		const pluralForm = data.pluralForm || 'nplurals=2; plural=(n != 1);'
		const n = Number((pluralForm.match(/nplurals\s*=\s*(\d+)/) || [])[1] || 2)
		const lines = [
			`# ${appid} ${lang}. Imported from l10n/${lang}.json when the app moved to Weblate;`,
			'# Weblate is the only writer of this file from then on.',
			'msgid ""',
			'msgstr ""',
			`"Project-Id-Version: ${appid}\\n"`,
			'"MIME-Version: 1.0\\n"',
			'"Content-Type: text/plain; charset=UTF-8\\n"',
			'"Content-Transfer-Encoding: 8bit\\n"',
			`"Language: ${lang}\\n"`,
			`"Plural-Forms: ${pluralForm}\\n"`,
			'',
		]
		let done = 0
		for (const e of entries) {
			const v = tr[ncKey(e)]
			for (const c of e.comments) lines.push(`#. ${c}`)
			lines.push(`msgid "${esc(e.msgid)}"`)
			if (e.plural !== null) {
				lines.push(`msgid_plural "${esc(e.plural)}"`)
				const ok = Array.isArray(v) && v.length === n && v.every(Boolean)
				if (ok) done++
				for (let i = 0; i < n; i++) lines.push(`msgstr[${i}] "${ok ? esc(v[i]) : ''}"`)
			} else {
				const ok = typeof v === 'string' && v !== ''
				if (ok) done++
				lines.push(`msgstr "${ok ? esc(v) : ''}"`)
			}
			lines.push('')
		}
		fs.mkdirSync(path.dirname(out), { recursive: true })
		fs.writeFileSync(out, lines.join('\n'))
		const stale = Object.keys(tr).filter((k) => !keys.has(k))
		console.log(`${lang}: ${done}/${entries.length} translated${stale.length ? `, ${stale.length} key(s) not in the POT left out: ${stale.slice(0, 3).map((s) => JSON.stringify(s)).join(', ')}` : ''}`)
	}
}

/** .po → l10n/*.js|json, the bot's way. Returns the l10n files that differ; writes when write is true. */
function build(app, appid, { write }) {
	const produced = withCopy(app, (dir) => {
		const tf = path.join(dir, 'translationfiles')
		if (fs.existsSync(tf)) {
			for (const lang of fs.readdirSync(tf)) {
				const po = path.join(tf, lang, `${appid}.po`)
				if (lang !== 'templates' && fs.existsSync(po)) run('msgattrib', ['--no-fuzzy', '-o', po, po])
			}
		}
		const l10n = path.join(dir, 'l10n')
		fs.mkdirSync(l10n, { recursive: true })
		for (const f of fs.readdirSync(l10n)) if (/^[^.].*\.(js|json)$/.test(f)) fs.rmSync(path.join(l10n, f))
		run('php', [ensureDockerCi(), 'convert-po-files'], { cwd: dir })
		const files = {}
		for (const f of fs.readdirSync(l10n)) if (/^[^.].*\.(js|json)$/.test(f)) files[f] = fs.readFileSync(path.join(l10n, f))
		return files
	})
	const l10n = path.join(app, 'l10n')
	const existing = fs.existsSync(l10n) ? fs.readdirSync(l10n).filter((f) => /^[^.].*\.(js|json)$/.test(f) && f !== 'en.json' && f !== 'en.js') : []
	const diff = []
	for (const [f, buf] of Object.entries(produced)) {
		const p = path.join(l10n, f)
		if (!fs.existsSync(p) || !fs.readFileSync(p).equals(buf)) {
			diff.push(f)
			if (write) fs.writeFileSync(p, buf)
		}
	}
	for (const f of existing) {
		if (!(f in produced)) {
			diff.push(`${f} (removed: no translations in .po)`)
			if (write) fs.rmSync(path.join(l10n, f))
		}
	}
	return diff
}

function main() {
	const argv = process.argv.slice(2)
	const cmd = argv[0]
	if (!['pot', 'import', 'build', 'check'].includes(cmd)) usage(2)
	const i = argv.indexOf('--app')
	const app = fs.realpathSync(i >= 0 ? argv[i + 1] : path.join(HERE, '..'))
	const appid = appIdOf(app)
	for (const bin of ['php', 'xgettext', 'msgattrib']) {
		if (spawnSync('sh', ['-c', `command -v ${bin}`]).status !== 0) throw new Error(`${bin} is required`)
	}

	if (cmd === 'pot') {
		const r = pot(app, appid, { write: true, force: argv.includes('--force') })
		console.log(r.changed ? `${r.path} written${r.absolute ? ' (it had absolute #: references)' : ''}` : `${r.path} unchanged`)
	} else if (cmd === 'import') {
		importJson(app, appid, { force: argv.includes('--force') })
	} else if (cmd === 'build') {
		const d = build(app, appid, { write: true })
		console.log(d.length ? `l10n/ updated: ${d.length} file(s)` : 'l10n/ unchanged')
	} else {
		const p = pot(app, appid, { write: false })
		const d = build(app, appid, { write: false })
		if (p.absolute) console.log(`${p.path} has absolute #: references (a local or temp path): run "node scripts/l10n-sync.mjs pot" and commit it`)
		else if (p.changed) console.log(`${p.path} is out of date: run "npm run pot" (node scripts/l10n-sync.mjs pot) and commit it`)
		if (d.length) console.log(`l10n/ is out of date (${d.length} file(s), e.g. ${d.slice(0, 3).join(', ')}): run "node scripts/l10n-sync.mjs build"`)
		if (!p.changed && !d.length) console.log('POT and l10n/ are up to date')
		process.exitCode = p.changed || d.length ? 1 : 0
	}
}

try {
	main()
} catch (e) {
	console.error(e.stack || String(e))
	process.exit(2)
}
