#!/usr/bin/env node
// Copied from voxcloud-apps/design@850d21108, l10n/tools/l10n-audit.mjs. Do not edit here: change it in design and run sync-to-apps.sh.
/**
 * l10n-audit.mjs: measures one VoxCloud app against design/l10n/RULES.md.
 *
 * It measures what Nextcloud measures. The app is exported from git at a fixed ref (never a
 * working copy), Nextcloud's own translationtool.phar (docker-ci, pinned) builds the POT, the same
 * one l10n-sync.mjs hands to Weblate, and every string rule runs on that POT. Translations are read
 * from l10n/ at the same ref, which CI builds from translationfiles/<lang>/<appid>.po. Nothing here
 * contacts Weblate, Transifex or GitHub; only the pinned docker-ci is cloned once into a cache.
 *
 * Usage:
 *   node l10n-audit.mjs --app <repo> [--ref <tag|branch>] [--prev <ref>] [--prev2 <ref>]
 *                       [--out report.md] [--json report.json]
 *                       [--speller auto|macos|hunspell|none] [--offline] [--strict]
 *                       [--gate pr|release]
 *   node l10n-audit.mjs --dir <app folder>        (no git: tests and fixtures)
 *
 * Defaults: --ref = latest release tag, --prev/--prev2 = the release tags before it.
 * --offline is accepted and does nothing since 2.0.0 (the App Store check, L06, is retired).
 *
 * Gates (RULES.md §3a): every finding carries a severity. `--gate pr` fails on Serious findings a
 * pull request can cause; `--gate release` also requires every batch of new or rewritten strings
 * to be recorded and announced in batches/<appid>.json. Other findings are reported, never gated.
 *
 * Requires: node >= 20, git, tar, php, xgettext. Spell check: swiftc (macOS) or hunspell + en_US.
 * Exit code: 0; 1 when a --gate fails, or with --strict when a MUST rule fails; 2 on an error.
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TOOL_VERSION = '2.0.1'
const DOCKER_CI_SHA = 'a823dbf56fa0837547825f3f188827da49aee767'
const NEW_STRINGS_THRESHOLD = 50 // L22
const HERE = path.dirname(fileURLToPath(import.meta.url))
const CACHE = process.env.VOX_L10N_CACHE || path.join(os.homedir(), '.cache', 'vox-l10n')
const MAX_LISTED = 40

// ---------------------------------------------------------------------------------------------
// Rule metadata (titles and origins mirror RULES.md; levels live on each finding)
// ---------------------------------------------------------------------------------------------
const RULES = {
	L01: ['The app is set up for Weblate', 'Vox'],
	L02: ['`l10n/.gitkeep` exists', 'NC-validator, NC-doc'],
	L03: ['`.l10nignore` excludes what does not ship, and nothing that does', 'NC-doc, Anna'],
	L04: ['Weblate is the only writer of translations', 'Vox'],
	L05: ['A named maintainer answers translator questions', 'Anna, Vox'],
	L07: ['Every user-facing string is translatable, backend included', 'NC-doc, Anna'],
	L08: ['The extractor sees every string', 'NC-validator'],
	L09: ['Translator hints are written so the extractor keeps them', 'NC-doc'],
	L10: ['Strings that need context have a hint', 'Anna, NC-doc'],
	L11: ['Whole sentences, never fragments', 'NC-doc, Anna'],
	L12: ['Placeholders translators can move', 'NC-doc, Anna, Vox'],
	L13: ['Real plurals', 'NC-doc, Anna'],
	L14: ['Markup stays out of strings', 'NC-doc'],
	L15: ['Characters Nextcloud rejects or prescribes', 'NC-validator, NC-doc, Anna'],
	L16: ['No double spaces, no space before %', 'Anna'],
	L17: ['Spelled-out negations', 'NC-doc, Vox'],
	L18: ['Correct, spell-checked American English', 'Anna, NC-onboarding, Vox'],
	L19: ["Nextcloud's own terms", 'Anna, NC-doc'],
	L20: ['Sentence case', 'Vox'],
	L21: ['Existing strings change in announced batches', 'Anna'],
	L22: ['Large sets of new strings are announced and paced', 'Anna'],
	L23: ['`l10n/` is derived, never edited', 'Vox'],
	L24: ["Translations pass Nextcloud's checks", 'NC-validator'],
	L25: ['Working in Weblate, and the first translation by AI', 'Vox'],
	L26: ['Translation freeze until an app is in Weblate', 'Vox'],
	L27: ['Onboarding keeps every existing translation', 'Vox'],
}
const ANNA_POINTS = [
	[1, 'No hard-coded strings, backend included', ['L07', 'L08']],
	[2, 'Correct English, spell-checked', ['L18']],
	[3, 'Context for short strings', ['L10']],
	[4, 'Whole sentences', ['L11']],
	[5, 'Positional placeholders', ['L12']],
	[6, 'Real plurals', ['L13']],
	[7, 'Clean strings', ['L15', 'L16']],
	[8, "Nextcloud's terms", ['L19']],
	[9, 'Named maintainer', ['L05']],
	[10, 'Stable source strings, in batches', ['L21', 'L22']],
	[11, 'Standard setup (l10n/, .l10nignore)', ['L02', 'L03']],
]

// Severity: what a finding does, independent of the rule's MUST/SHOULD level (RULES.md §3a).
const SEVERITIES = [
	['serious', 'Serious', "breaks the translation pipeline or Nextcloud's validation, or burdens translators"],
	['users', 'Users see it', 'in a translated interface, text stays English or reads wrong'],
	['translators', 'Translators guess', 'translating is possible, but a wrong translation is more likely'],
	['letter', 'Letter of the rule', 'no effect on users or translators'],
]
const SEVERITY_LABEL = Object.fromEntries(SEVERITIES.map(([k, label]) => [k, label]))
const SEVERITY_RANK = Object.fromEntries(SEVERITIES.map(([k], i) => [k, i]))
// Gates: rules a pull request cannot settle are left to the release gate. L24 gates: translations
// arrive as a pull request from Weblate, so a bad one is stopped there. L25-L27 are manual.
const GATE_RELEASE_ONLY = new Set(['L21', 'L22'])
const GATE_NEVER = new Set(['L25', 'L26', 'L27'])

/** Default severity of a finding; a check passes `severity` itself where the rule alone cannot tell. */
function severityOf(rule, f) {
	if (f.severity) return f.severity
	const k = f.key || ''
	switch (rule) {
	case 'L01': case 'L02': case 'L04': case 'L05': case 'L21': case 'L22': case 'L24': case 'L25': case 'L26': case 'L27': return 'serious'
	case 'L03': return f.level === 'should' ? 'letter' : 'serious'
	case 'L15': return /^L15\|(ws|dots|quote|pipe)\|/.test(k) ? 'serious' : 'letter'
	case 'L07': case 'L08': case 'L11': case 'L12': return 'users'
	case 'L13': return k.startsWith('L13|same|') ? 'letter' : 'users'
	case 'L16': return k.startsWith('L16|double|') ? 'users' : 'letter'
	case 'L18': return k.startsWith('L18|brit|') ? 'letter' : 'translators'
	case 'L09': case 'L10': case 'L14': case 'L19': return 'translators'
	default: return 'letter' // L17, L20, L23
	}
}

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const short = (s, n = 160) => {
	const one = String(s).replace(/\n/g, '⏎')
	return one.length > n ? one.slice(0, n - 1) + '…' : one
}
const has = (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' }).status === 0
const TAG_RE = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
const tagsOf = (s) => (String(s).match(/<\/?[a-z][a-z0-9]*\b/gi) || []).map((t) => t.toLowerCase()).sort()
const sameTags = (a, b) => JSON.stringify(tagsOf(a)) === JSON.stringify(tagsOf(b))
const PLACEHOLDER_RE = /\{[^{}\s]+\}|%n|%(?:\d+\$)?[sdif]/g
const HAS_PLACEHOLDER = /\{[^{}\s]+\}|%n|%(?:\d+\$)?[sdif]/
const stripForWords = (s) => s.replace(TAG_RE, ' ').replace(PLACEHOLDER_RE, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ')
const wordsOf = (s) => stripForWords(s).split(/\s+/).filter((w) => /\p{L}/u.test(w))

function git(repo, args, opts = {}) {
	return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, ...opts })
}
function gitOut(repo, args) {
	const r = git(repo, args)
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`)
	return r.stdout
}
function cmpVersion(a, b) {
	const pa = a.replace(/^v/, '').split('.').map(Number)
	const pb = b.replace(/^v/, '').split('.').map(Number)
	for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
	return 0
}
const releaseTags = (repo) => gitOut(repo, ['tag', '--list']).split('\n').filter((t) => /^v?\d+\.\d+\.\d+$/.test(t)).sort(cmpVersion)

function usage(code) {
	console.error('Usage: node l10n-audit.mjs --app <repo> [--ref <ref>] [--out file.md] [--json file.json] [--speller auto|macos|hunspell|none] [--offline] [--strict] [--gate pr|release]\n       node l10n-audit.mjs --dir <app folder> [...]')
	process.exit(code)
}

function parseArgs(argv) {
	const a = { speller: 'auto', strict: false, offline: false, keep: false }
	for (let i = 0; i < argv.length; i++) {
		const k = argv[i]
		const v = () => {
			if (i + 1 >= argv.length) usage(2)
			return argv[++i]
		}
		switch (k) {
		case '--app': a.app = path.resolve(v()); break
		case '--ref': a.ref = v(); break
		case '--prev': a.prev = v(); break
		case '--prev2': a.prev2 = v(); break
		case '--dir': a.dir = path.resolve(v()); break
		case '--rules-dir': a.rulesDir = path.resolve(v()); break
		case '--docker-ci': a.dockerCi = path.resolve(v()); break
		case '--speller': a.speller = v(); break
		case '--out': a.out = path.resolve(v()); break
		case '--json': a.json = path.resolve(v()); break
		case '--offline': a.offline = true; break
		case '--strict': a.strict = true; break
		case '--gate': a.gate = v(); if (!['pr', 'release'].includes(a.gate)) { console.error('--gate takes pr or release'); usage(2) } break
		case '--keep': a.keep = true; break
		case '-h': case '--help': usage(0); break
		default: console.error(`Unknown argument: ${k}`); usage(2)
		}
	}
	if (!a.app && !a.dir) usage(2)
	a.rulesDir ||= path.resolve(HERE, '..')
	return a
}

// ---------------------------------------------------------------------------------------------
// Export, Nextcloud's translationtool, POT parsing
// ---------------------------------------------------------------------------------------------
function appIdOf(dir) {
	const xml = fs.readFileSync(path.join(dir, 'appinfo', 'info.xml'), 'utf8')
	const m = xml.match(/<id>\s*([^<\s]+)\s*<\/id>/)
	if (!m) throw new Error('appinfo/info.xml has no <id>')
	return m[1]
}

function exportRef(repo, ref, base) {
	const tmp = path.join(base, `${ref.replace(/[^\w.-]/g, '_')}-tmp`)
	fs.mkdirSync(tmp, { recursive: true })
	execSync(`git -C ${q(repo)} archive --format=tar ${q(ref)} | tar -x -C ${q(tmp)}`, { stdio: ['ignore', 'ignore', 'pipe'] })
	// translationtool derives Vue hint paths from "<appid>/src/", so the folder must be named after the app id
	const dir = path.join(base, ref.replace(/[^\w.-]/g, '_'), appIdOf(tmp))
	fs.mkdirSync(path.dirname(dir), { recursive: true })
	fs.renameSync(tmp, dir)
	return dir
}

function copyDir(src, base) {
	const dir = path.join(base, 'dir', appIdOf(src))
	fs.cpSync(src, dir, { recursive: true, filter: (p) => !p.includes(`${path.sep}node_modules`) && !p.includes(`${path.sep}.git${path.sep}`) })
	return dir
}

function ensureDockerCi(given) {
	if (given) return path.join(given, 'translations', 'translationtool', 'translationtool.phar')
	const dir = path.join(CACHE, `docker-ci-${DOCKER_CI_SHA.slice(0, 9)}`)
	const phar = path.join(dir, 'translations', 'translationtool', 'translationtool.phar')
	if (!fs.existsSync(phar)) {
		fs.mkdirSync(dir, { recursive: true })
		const run = (args) => {
			const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' })
			if (r.status !== 0) throw new Error(`docker-ci: git ${args.join(' ')}: ${r.stderr}`)
		}
		run(['init', '-q'])
		run(['remote', 'add', 'origin', 'https://github.com/nextcloud/docker-ci'])
		run(['fetch', '-q', '--depth', '1', 'origin', DOCKER_CI_SHA])
		run(['checkout', '-q', 'FETCH_HEAD'])
	}
	return phar
}

function unescapePo(s) {
	return s.replace(/\\(["\\ntr])/g, (_, c) => ({ n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' })[c])
}

/** A hint is real when it says more than the file:line the Vue fake file adds to every string. */
function realHint(comments) {
	const parts = comments
		.map((c) => c.replace(/^TRANSLATORS[: ]*/, '').replace(/\s*\([^()]*\.vue:\d+\)\s*$/, '').trim())
		.filter((c) => c && !/^[\w./-]+\.vue:\d+$/.test(c))
	return parts.join(' ')
}

/** Real source locations: Vue strings point at the fake file, their .vue file:line is in the comment. */
function locations(refs, comments) {
	const vue = comments.map((c) => c.match(/(src\/[\w./-]+\.vue):(\d+)\)?\s*$/)).filter(Boolean).map((m) => ({ file: m[1], line: Number(m[2]) }))
	return [...refs.filter((r) => !r.file.startsWith('specialVueFakeDummy')), ...vue]
}

function parsePot(text, root) {
	const out = []
	let cur = null
	let key = null
	const flush = () => {
		if (cur && cur.msgid) {
			out.push({
				msgid: cur.msgid,
				plural: cur.msgid_plural ?? null,
				comments: cur.comments,
				refs: cur.refs,
				locs: locations(cur.refs, cur.comments),
				hint: realHint(cur.comments),
			})
		}
		cur = null
		key = null
	}
	for (const raw of text.split('\n')) {
		const line = raw.replace(/\r$/, '')
		if (line.trim() === '') { flush(); continue }
		cur ||= { comments: [], refs: [] }
		if (line.startsWith('#.')) { cur.comments.push(line.slice(2).trim()); continue }
		if (line.startsWith('#:')) {
			for (const r of line.slice(2).trim().split(/\s+/)) {
				const rel = r.startsWith(root + '/') ? r.slice(root.length + 1) : r
				const m = rel.match(/^(.*?)(?::(\d+))?$/)
				cur.refs.push({ file: m[1], line: m[2] ? Number(m[2]) : null })
			}
			continue
		}
		if (line.startsWith('#')) continue
		let m = line.match(/^(msgid_plural|msgid|msgstr(?:\[\d+\])?)\s+"(.*)"$/)
		if (m) { key = m[1]; cur[key] = unescapePo(m[2]); continue }
		m = line.match(/^"(.*)"$/)
		if (m && key) cur[key] += unescapePo(m[1])
	}
	flush()
	return out
}

function botExtract(dir, appid, phar, withCheckFiles) {
	fs.rmSync(path.join(dir, 'translationfiles', 'templates'), { recursive: true, force: true })
	const r = spawnSync('php', [phar, 'create-pot-files'], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 27 })
	if (r.status !== 0) throw new Error(`translationtool create-pot-files failed in ${dir}: ${r.stderr || r.stdout}`)
	const potPath = path.join(dir, 'translationfiles', 'templates', `${appid}.pot`)
	const entries = fs.existsSync(potPath) ? parsePot(fs.readFileSync(potPath, 'utf8'), dir) : []
	let warnings = []
	if (withCheckFiles) {
		const c = spawnSync('php', [phar, 'check-files'], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 27 })
		warnings = parseCheckFiles(c.stdout || '', dir)
	}
	// translationtool writes fake files and the POT into the export; remove them so source scans see the app only
	for (const f of ['specialAppInfoFakeDummyForL10nScript.php', 'specialVueFakeDummyForL10nScript.js', 'specialLocaleFakeDummyForL10nScript.php']) {
		fs.rmSync(path.join(dir, f), { force: true })
	}
	return { entries, warnings }
}

function parseCheckFiles(out, root) {
	const res = []
	let file = null
	let line = null
	for (const l of out.split('\n')) {
		let m = l.match(/^\*\* Warning: Check potentially missing translations sentences: \S+ (.+)$/)
		if (m) { file = m[1].startsWith(root + '/') ? m[1].slice(root.length + 1) : m[1]; continue }
		m = l.match(/^> Starting at line (\d+)/)
		if (m) { line = Number(m[1]); continue }
		m = l.match(/^\s+-> (.+)$/)
		if (m && file) res.push({ file, line, call: m[1] })
	}
	return res
}

/** Keys as they appear in l10n/*.json: the msgid, or _singular_::_plural_ for a plural. */
const l10nKey = (e) => (e.plural !== null ? `_${e.msgid}_::_${e.plural}_` : e.msgid)

function readL10nDir(dir) {
	const res = {}
	if (!dir || !fs.existsSync(dir)) return res
	for (const f of fs.readdirSync(dir)) {
		if (!f.endsWith('.json')) continue
		try {
			res[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).translations || {}
		} catch (e) {
			res[f.slice(0, -5)] = { __parseError: String(e.message) }
		}
	}
	return res
}

const isTranslated = (key, v) => (Array.isArray(v) ? v.some((x) => x && x !== key) : typeof v === 'string' && v !== '' && v !== key)

// ---------------------------------------------------------------------------------------------
// Source files, the way translationtool walks them
// ---------------------------------------------------------------------------------------------
function readIgnore(dir) {
	const p = path.join(dir, '.l10nignore')
	if (!fs.existsSync(p)) return null
	return fs.readFileSync(p, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
}

function sourceFiles(dir, ignore) {
	const exts = ['.php', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
	const out = []
	const walk = (rel) => {
		for (const entry of fs.readdirSync(path.join(dir, rel))) {
			if (entry.startsWith('.')) continue
			const r = rel ? `${rel}/${entry}` : entry
			if ((ignore || []).some((i) => r.startsWith(i))) continue
			const st = fs.statSync(path.join(dir, r))
			if (st.isDirectory()) {
				if (entry !== 'l10n' && entry !== 'node_modules' && r !== 'translationfiles') walk(r)
			} else if (exts.some((x) => entry.endsWith(x)) && !entry.endsWith('.min.js')) {
				out.push(r)
			}
		}
	}
	walk('')
	return out
}

const NON_SHIPPED = /^(tests?(-[\w]+)?|docs?|internal-docs|scripts?|tools|releases?|examples?|screenshots|Sample_files|certificates|build|demo|e2e|cypress|playwright)\//i
/** Code that ships: not a non-shipped folder, not a root-level config file, not Python tooling. */
const isShipped = (f) => f.includes('/') && !NON_SHIPPED.test(f) && !f.endsWith('.py')

function unescapeJs(s) {
	return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, c) => {
		if (c[0] === 'u' && c.length > 1) return String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16))
		if (c[0] === 'x' && c.length === 3) return String.fromCharCode(parseInt(c.slice(1), 16))
		return { n: '\n', t: '\t', r: '\r', '\n': '' }[c] ?? c
	})
}

const STR = (n) => `(['"\`])((?:\\\\[\\s\\S]|(?!\\${n})[^\\\\])*?)\\${n}`
const CALL_T = new RegExp(`(?<![\\w$])(?:[\\w$]+\\.)?\\$?t\\s*\\(\\s*(['"])([\\w.-]+)\\1\\s*,\\s*${STR(3)}`, 'g')
const CALL_N = new RegExp(`(?<![\\w$])(?:[\\w$]+\\.)?\\$?n\\s*\\(\\s*(['"])([\\w.-]+)\\1\\s*,\\s*${STR(3)}\\s*,\\s*${STR(5)}`, 'g')
const CALL_PHP_T = new RegExp(`(?:->|::)t\\(\\s*${STR(1)}`, 'g')
const CALL_PHP_N = new RegExp(`(?:->|::)n\\(\\s*${STR(1)}\\s*,\\s*${STR(3)}`, 'g')

/** Every translation call in a file: { line, msgid, plural, appid, literal }. */
function callsIn(file, text) {
	const res = []
	const lineAt = (idx) => text.slice(0, idx).split('\n').length
	if (file.endsWith('.php')) {
		for (const m of text.matchAll(CALL_PHP_T)) res.push({ index: m.index, line: lineAt(m.index), msgid: phpUnescape(m[2], m[1]), plural: null, literal: true })
		for (const m of text.matchAll(CALL_PHP_N)) res.push({ index: m.index, line: lineAt(m.index), msgid: phpUnescape(m[2], m[1]), plural: phpUnescape(m[4], m[3]), literal: true })
		for (const m of text.matchAll(/(?:->|::)[tn]\(\s*\$/g)) res.push({ index: m.index, line: lineAt(m.index), msgid: null, literal: false, snippet: lineText(text, m.index) })
	} else {
		for (const m of text.matchAll(CALL_T)) res.push({ index: m.index, line: lineAt(m.index), appid: m[2], msgid: unescapeJs(m[4]), plural: null, literal: !(m[3] === '`' && m[4].includes('${')) })
		for (const m of text.matchAll(CALL_N)) res.push({ index: m.index, line: lineAt(m.index), appid: m[2], msgid: unescapeJs(m[4]), plural: unescapeJs(m[6]), literal: true })
		for (const m of text.matchAll(/(?<![\w$.])\$?[tn]\s*\(\s*['"][\w.-]+['"]\s*,\s*(?!['"`\s])([A-Za-z_$][\w$.[\]]*)\s*[,)]/g)) {
			res.push({ index: m.index, line: lineAt(m.index), msgid: null, literal: false, snippet: lineText(text, m.index) })
		}
	}
	return res.sort(byPos)
}
const byPos = (a, b) => a.index - b.index
const phpUnescape = (s, quote) => (quote === "'" ? s.replace(/\\(['\\])/g, '$1') : unescapeJs(s))
const lineText = (text, idx) => text.slice(text.lastIndexOf('\n', idx) + 1, (text.indexOf('\n', idx) + 1 || text.length + 1) - 1).trim()

// ---------------------------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------------------------
class Audit {
	constructor() {
		this.findings = Object.fromEntries(Object.keys(RULES).map((k) => [k, []]))
		this.na = {}
		this.history = []
		this.notes = Object.fromEntries(Object.keys(RULES).map((k) => [k, []]))
	}

	/** sev: fail | review | exception. level: must | should. origin: nc | anna | vox. severity: see SEVERITIES. */
	add(rule, f) {
		const g = { level: 'must', origin: 'nc', ...f }
		g.severity = severityOf(rule, g)
		this.findings[rule].push(g)
	}

	/** Findings that block the given gate ('pr' or 'release'), as [rule, finding] pairs. */
	blocking(mode) {
		const out = []
		for (const [r, list] of Object.entries(this.findings)) {
			if (GATE_NEVER.has(r) || this.na[r]) continue
			if (mode === 'pr' && GATE_RELEASE_ONLY.has(r)) continue
			for (const f of list) {
				if (f.severity !== 'serious') continue
				// at a release, an undeclared batch is not an open question but a missing declaration
				if (f.sev === 'fail' || (mode === 'release' && (r === 'L21' || r === 'L22') && f.sev === 'review')) out.push([r, f])
			}
		}
		return out
	}

	note(rule, text) { this.notes[rule].push(text) }

	notApplicable(rule, reason) { this.na[rule] = reason }

	applyReviews(reviews) {
		for (const list of Object.values(this.findings)) {
			for (const f of list) {
				const r = f.key && reviews[f.key]
				if (!r) continue
				f.reviewed = r
				if (r.verdict === 'ok') f.sev = 'ok'
				else if (r.verdict === 'fail') f.sev = 'fail'
			}
		}
	}

	verdict(rule) {
		if (this.na[rule]) return 'N/A'
		const fs_ = this.findings[rule]
		if (fs_.some((f) => f.sev === 'fail' && f.level === 'must')) return 'FAIL'
		if (fs_.some((f) => f.sev === 'review')) return 'REVIEW'
		if (fs_.some((f) => f.sev === 'exception')) return 'EXCEPTION'
		return 'PASS'
	}

	annaVerdict(rules) {
		const fs_ = rules.filter((r) => !this.na[r]).flatMap((r) => this.findings[r])
		if (fs_.some((f) => f.sev === 'fail' && f.level === 'must' && f.origin !== 'vox')) return 'Not met'
		if (fs_.some((f) => f.sev === 'review' && f.origin !== 'vox')) return 'Open'
		return 'Met'
	}
}

function loadJson(p, fallback) {
	try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function loadWordlist(rulesDir) {
	const p = path.join(rulesDir, 'wordlist.txt')
	if (!fs.existsSync(p)) return new Set()
	return new Set(fs.readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))
}

// --- setup rules -----------------------------------------------------------------------------
function checkSetup(A, ctx) {
	const { dir, appid } = ctx
	// L01: the files of the Weblate setup (RULES.md L01); Transifex's config is gone
	if (fs.existsSync(path.join(dir, '.tx', 'config'))) A.add('L01', { sev: 'fail', origin: 'vox', msg: '`.tx/config` is still there: the app no longer syncs with Transifex' })
	const poDir = path.join(dir, 'translationfiles')
	ctx.poLangs = fs.existsSync(poDir) ? fs.readdirSync(poDir).filter((d) => d !== 'templates' && fs.existsSync(path.join(poDir, d, `${appid}.po`))) : []
	for (const [file, why] of [
		[`translationfiles/templates/${appid}.pot`, 'the POT Weblate reads'],
		['scripts/l10n-sync.mjs', 'builds the POT and l10n/'],
		['scripts/l10n-audit.mjs', 'l10n-sync.mjs imports it'],
		['.forgejo/workflows/l10n-sync.yml', 'the `l10n sync` check'],
	]) if (!fs.existsSync(path.join(dir, file))) A.add('L01', { sev: 'fail', origin: 'vox', msg: `\`${file}\` is missing (${why})` })
	// The l10n sync workflow arrives with the import (CHECKLIST C); a .po alone can be a leftover
	// from the Transifex period.
	ctx.inWeblate = fs.existsSync(path.join(dir, '.forgejo', 'workflows', 'l10n-sync.yml'))
	if (!ctx.inWeblate) A.note('L01', 'The app is not in Weblate yet (no `l10n sync` workflow): translation freeze, L26.')
	if (!ctx.poLangs.length) A.add('L01', { sev: 'fail', origin: 'vox', msg: `no \`translationfiles/<lang>/${appid}.po\`` })
	else A.note('L01', `${ctx.poLangs.length} languages in \`translationfiles/\`.`)
	// L02
	if (!fs.existsSync(path.join(dir, 'l10n', '.gitkeep'))) A.add('L02', { sev: 'fail', msg: '`l10n/.gitkeep` is missing' })
	// L03
	const ignore = ctx.ignore
	if (!ignore) {
		A.add('L03', { sev: 'fail', origin: 'anna', msg: '`.l10nignore` is missing' })
	} else {
		if (ignore.some((l) => /\r$/.test(l))) A.add('L03', { sev: 'fail', origin: 'anna', msg: '`.l10nignore` has CRLF line endings: translationtool then matches no entry' })
		for (const req of ['js/']) if (!ignore.includes(req)) A.add('L03', { sev: 'fail', origin: 'anna', msg: `\`${req}\` is not ignored` })
		for (const d of ['vendor', 'vendor-bin']) {
			if (fs.existsSync(path.join(dir, d)) && !ignore.some((l) => l.startsWith(d))) A.add('L03', { sev: 'fail', origin: 'anna', msg: `\`${d}/\` exists and is not ignored` })
		}
		for (const s of ['lib', 'src', 'templates', 'appinfo']) {
			if (ignore.some((l) => l === s || l === `${s}/` || `${s}/`.startsWith(l))) A.add('L03', { sev: 'fail', origin: 'anna', msg: `shipped folder \`${s}/\` is ignored` })
		}
		const globs = ignore.filter((l) => l.includes('*'))
		if (globs.length) A.note('L03', `Entries with \`*\` have no effect: translationtool matches path prefixes only (${globs.map((g) => `\`${g}\``).join(', ')}).`)
	}
	const unignored = [...new Set((ctx.botFiles || []).filter((f) => NON_SHIPPED.test(f)).map((f) => f.split('/')[0]))]
	if (unignored.length) A.add('L03', { sev: 'fail', level: 'should', origin: 'anna', msg: `non-shipped folder(s) with code not in \`.l10nignore\`: ${unignored.map((d) => `\`${d}/\``).join(', ')} (translationtool scans them)` })
	const leaked = new Map()
	for (const e of ctx.pot) for (const r of e.locs) if (NON_SHIPPED.test(r.file)) leaked.set(`${r.file}`, (leaked.get(r.file) || 0) + 1)
	for (const [file, n] of leaked) A.add('L03', { sev: 'fail', origin: 'anna', msg: `non-shipped file contributes ${n} string(s) to the POT`, where: file })
}

/**
 * L04 and L23 on the history of the audited ref, after the import (RULES.md L27): the first commit
 * on the ref's first-parent line that brought .forgejo/workflows/l10n-sync.yml, normally the merge
 * of the import pull request, so the import's own commits are not counted. After it, .po changes
 * only through Weblate, and l10n/ only through l10n-sync's rebuild. CI enforces both per pull
 * request (`l10n sync`); this lists what got past it.
 */
function checkWeblateHistory(A, ctx) {
	const { repo, ref, appid } = ctx
	if (!repo) {
		for (const r of ['L04', 'L23']) A.notApplicable(r, 'no git history (--dir)')
		return
	}
	const po = `translationfiles/*/${appid}.po`
	const added = gitOut(repo, ['log', ref, '--first-parent', '--reverse', '--diff-filter=A', '--format=%H%x09%ad', '--date=short', '--', '.forgejo/workflows/l10n-sync.yml']).split('\n').filter(Boolean)
	if (!added.length) {
		for (const r of ['L04', 'L23']) A.notApplicable(r, 'not in Weblate yet (no `l10n sync` workflow in the history)')
		return
	}
	const [importSha, since] = added[0].split('\t')
	ctx.onboarded = `${since} (\`${importSha.slice(0, 9)}\`)`
	const range = `${importSha}..${ref}`
	// L04: every .po commit after the import is Weblate's (committer Weblate, author the translator)
	let weblate = 0
	for (const l of gitOut(repo, ['log', range, '--no-merges', '--format=%H%x09%cn%x09%an%x09%s', '--', po]).split('\n').filter(Boolean)) {
		const [h, cn, an, s] = l.split('\t')
		if (cn === 'Weblate') { weblate++; continue }
		A.add('L04', { sev: 'review', origin: 'vox', key: `L04|${h.slice(0, 9)}`, msg: `\`.po\` changed outside Weblate by ${an}: ${short(s, 90)}`, where: h.slice(0, 9) })
	}
	A.note('L04', `Imported ${since}; ${weblate} Weblate commit(s) to \`.po\` since.`)
	// L23: an l10n/ change comes from l10n-sync's rebuild, or travels with the .po it was built from
	for (const l of gitOut(repo, ['log', range, '--no-merges', '--format=%H%x09%an%x09%s', '--', 'l10n/*.js', 'l10n/*.json']).split('\n').filter(Boolean)) {
		const [h, an, s] = l.split('\t')
		if (an === 'VoxCloud l10n-sync' || /rebuild l10n\/ from translationfiles/.test(s)) continue
		if (gitOut(repo, ['diff-tree', '--no-commit-id', '--name-only', '-r', h, '--', po]).trim()) continue
		A.add('L23', { sev: 'fail', origin: 'vox', key: `L23|${h.slice(0, 9)}`, msg: `commit changes \`l10n/\` without its \`.po\`: ${short(s, 100)}`, where: h.slice(0, 9) })
	}
}

function checkMaintainer(A, ctx) {
	const readme = ['README.md', 'readme.md', 'README'].map((f) => path.join(ctx.dir, f)).find((p) => fs.existsSync(p))
	const text = readme ? fs.readFileSync(readme, 'utf8') : ''
	if (/translation maintainer/i.test(text) && /weblate/i.test(text)) A.note('L05', 'README names a translation maintainer and the Weblate route.')
	else A.add('L05', { sev: 'fail', origin: 'anna', msg: 'README does not name a translation maintainer and the Weblate route' })
	A.add('L05', { sev: 'review', key: 'L05|answers', msg: 'whether questions in Weblate and in issues get answered is not measured by the tool' })
}

// --- extraction rules ------------------------------------------------------------------------
function checkExtraction(A, ctx) {
	const { dir, appid, pot, files } = ctx
	const potSet = new Set(pot.flatMap((e) => [norm(e.msgid), e.plural !== null ? norm(e.plural) : null]).filter(Boolean))
	const byMsgid = new Map(pot.map((e) => [norm(e.msgid), e]))
	let calls = 0
	const missing = []
	const multi = []
	for (const f of files) {
		const text = fs.readFileSync(path.join(dir, f), 'utf8')
		const cs = callsIn(f, text)
		calls += cs.length
		for (const c of cs) {
			if (!c.literal) {
				A.add('L08', { sev: 'review', key: `L08|${f}|${c.snippet}`, msg: 'msgid is not a literal string, so translationtool cannot extract it', where: `${f}:${c.line}`, detail: short(c.snippet) })
				continue
			}
			if (c.appid !== undefined && c.appid !== appid) continue // another app's strings, e.g. t('core', …)
			for (const s of [c.msgid, c.plural]) if (s && !potSet.has(norm(s))) missing.push({ f, line: c.line, s })
		}
		// bare t('Some text') without the app id, and calls through helpers the extractor does not know
		if (!f.endsWith('.php')) {
			for (const m of text.matchAll(/(?<![\w$.])t\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/g)) {
				if (/^[a-z_][\w.-]*$/.test(m[2])) continue
				A.add('L08', { sev: 'fail', key: `L08|bare|${f}|${m[2]}`, msg: 'translation call without the app id: translationtool does not extract it', where: `${f}:${text.slice(0, m.index).split('\n').length}`, detail: short(m[2]) })
			}
			for (const m of text.matchAll(/(?<![\w$.])(translate|translatePlural|trans|_t)\s*\(\s*(['"`])([^'"`]*)\2(\s*,\s*['"`])?/g)) {
				if (/^[a-z_][\w.-]*$/.test(m[3]) && !m[4]) continue // translate('app', variable): a wrapper, no literal msgid
				A.add('L08', { sev: 'fail', key: `L08|helper|${f}|${lineText(text, m.index)}`, msg: `\`${m[1]}()\` with a literal: the extractor only knows \`t\` and \`n\``, where: `${f}:${text.slice(0, m.index).split('\n').length}`, detail: short(lineText(text, m.index)) })
			}
		}
		// L09 support: lines with two or more calls
		text.split('\n').forEach((l, i) => {
			const n_ = (l.match(/(?<![\w$])(?:[\w$]+\.)?\$?[tn]\s*\(\s*['"][\w.-]+['"]\s*,/g) || []).length + (l.match(/->[tn]\(\s*['"]/g) || []).length
			if (n_ >= 2) multi.push(`${f}:${i + 1}`)
		})
		checkHints(A, f, text, byMsgid)
	}
	for (const m of missing) A.add('L08', { sev: 'fail', key: `L08|missing|${m.s}`, msg: 'string is in the code but not in the POT translationtool builds', where: `${m.f}:${m.line}`, detail: short(m.s) })
	for (const w of ctx.warnings.filter((w) => !isShipped(w.file))) A.note('L08', `check-files warns on non-shipped \`${w.file}\` (${short(w.call, 60)}); see L03.`)
	for (const w of ctx.warnings.filter((w) => isShipped(w.file))) A.add('L08', { sev: 'fail', key: `L08|checkfiles|${w.file}|${w.call}`, msg: 'translationtool check-files: potentially missing translation', where: `${w.file}:${w.line ?? '?'}`, detail: short(w.call) })
	A.note('L08', `${calls} translation calls in ${files.length} shipped source files (${ctx.botFiles.length} files scanned by translationtool); POT has ${pot.length} entries.`)
	if (multi.length) A.note('L09', `${multi.length} lines hold more than one translation call; only the first can carry a hint (${multi.slice(0, 5).join(', ')}${multi.length > 5 ? ', …' : ''}).`)

	// L10
	const infoOnly = (e) => e.refs.length > 0 && e.refs.every((r) => r.file.startsWith('specialAppInfoFakeDummy'))
	for (const e of pot) {
		if (infoOnly(e)) continue // appinfo/info.xml offers no way to add a hint (S4 createFakeFileForAppInfo)
		const w = wordsOf(e.msgid)
		if (w.length <= 2 && !e.hint) A.add('L10', { sev: 'fail', origin: 'anna', key: `L10|${e.msgid}`, msg: `${w.length}-word string without a hint`, detail: short(e.msgid), where: refOf(e) })
		else if (HAS_PLACEHOLDER.test(e.msgid) && !e.hint) A.add('L10', { sev: 'fail', level: 'should', key: `L10b|${e.msgid}`, msg: 'string with a placeholder but no hint', detail: short(e.msgid), where: refOf(e) })
	}
	const withHint = pot.filter((e) => e.hint).length
	A.note('L10', `${withHint} of ${pot.length} POT entries carry a real hint (Vue file:line markers not counted).`)
}

const refOf = (e) => { const r = e.locs[0] || e.refs[0]; return r ? `${r.file}${r.line ? ':' + r.line : ''}` : '' }
const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

function checkHints(A, f, text, byMsgid) {
	const lines = text.split('\n')
	lines.forEach((l, i) => {
		if (!/TRANSLATORS/.test(l) || !/(\/\/|\/\*|^\s*\*|<!--|#)/.test(l)) return
		const hint = l.replace(/^.*?TRANSLATORS[: ]*/, '').replace(/-->.*$|\*\/.*$/, '').trim()
		const sameLine = l.slice(0, l.indexOf('TRANSLATORS'))
		let target = null
		const probe = (chunk) => {
			const cs = callsIn(f, chunk).filter((c) => c.literal)
			return cs.length ? cs[0] : null
		}
		if (/(\bt|->t|\bn|->n)\s*\(/.test(sameLine)) target = probe(sameLine)
		let k = i - 1
		while (k >= 0 && /^\s*(\/\/|\*|\/\*)/.test(lines[k])) k--
		if (!target && k >= 0 && /(?:->|::|(?<![\w$.])\$?)[tn]\s*\(\s*$/.test(lines[k])) {
			let m = i + 1
			while (m < lines.length && /^\s*(\/\/|\*|\/\*)/.test(lines[m])) m++
			const lit = (lines[m] || '').match(/^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/)
			if (lit) target = { msgid: f.endsWith('.php') ? phpUnescape(lit[2], lit[1]) : unescapeJs(lit[2]), literal: true }
		}
		let j = i + 1
		while (!target && j < Math.min(lines.length, i + 7)) {
			if (/^\s*(\/\/|\*|\/\*)/.test(lines[j]) && !/(\bt|->t)\s*\(/.test(lines[j])) { j++; continue }
			target = probe(lines.slice(j, j + 6).join('\n'))
			break
		}
		if (!target) {
			A.add('L09', { sev: 'fail', key: `L09|nocall|${f}|${hint}`, msg: 'hint is not followed by a translation call', where: `${f}:${i + 1}`, detail: short(hint) })
			return
		}
		const e = byMsgid.get(norm(target.msgid))
		if (!e) return // missing from the POT altogether: reported under L08
		const want = alnum(hint).slice(0, 25)
		if (!want) return
		if (!alnum(e.hint).includes(want)) A.add('L09', { sev: 'fail', key: `L09|lost|${target.msgid}`, msg: 'hint in the code does not reach the POT for this string', where: `${f}:${i + 1}`, detail: short(target.msgid) })
	})
}

// --- hard-coded strings and fragments (candidates for review) --------------------------------
function checkCandidates(A, ctx) {
	const { dir, files, pot } = ctx
	const cand = (rule, f, line, snippet, why) => {
		const key = `${rule}|${f}|${short(snippet.trim(), 200)}`
		A.add(rule, { sev: 'review', origin: rule === 'L07' ? 'anna' : 'nc', key, msg: why, where: `${f}:${line}`, detail: short(snippet.trim()) })
	}
	for (const f of files) {
		const text = fs.readFileSync(path.join(dir, f), 'utf8')
		const lines = text.split('\n')
		const isTranslatedLine = (l) => /(?<![\w$])(?:[\w$]+\.)?\$?[tn]\s*\(\s*['"][\w.-]+['"]|(?:->|::)[tn]\(/.test(l)
		const isLogLine = (l) => /logger|->log\(|console\.|\blog\(|->debug\(|->warning\(|->error\(|->info\(/.test(l)
		if (f.endsWith('.vue')) {
			const m = text.match(/<template>([\s\S]*)<\/template>/)
			if (m) {
				const off = text.slice(0, m.index + '<template>'.length).split('\n').length - 1
				const tpl = m[1].replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))
				for (const tm of tpl.matchAll(/>([^<>]+)</g)) {
					const txt = tm[1].replace(/\{\{[\s\S]*?\}\}/g, '').replace(/&[a-z]+;|&#\d+;/gi, '')
					if (/[A-Za-z]{2,}/.test(txt) && !/^[\s\w.-]*@[\w.-]+$/.test(txt.trim())) {
						cand('L07', f, off + tpl.slice(0, tm.index).split('\n').length, txt, 'literal text in a template')
					}
				}
				const ATTR = /(?<![:@#\w-])(placeholder|title|aria-label|label|alt|text|description|tooltip|heading|helper-text|button-text|empty-text|confirm-text|subtitle|caption)="([^"]+)"/g
				tpl.split('\n').forEach((l, i) => {
					for (const am of l.matchAll(ATTR)) {
						const v = am[2]
						if ((/\s/.test(v) || /^[A-Z][a-z]/.test(v)) && !/^[a-z]+([A-Z][a-z0-9]*)+$/.test(v)) cand('L07', f, off + i + 1, am[0], `literal \`${am[1]}\` attribute`)
					}
				})
			}
		}
		if (!f.endsWith('.php')) {
			lines.forEach((l, i) => {
				if (!isLogLine(l) && !/^\s*(\/\/|\*)/.test(l) && /\b(error|err|e)\.message\b/.test(l) && /show(Error|Warning)\(|\{\s*\w+\s*:\s*(error|err|e)\.message|errorMsg\s*=|\|\|\s*(error|err|e)\.message/.test(l)) cand('L07', f, i + 1, l, 'technical error message (English) can reach the user')
				if (!/^\s*(\/\/|\*)/.test(l)) {
					if (/t\(\s*['"][\w.-]+['"]\s*,[^)]*\)\s*\+\s*['"`]|['"`]\s*\+\s*t\(\s*['"]/.test(l)) cand('L11', f, i + 1, l, 'translation joined with literal text')
					if (/\{\{\s*t\([^}]*\}\}\s*\{\{\s*t\(/.test(l)) cand('L11', f, i + 1, l, 'two translations side by side in one text node')
				}
				if (isTranslatedLine(l) || isLogLine(l) || /^\s*(\/\/|\*)/.test(l)) return
				const pats = [
					[/show(Error|Success|Warning|Info|Message)\(\s*(['"`])[A-Za-z]/, 'literal passed to a toast'],
					[/(?<![\w.])(alert|confirm|prompt)\(\s*['"`][A-Za-z]/, 'literal in a browser dialog'],
					[/\b(text|title|label|placeholder|message|description|heading|ariaLabel|tooltip|subtitle|caption)\s*:\s*(['"`])[A-Z][a-z]+(?:[ ,.'’-]+[A-Za-z]+)+/, 'literal UI text in an object'],
					[/\b(textContent|innerText|innerHTML)\s*=\s*['"`][A-Za-z]{2,}/, 'literal written into the DOM'],
					[/setAttribute\(\s*['"](aria-label|title|placeholder)['"]\s*,\s*['"`][A-Za-z]/, 'literal attribute set from code'],
				]
				for (const [re, why] of pats) if (re.test(l)) { cand('L07', f, i + 1, l, why); break }
			})
		} else {
			const inTemplates = f.startsWith('templates/')
			lines.forEach((l, i) => {
				if (isLogLine(l) || /^\s*(\/\/|\*|#)/.test(l)) return
				if (lines.slice(Math.max(0, i - 4), i).some((p) => /logger|->log\(/.test(p)) && !lines.slice(Math.max(0, i - 4), i).some((p) => /\);\s*$/.test(p))) return
				const pats = [
					[/'(error|message|msg|title|label|text|detail|hint|reason|subject|body|description)'\s*=>\s*(['"])[A-Z][^'"]*[a-z]/, 'literal message in a response'],
					[/=>\s*\$\w+->getMessage\(\)/, 'exception message passed on'],
					[/return\s*\[\s*null\s*,\s*(['"])[^'"]*[a-z]{2,} [^'"]*\1/, 'validator returns a literal reason'],
					[/throw new [\w\\]*Exception\(\s*(['"])[A-Z][^'"]* [^'"]*\1/, 'exception with a sentence as message'],
					[/function getName\(\)[^{]*\{?\s*return\s*['"][A-Z]/, 'literal settings or section name'],
					[/set(Parsed|Rich)(Subject|Message)\(\s*['"][A-Z]/, 'literal notification text'],
				]
				if (!isTranslatedLine(l)) for (const [re, why] of pats) if (re.test(l)) { cand('L07', f, i + 1, l, why); break }
				if (/->t\([^;]*?\)\s*\.\s*(['"]|\$)|(['"]|\$\w+)\s*\.\s*\$this->l\w*->t\(/.test(l)) cand('L11', f, i + 1, l, 'translation joined with other text')
				if (inTemplates && !isTranslatedLine(l) && !/^\s*<\?php\s*(\/\/|\/\*)/.test(l)) {
					const html = l.replace(/<\?php[\s\S]*?(\?>|$)/g, ' ').replace(/<[^>]*(>|$)/g, ' ').replace(/^[^<>]*>/, ' ')
					if (/[A-Za-z]{3,} [A-Za-z]{2,}/.test(html)) cand('L07', f, i + 1, l, 'literal text in a PHP template')
				}
			})
		}
	}
	for (const e of pot) {
		if (/^[a-z]/.test(e.msgid) && !/^(e\.g\.|iOS|macOS|iPad|iPhone)/.test(e.msgid)) {
			A.add('L11', { sev: 'review', key: `L11|lower|${e.msgid}`, msg: 'msgid starts in lower case: a fragment of a sentence?', detail: short(e.msgid), where: refOf(e) })
		}
	}
}

// --- string rules on the POT ----------------------------------------------------------------
function checkStrings(A, ctx) {
	const { pot } = ctx
	const all = pot.flatMap((e) => [{ e, s: e.msgid }, ...(e.plural !== null ? [{ e, s: e.plural }] : [])])
	for (const { e, s } of all) {
		const where = refOf(e)
		const d = short(s)
		const isPhp = e.refs.some((r) => r.file.endsWith('.php'))
		const isJs = e.refs.some((r) => !r.file.endsWith('.php'))
		// L12
		const printf = s.match(/%(?!n\b)(?:\d+\$)?[sdif]/g) || []
		if (isPhp && printf.length > 1 && printf.some((p) => !/^%\d+\$/.test(p))) A.add('L12', { sev: 'fail', origin: 'anna', key: `L12|pos|${s}`, msg: 'PHP string with more than one placeholder, not positional', detail: d, where })
		if (isJs && printf.length) A.add('L12', { sev: 'fail', origin: 'vox', key: `L12|js|${s}`, msg: '`%s`-style placeholder in a JS/Vue string: shown literally', detail: d, where })
		// L13
		if (/\w\((?:s|es)\)/i.test(s)) A.add('L13', { sev: 'fail', origin: 'anna', key: `L13|s|${s}`, msg: '"(s)" instead of a plural', detail: d, where })
		// L15 (a): validateTranslationFiles.sh
		if (/^\s|\s$/.test(s)) A.add('L15', { sev: 'fail', key: `L15|ws|${s}`, msg: 'leading or trailing whitespace', detail: JSON.stringify(short(s, 80)), where })
		if (s.includes('...')) A.add('L15', { sev: 'fail', key: `L15|dots|${s}`, msg: 'three dots instead of …', detail: d, where })
		if (/[´’]/.test(s)) A.add('L15', { sev: 'fail', key: `L15|quote|${s}`, msg: 'unicode single quote instead of \'', detail: d, where })
		if (s.includes('|')) A.add('L15', { sev: 'fail', key: `L15|pipe|${s}`, msg: 'pipe character', detail: d, where })
		// L15 (b): the ellipsis
		if (/&hellip;|&#8230;|&#x2026;/i.test(s)) A.add('L15', { sev: 'fail', origin: 'anna', key: `L15|entity|${s}`, msg: 'ellipsis as an HTML entity', detail: d, where })
		for (const m of s.matchAll(/…/g)) {
			const before = s[m.index - 1]
			if (before === ' ') A.add('L15', { sev: 'fail', origin: 'anna', key: `L15|space|${s}`, msg: 'normal space before … (must be U+00A0)', detail: d, where })
			else if (before && /\p{L}/u.test(before)) A.add('L15', { sev: 'review', key: `L15|word|${s}`, msg: '… directly after a letter: a shortened word?', detail: d, where })
		}
		// L16
		if (/ {2}/.test(s)) A.add('L16', { sev: 'fail', origin: 'anna', key: `L16|double|${s}`, msg: 'double space', detail: JSON.stringify(short(s, 80)), where })
		if (/(\d|\})[ \u00a0]+%(?![sdifn]|\d+\$)/.test(s)) A.add('L16', { sev: 'fail', origin: 'anna', key: `L16|pct|${s}`, msg: 'space between a number and %', detail: d, where })
		// L17
		if (/\b\w+n['’]t\b|\bcan not\b/i.test(s)) A.add('L17', { sev: 'fail', level: 'should', key: `L17|neg|${s}`, msg: 'contracted negation (write "Do not", "Cannot")', detail: d, where })
		else if (/\b(let|that|it|what|there|here|who)['’]s\b|\b(you|we|they)['’](re|ll|ve|d)\b|\bI['’](m|ll|ve|d)\b|\bit['’]ll\b/i.test(s)) A.add('L17', { sev: 'fail', level: 'should', origin: 'vox', key: `L17|other|${s}`, msg: 'other contraction', detail: d, where })
		// L18 (b): British spelling
		const brit = s.match(/\b(organis(?:e|es|ed|ing|ation|ations)|customis\w*|recognis\w*|prioritis\w*|personalis\w*|authoris\w*|initialis\w*|synchronis\w*|minimis\w*|maximis\w*|optimis\w*|analys(?:e|ed|es|ing)|colours?|coloured|behaviours?|favourites?|centres?|centred|licence[sd]?|cancelled|cancelling|travell(?:ed|ing|er)|labell(?:ed|ing)|modell(?:ed|ing)|catalogues?|dialogues?|grey|enrolment|enrol(?:s|led|ling)?)\b/i)
		if (brit) A.add('L18', { sev: 'fail', origin: 'vox', key: `L18|brit|${s}`, msg: `British spelling "${brit[1]}"`, detail: d, where })
		// L19
		const TERMS = [
			['user(s)', /\busers?\b/i], ['admin', /\badmins?\b/i], ['administrator', /\badministrators?\b/i],
			['directory', /\bdirector(?:y|ies)\b/i], ['e-mail', /\be-mail\b/i], ['sign in', /\bsign(?:ed|ing)?[ -](?:in|out)\b/i],
			['login as a verb', /\blogin (?:to|with|again|here|using)\b/i], ['group folder', /\bgroup ?folders?\b|\bgroupfolders?\b/i],
		]
		for (const [term, re] of TERMS) if (re.test(s)) A.add('L19', { sev: 'review', origin: 'anna', key: `L19|${term}|${s}`, msg: `term "${term}"`, detail: d, where })
		// L20 (heuristic, Vox SHOULD)
		const stripped = s.replace(PLACEHOLDER_RE, '').replace(TAG_RE, ' ')
		const words = stripped.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !ctx.wordlist.has(w.replace(/[^\w]/g, '')) && !/^[A-Z0-9]{2,}s?$/.test(w))
		const caps = words.filter((w) => /^[A-Z][a-z]+/.test(w))
		if (words.length >= 2 && caps.length === words.length) A.add('L20', { sev: 'fail', level: 'should', origin: 'vox', key: `L20|${s}`, msg: 'looks like Title Case', detail: d, where })
	}
	// L13: plurals and count-like placeholders in t()
	for (const e of pot) {
		if (e.plural !== null) {
			if (!e.msgid.includes('%n') || !e.plural.includes('%n')) {
				// a form that still carries the number as a named placeholder works at runtime; one without any number reads wrong where the singular form covers 21, 31, …
				const numbered = (s) => s.includes('%n') || /\{[^{}\s]+\}/.test(s)
				const severity = numbered(e.msgid) && numbered(e.plural) ? 'letter' : 'users'
				A.add('L13', { sev: 'fail', severity, key: `L13|pn|${e.msgid}`, msg: 'plural without %n in both forms', detail: short(`${e.msgid} / ${e.plural}`), where: refOf(e) })
			}
			if (e.msgid === e.plural) A.add('L13', { sev: 'fail', key: `L13|same|${e.msgid}`, msg: 'singular and plural are identical', detail: short(e.msgid), where: refOf(e) })
		} else if (/\{(count|n|num|total|amount|quantity|days|hours|minutes|seconds|\w+(?:Count|Total|Amount))\}/.test(e.msgid)) {
			A.add('L13', { sev: 'review', origin: 'anna', key: `L13|t|${e.msgid}`, msg: 'count-like placeholder in a string without n(): a varying number?', detail: short(e.msgid), where: refOf(e) })
		}
	}
	A.note('L13', `${pot.filter((e) => e.plural !== null).length} plural entries.`)
}

// --- L14 with exceptions, L24 -----------------------------------------------------------------
function checkMarkupAndTranslations(A, ctx) {
	const { pot, dir, exceptions, translations } = ctx
	const html = pot.filter((e) => /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(e.msgid) || (e.plural && /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(e.plural)))
	const ex = (exceptions.exceptions || []).find((x) => x.rule === 'L14')
	const covered = []
	for (const e of html) {
		const ok = ex && new RegExp(ex.covers?.msgidPattern || '.', 'i').test(e.msgid) && (!ex.covers?.files || e.locs.some((r) => ex.covers.files.includes(r.file)))
		if (ok) covered.push(e)
		else A.add('L14', { sev: 'fail', level: 'should', key: `L14|${e.msgid}`, msg: 'HTML markup in the string', detail: short(e.msgid), where: refOf(e) })
	}
	if (covered.length) {
		const broken = []
		for (const sg of ex.safeguards || []) {
			if (sg.check?.hintPattern) {
				const re = new RegExp(sg.check.hintPattern, 'i')
				const miss = covered.filter((e) => !re.test(e.hint))
				if (miss.length) broken.push([sg.id, `${miss.length} of ${covered.length} strings have no hint matching "${sg.check.hintPattern}"`, miss])
			}
			if (sg.check?.file) {
				const p = path.join(dir, sg.check.file)
				const src = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
				const m = src.match(new RegExp(`${sg.check.allowlistConst}\\s*=\\s*\\[([^\\]]*)\\]`))
				if (!m) broken.push([sg.id, `${sg.check.file} has no ${sg.check.allowlistConst} allowlist`, []])
				else {
					const allowed = new Set([...m[1].matchAll(/['"]([a-z0-9]+)['"]/gi)].map((x) => x[1].toLowerCase()))
					const used = new Set(covered.flatMap((e) => [...e.msgid.matchAll(TAG_RE)].map((x) => x[1].toLowerCase())))
					const extra = [...used].filter((t) => !allowed.has(t))
					if (extra.length) broken.push([sg.id, `tags not in the sanitizer allowlist: ${extra.join(', ')}`, []])
				}
			}
			if (sg.check?.tagBalance) {
				const bad = []
				for (const [lang, tr] of Object.entries(translations)) {
					for (const e of covered) {
						const v = tr[l10nKey(e)]
						const vals = Array.isArray(v) ? v : [v]
						for (const x of vals) if (typeof x === 'string' && x && x !== e.msgid && !sameTags(e.msgid, x)) bad.push({ lang, e })
					}
				}
				if (bad.length) broken.push([sg.id, `${bad.length} translations do not keep the source's tags (${[...new Set(bad.map((b) => b.lang))].join(', ')})`, bad.map((b) => b.e), bad])
			}
		}
		if (broken.length) {
			for (const [id, text, list, extra] of broken) {
				const sg = (ex.safeguards || []).find((s) => s.id === id)
				A.add('L14', { sev: 'fail', level: 'should', severity: sg?.check?.hintPattern ? 'translators' : 'users', key: `L14|safeguard|${id}`, msg: `exception does not apply, safeguard "${id}" broken: ${text}`, examples: (extra || list).slice(0, 12).map((x) => (x.lang ? `${x.lang}: ${short(x.e.msgid, 90)}` : short(x.msgid, 120))) })
			}
		} else {
			A.add('L14', { sev: 'exception', msg: `${covered.length} strings with markup covered by the recorded exception (${ex.reason ? short(ex.reason, 120) : ''}); all safeguards hold` })
		}
	}
	A.note('L14', `${html.length} POT entries contain HTML markup.`)

	// L24 on the committed translations
	const RTL_OK = new Set(['ar', 'fa', 'he', 'ps', 'ug', 'ur_PK'])
	const RTL = /[\u061C\u0623\u200E\u200F\u202A-\u202E\u2066-\u2069\u206C\u206D]/
	let n = 0
	for (const [lang, tr] of Object.entries(translations)) {
		if (tr.__parseError) { A.add('L24', { sev: 'fail', msg: `${lang}.json does not parse: ${tr.__parseError}` }); continue }
		for (const [k, v] of Object.entries(tr)) {
			for (const x of Array.isArray(v) ? v : [v]) {
				if (typeof x !== 'string') continue
				n++
				if (x.includes('|')) A.add('L24', { sev: 'fail', key: `L24|pipe|${lang}|${k}`, msg: `${lang}: pipe character in a translation`, detail: short(x, 100) })
				if (!RTL_OK.has(lang) && RTL.test(x)) A.add('L24', { sev: 'fail', key: `L24|rtl|${lang}|${k}`, msg: `${lang}: RTL-limited character in a non-RTL language`, detail: short(x, 100) })
				if (lang === 'de' && x.includes('Benötigt keine Übersetzung. Hier wird nur die formelle Übersetzung verwendet (de_DE).')) A.add('L24', { sev: 'fail', key: `L24|de|${k}`, msg: 'de: false "do not translate" hint', detail: short(k, 80) })
			}
		}
	}
	A.note('L24', `${Object.keys(translations).length} language files, ${n} translated values, read from \`${ctx.translationsFrom}\`.`)
}

// --- L18 spell check --------------------------------------------------------------------------
function speller(kind) {
	if (kind === 'none') return null
	if ((kind === 'auto' || kind === 'macos') && process.platform === 'darwin' && has('swiftc')) {
		const bin = path.join(CACHE, 'spell-macos')
		const src = path.join(HERE, 'spell-macos.swift')
		if (!fs.existsSync(bin) || fs.statSync(bin).mtimeMs < fs.statSync(src).mtimeMs) {
			fs.mkdirSync(CACHE, { recursive: true })
			const r = spawnSync('swiftc', ['-O', '-o', bin, src], { encoding: 'utf8' })
			if (r.status !== 0) throw new Error(`swiftc failed: ${r.stderr}`)
		}
		return { name: 'macOS NSSpellChecker (en_US)', run: (file) => spawnSync(bin, [file], { encoding: 'utf8' }).stdout }
	}
	if ((kind === 'auto' || kind === 'hunspell') && has('hunspell')) {
		return {
			name: 'hunspell (en_US)',
			run: (file) => {
				const out = spawnSync('hunspell', ['-d', 'en_US', '-l', file], { encoding: 'utf8' }).stdout
				const c = {}
				for (const w of out.split('\n').filter(Boolean)) c[w] = (c[w] || 0) + 1
				return Object.entries(c).map(([w, n]) => `${n}\t${w}`).join('\n')
			},
		}
	}
	if (kind !== 'auto') throw new Error(`speller "${kind}" is not available`)
	return null
}

function checkSpelling(A, ctx) {
	const sp = speller(ctx.spellerKind)
	if (!sp) { A.add('L18', { sev: 'review', origin: 'anna', key: 'L18|nospeller', msg: 'no spell checker available: spelling not checked' }); return }
	const lines = ctx.pot.flatMap((e) => [e.msgid, e.plural].filter((x) => x !== null)).map((s) => stripForWords(s).replace(/https?:\/\/\S+|\S+@\S+\.\S+|\.[a-z0-9]{2,4}\b/gi, ' ').replace(/\n/g, ' '))
	const tmp = path.join(ctx.base, 'spell.txt')
	fs.writeFileSync(tmp, lines.join('\n'))
	const unknown = sp.run(tmp).split('\n').filter(Boolean).map((l) => l.split('\t')).filter(([, w]) => w && !ctx.wordlist.has(w) && !/\d/.test(w))
	for (const [count, w] of unknown) {
		const ex = ctx.pot.find((e) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(e.msgid))
		A.add('L18', { sev: 'review', origin: 'anna', key: `L18|${w}`, msg: `unknown word "${w}" (${count}×): fix it, or add it to wordlist.txt if it is a name or term`, detail: ex ? short(ex.msgid) : '', where: ex ? refOf(ex) : '' })
	}
	A.note('L18', `Spell check: ${sp.name}; ${unknown.length} unknown word(s) after the word list.`)
}

// --- stability ------------------------------------------------------------------------------
function keySet(pot) { return new Set(pot.map(l10nKey)) }

// A removed string with a close NEW counterpart was rewritten: translators must translate it again.
// One with a close EXISTING counterpart was merged into a string that is already translated. One
// with neither was dropped with its feature. Merged and dropped strings orphan translations that
// go unused, but create no new work. Plural keys compare by their singular; placeholders and
// ellipses are normalised, so t() → n() and {count} → %n count as rewrites.
const REWRITE_SIMILARITY = 0.8
const normForMatch = (k) => {
	const m = /^_([\s\S]*)_::_[\s\S]*_$/.exec(k)
	return (m ? m[1] : k).replace(PLACEHOLDER_RE, '#').replace(/…/g, '...').replace(/\s+/g, ' ').trim().toLowerCase()
}
function bigrams(s) {
	const m = new Map()
	for (let i = 0; i < s.length - 1; i++) { const b = s.slice(i, i + 2); m.set(b, (m.get(b) || 0) + 1) }
	return m
}
function dice(a, b) {
	if (a === b) return 1
	if (a.length < 2 || b.length < 2) return 0
	const A = bigrams(a)
	const B = bigrams(b)
	let both = 0
	for (const [g, n] of A) both += Math.min(n, B.get(g) || 0)
	return (2 * both) / (a.length - 1 + b.length - 1)
}
function closest(k, keys, normed) {
	const n = normForMatch(k)
	let best = 0
	let to = null
	normed.forEach((c, i) => {
		if (Math.abs(c.length - n.length) > Math.max(3, n.length * 0.5)) return
		const d = dice(n, c)
		if (d > best) { best = d; to = keys[i] }
	})
	return { to, score: Math.round(best * 100) / 100 }
}
function splitRemoved(removed, added, kept) {
	const addedN = added.map(normForMatch)
	const keptN = kept.map(normForMatch)
	const rewritten = []
	const merged = []
	const dropped = []
	for (const k of removed) {
		const r = closest(k, added, addedN)
		if (r.score >= REWRITE_SIMILARITY) { rewritten.push({ from: k, ...r }); continue }
		const m = closest(k, kept, keptN)
		if (m.score >= REWRITE_SIMILARITY) merged.push({ from: k, ...m })
		else dropped.push(k)
	}
	return { rewritten, merged, dropped }
}

function orphanCost(removed, translations) {
	let n = 0
	const langs = new Set()
	const per = new Map()
	for (const [lang, tr] of Object.entries(translations)) {
		for (const k of removed) {
			if (isTranslated(k, tr[k])) { n++; langs.add(lang); per.set(k, (per.get(k) || 0) + 1) }
		}
	}
	return { n, langs: langs.size, per }
}

function checkStability(A, ctx) {
	const { steps } = ctx // [{ref, pot, translations}] oldest first, last = audited ref
	if (!steps || steps.length < 2) { A.notApplicable('L21', 'no previous release to compare with'); A.notApplicable('L22', 'no previous release to compare with'); return }
	const cmp = []
	for (let i = 1; i < steps.length; i++) {
		const a = steps[i - 1]
		const b = steps[i]
		const ka = keySet(a.pot)
		const kb = keySet(b.pot)
		const added = [...kb].filter((k) => !ka.has(k))
		const removed = [...ka].filter((k) => !kb.has(k))
		const { rewritten, merged, dropped } = splitRemoved(removed, added, [...kb].filter((k) => ka.has(k)))
		// the cost that counts is translations of rewritten strings: work translators must redo
		const cost = orphanCost(rewritten.map((x) => x.from), a.translations)
		const dropCost = orphanCost([...merged.map((x) => x.from), ...dropped], a.translations)
		cmp.push({ from: a.ref, to: b.ref, added: added.length, rewritten: rewritten.length, merged: merged.length, dropped: dropped.length, cost, dropCost, pairs: rewritten, mergedPairs: merged, droppedKeys: dropped })
	}
	// evidence for every count: which old string became which new one, and what was dropped
	A.stability = cmp.map((c) => ({ from: c.from, to: c.to, added: c.added, orphaned: c.cost.n, languages: c.cost.langs, rewritten: c.pairs.map((x) => ({ ...x, translations: c.cost.per.get(x.from) || 0 })), merged: c.mergedPairs.map((x) => ({ ...x, translations: c.dropCost.per.get(x.from) || 0 })), dropped: c.droppedKeys.map((k) => ({ msgid: k, translations: c.dropCost.per.get(k) || 0 })) }))
	for (const c of cmp) A.note('L21', `${c.from} → ${c.to}: ${c.added} new; ${c.rewritten} rewritten, orphaning ${c.cost.n} translations in ${c.cost.langs} languages; ${c.merged} merged into an existing string and ${c.dropped} dropped (${c.dropCost.n} translations no longer used, no new work).`)
	// earlier releases, judged by the same criteria, so the report shows the history and not only the latest step
	cmp.slice(0, -1).forEach((c, i) => {
		const prevC = i > 0 ? cmp[i - 1] : null
		const hist = []
		if (c.cost.n > 0 && prevC && prevC.cost.n > 0) hist.push(`L21 would fail: second release in a row that orphans translations (${prevC.to}: ${prevC.cost.n}, ${c.to}: ${c.cost.n})`)
		else if (c.cost.n > 0) hist.push(`L21 needs a declared batch: orphans ${c.cost.n} translations`)
		if (c.added > NEW_STRINGS_THRESHOLD) hist.push(`L22 needs an announcement: ${c.added} new strings`)
		if (hist.length) { A.note('L21', `History, ${c.to}: ${hist.join('; ')}.`); A.history.push(`${c.to}: ${hist.join('; ')}`) }
	})
	const last = cmp[cmp.length - 1]
	const before = cmp.length > 1 ? cmp[cmp.length - 2] : null
	const batch = findBatch(ctx.batches, last)
	if (batch.record) A.note('L21', `Declared batch in \`batches/${ctx.appid}.json\`: from ${batch.record.from}, ${batch.record.newStrings} new, ${batch.record.orphaned} orphaned, announced ${batch.record.announced}${batch.record.to ? ` to ${batch.record.to}` : ''}.`)
	else if (batch.why) A.note('L21', batch.why)
	const ask = `record it in \`batches/${ctx.appid}.json\` once the coordinator has been told`
	if (last.cost.n > 0) {
		const top = [...last.cost.per.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, n]) => `${n}× ${short(k, 90)}`)
		if (before && before.cost.n > 0) A.add('L21', { sev: 'fail', origin: 'anna', key: `L21|${last.from}..${last.to}`, msg: `two releases in a row orphan translations (${before.from} → ${before.to}: ${before.cost.n}; ${last.from} → ${last.to}: ${last.cost.n})`, examples: top })
		else if (!batch.record) A.add('L21', { sev: 'review', origin: 'anna', key: `L21|${last.from}..${last.to}`, msg: `${last.from} → ${last.to} rewrites ${last.rewritten} strings, orphaning ${last.cost.n} translations in ${last.cost.langs} languages, and is not a declared batch: ${ask}`, examples: top })
	}
	if (last.added > NEW_STRINGS_THRESHOLD && !batch.record) A.add('L22', { sev: 'review', origin: 'anna', key: `L22|${last.from}..${last.to}`, msg: `${last.from} → ${last.to} adds ${last.added} strings (threshold ${NEW_STRINGS_THRESHOLD}) and is not a declared batch: ${ask}` })
	else A.note('L22', `${last.from} → ${last.to} adds ${last.added} strings (threshold ${NEW_STRINGS_THRESHOLD}).`)
}

/**
 * The declared batch (batches/<appid>.json) that covers a step: same starting release, announced,
 * and counts at least as high as measured. Strings added after the announcement reopen the gate.
 */
function findBatch(batches, step) {
	const list = (batches?.batches || []).filter((b) => b.from === step.from)
	if (!list.length) return {}
	const announced = list.filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.announced || ''))
	if (!announced.length) return { why: `A batch from ${step.from} is recorded but has no \`announced\` date yet.` }
	const record = announced.find((b) => (b.newStrings ?? -1) >= step.added && (b.orphaned ?? -1) >= step.cost.n)
	if (record) return { record }
	const b = announced[announced.length - 1]
	return { why: `The batch from ${step.from} announced ${b.announced} covers ${b.newStrings} new and ${b.orphaned} orphaned; measured now: ${step.added} new and ${step.cost.n} orphaned. Announce the difference and update the record.` }
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

function render(A, ctx) {
	const L = []
	const verdicts = Object.keys(RULES).map((r) => [r, A.verdict(r)])
	L.push(`# Translation audit: ${ctx.appid} @ ${ctx.ref}`)
	L.push('')
	L.push(`Measured against [RULES.md](../../RULES.md) by \`l10n-audit.mjs\` ${TOOL_VERSION} on ${new Date().toISOString().slice(0, 10)}.`)
	L.push('')
	L.push('| | |')
	L.push('|---|---|')
	L.push(`| App | \`${ctx.appid}\` |`)
	L.push(`| Ref | \`${ctx.ref}\`${ctx.sha ? ` (\`${ctx.sha}\`)` : ''} |`)
	L.push(`| Extraction | Nextcloud translationtool.phar, docker-ci \`${DOCKER_CI_SHA.slice(0, 9)}\` |`)
	L.push(`| POT (translationtool) | ${ctx.pot.length} entries, ${ctx.pot.filter((e) => e.plural !== null).length} plurals, ${ctx.pot.filter((e) => e.hint).length} with a real hint |`)
	L.push(`| Translations from | \`${ctx.translationsFrom}\` (${Object.keys(ctx.translations).length} languages) |`)
	L.push(`| In Weblate since (import) | ${ctx.onboarded || 'no'} |`)
	if (ctx.steps?.length > 1) L.push(`| Compared with | ${ctx.steps.slice(0, -1).map((s) => `\`${s.ref}\``).join(', ')} |`)
	L.push(`| Reviews applied | ${ctx.reviewsMeta || 'none'} |`)
	if (ctx.gate) {
		const b = A.blocking(ctx.gate)
		L.push(`| Gate \`${ctx.gate}\` | **${b.length ? `FAIL, ${b.length} blocking` : 'PASS'}** |`)
	}
	L.push('')
	L.push('## By severity')
	L.push('')
	L.push('Severity is what a finding does, not the level of its rule. Only Serious findings can block a gate.')
	L.push('')
	L.push('| Severity | Meaning | Fail | Open |')
	L.push('|---|---|---|---|')
	const all = Object.values(A.findings).flat()
	for (const [k, label, meaning] of SEVERITIES) {
		L.push(`| ${label} | ${meaning} | ${all.filter((f) => f.severity === k && f.sev === 'fail').length} | ${all.filter((f) => f.severity === k && f.sev === 'review').length} |`)
	}
	if (ctx.gate) {
		const b = A.blocking(ctx.gate)
		L.push('')
		L.push(b.length ? `Blocking the \`${ctx.gate}\` gate (${b.length}):` : `Nothing blocks the \`${ctx.gate}\` gate.`)
		if (b.length) {
			L.push('')
			for (const [r, f] of b.slice(0, MAX_LISTED)) L.push(`- ${r}: ${f.msg}${f.where ? ` · \`${f.where}\`` : ''}${f.detail ? ` · "${cell(f.detail)}"` : ''}`)
			if (b.length > MAX_LISTED) L.push(`- … and ${b.length - MAX_LISTED} more (see the JSON report)`)
		}
	}
	L.push('')
	L.push("## Nextcloud's 11 points")
	L.push('')
	L.push("Nextcloud's list of 2026-11-16 (RULES.md §4). The route is now VoxCloud's Weblate, so the Transifex and bot parts of points 9 and 11 no longer apply.")
	L.push('')
	L.push('| # | Point | Verdict | Rules |')
	L.push('|---|---|---|---|')
	for (const [n, title, rules] of ANNA_POINTS) {
		const hist = n === 10 && A.history.length ? ` (at this release; earlier: ${A.history.map(cell).join(' · ')})` : ''
		L.push(`| ${n} | ${title} | **${A.annaVerdict(rules)}**${hist} | ${rules.map((r) => `${r} ${A.verdict(r)}`).join(', ')} |`)
	}
	L.push('')
	L.push('Met: every MUST rule mapped to the point is PASS, EXCEPTION or N/A. Not met: at least one fails. Open: a candidate still needs a verdict. Vox rules and SHOULD rules never decide a point.')
	L.push('')
	L.push('## Rules')
	L.push('')
	L.push('| Rule | Title | Origin | Verdict | Worst severity | Fail (MUST) | Remarks (SHOULD/Vox) | Open | Reviewed ok |')
	L.push('|---|---|---|---|---|---|---|---|---|')
	for (const [r, v] of verdicts) {
		const f = A.findings[r]
		const c = (fn) => f.filter(fn).length
		const live = f.filter((x) => x.sev === 'fail' || x.sev === 'review').map((x) => x.severity).sort((x, y) => SEVERITY_RANK[x] - SEVERITY_RANK[y])
		L.push(`| [${r}](#${r.toLowerCase()}) | ${RULES[r][0]} | ${RULES[r][1]} | **${v}** | ${live.length ? SEVERITY_LABEL[live[0]] : '-'} | ${c((x) => x.sev === 'fail' && x.level === 'must')} | ${c((x) => x.sev === 'fail' && x.level === 'should')} | ${c((x) => x.sev === 'review')} | ${c((x) => x.sev === 'ok')} |`)
	}
	L.push('')
	L.push('## Details')
	for (const [r, v] of verdicts) {
		L.push('')
		L.push(`### ${r}`)
		L.push('')
		L.push(`**${RULES[r][0]}** · ${RULES[r][1]} · **${v}**${A.na[r] ? `: ${A.na[r]}` : ''}`)
		for (const n of A.notes[r]) { L.push(''); L.push(`- ${n}`) }
		const lastStep = r === 'L21' && A.stability?.length ? A.stability[A.stability.length - 1] : null
		if (lastStep && (lastStep.rewritten.length || lastStep.merged.length || lastStep.dropped.length)) {
			const byTr = (x, y) => y.translations - x.translations
			L.push('')
			L.push(`Rewritten, ${lastStep.from} → ${lastStep.to} (old → closest new string, similarity, translations orphaned):`)
			L.push('')
			for (const x of [...lastStep.rewritten].sort(byTr).slice(0, 20)) L.push(`- "${cell(short(x.from, 70))}" → "${cell(short(x.to, 70))}" · ${x.score} · ${x.translations}`)
			if (lastStep.rewritten.length > 20) L.push(`- … and ${lastStep.rewritten.length - 20} more (see the JSON report)`)
			if (lastStep.merged.length) {
				L.push('')
				L.push('Merged into a string that already existed (old → existing string, similarity, translations no longer used):')
				L.push('')
				for (const x of [...lastStep.merged].sort(byTr).slice(0, 20)) L.push(`- "${cell(short(x.from, 70))}" → "${cell(short(x.to, 70))}" · ${x.score} · ${x.translations}`)
			}
			if (lastStep.dropped.length) {
				L.push('')
				L.push('Dropped, no similar string left (translations no longer used):')
				L.push('')
				for (const x of [...lastStep.dropped].sort(byTr).slice(0, 20)) L.push(`- "${cell(short(x.msgid, 90))}" · ${x.translations}`)
				if (lastStep.dropped.length > 20) L.push(`- … and ${lastStep.dropped.length - 20} more (see the JSON report)`)
			}
		}
		const groups = [['Fail (MUST)', (x) => x.sev === 'fail' && x.level === 'must'], ['Remarks (SHOULD or Vox)', (x) => x.sev === 'fail' && x.level === 'should'], ['Exception', (x) => x.sev === 'exception'], ['Open for review', (x) => x.sev === 'review'], ['Reviewed ok', (x) => x.sev === 'ok']]
		for (const [label, fn] of groups) {
			const list = A.findings[r].filter(fn)
			if (!list.length) continue
			L.push('')
			L.push(`${label} (${list.length}):`)
			L.push('')
			for (const f of list.slice(0, MAX_LISTED)) {
				const origin = f.origin === 'vox' ? ' _(Vox)_' : f.origin === 'anna' ? ' _(Anna)_' : ''
				const sevTag = f.sev === 'fail' || f.sev === 'review' ? ` [${SEVERITY_LABEL[f.severity]}]` : ''
				let line = `- ${f.msg}${origin}${sevTag}${f.where ? ` · \`${f.where}\`` : ''}${f.detail ? ` · "${cell(f.detail)}"` : ''}`
				if (f.reviewed?.note) line += ` · review: ${cell(f.reviewed.note)}`
				L.push(line)
				for (const e of f.examples || []) L.push(`  - ${cell(e)}`)
			}
			if (list.length > MAX_LISTED) L.push(`- … and ${list.length - MAX_LISTED} more (see the JSON report)`)
		}
	}
	const open = Object.values(A.findings).flat().filter((f) => f.sev === 'review' && f.key)
	if (open.length) {
		L.push('')
		L.push('## Open review keys')
		L.push('')
		L.push(`Record a verdict per key in \`audit/reviews/${ctx.appid}.json\` (\`"verdict": "ok" | "fail"\`, with a note).`)
		L.push('')
		L.push('<details><summary>' + open.length + ' keys</summary>')
		L.push('')
		L.push('```')
		for (const f of open) L.push(f.key)
		L.push('```')
		L.push('')
		L.push('</details>')
	}
	return L.join('\n') + '\n'
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------
async function main() {
	const a = parseArgs(process.argv.slice(2))
	for (const bin of ['git', 'tar', 'php', 'xgettext']) if (!has(bin)) throw new Error(`${bin} is required`)
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vox-l10n-audit-')))
	const phar = ensureDockerCi(a.dockerCi)
	const A = new Audit()
	const ctx = { base, offline: a.offline, spellerKind: a.speller, wordlist: loadWordlist(a.rulesDir), gate: a.gate }
	try {
		if (a.dir) {
			ctx.isDir = true
			ctx.dir = copyDir(a.dir, base)
			ctx.ref = path.basename(a.dir)
		} else {
			ctx.repo = a.app
			const tags = releaseTags(a.app)
			ctx.ref = a.ref || tags[tags.length - 1]
			if (!ctx.ref) throw new Error('no release tag found; pass --ref')
			ctx.sha = gitOut(a.app, ['rev-parse', '--short=9', `${ctx.ref}^{commit}`]).trim()
			ctx.dir = exportRef(a.app, ctx.ref, base)
			// previous releases for L21/L22: the release tags before the audited ref
			const isTag = tags.includes(ctx.ref)
			const before = isTag ? tags.slice(0, tags.indexOf(ctx.ref)) : tags.filter((t) => git(a.app, ['merge-base', '--is-ancestor', t, ctx.ref]).status === 0)
			// the pr gate leaves stability to the release gate, so it skips the costly earlier exports
			ctx.prevRefs = a.gate === 'pr' ? [] : a.prev ? [a.prev2, a.prev].filter(Boolean) : before.slice(-4)
		}
		ctx.appid = appIdOf(ctx.dir)
		ctx.ignore = readIgnore(ctx.dir)
		const main_ = botExtract(ctx.dir, ctx.appid, phar, true)
		ctx.pot = main_.entries
		ctx.warnings = main_.warnings
		ctx.botFiles = sourceFiles(ctx.dir, ctx.ignore)
		ctx.files = ctx.botFiles.filter(isShipped)
		ctx.translations = readL10nDir(path.join(ctx.dir, 'l10n'))
		ctx.translationsFrom = `${ctx.ref}:l10n/`
		ctx.exceptions = loadJson(path.join(a.rulesDir, 'exceptions', `${ctx.appid}.json`), {})
		ctx.batches = loadJson(path.join(a.rulesDir, 'batches', `${ctx.appid}.json`), null)
		const reviews = loadJson(path.join(a.rulesDir, 'audit', 'reviews', `${ctx.appid}.json`), null)
		if (reviews) ctx.reviewsMeta = `${Object.keys(reviews.items || {}).length} verdicts by ${reviews.reviewer || '?'} (${reviews.date || '?'})`

		if (ctx.prevRefs?.length) {
			ctx.steps = []
			for (const r of ctx.prevRefs) {
				const d = exportRef(a.app, r, base)
				ctx.steps.push({ ref: r, pot: botExtract(d, ctx.appid, phar, false).entries, translations: readL10nDir(path.join(d, 'l10n')) })
			}
			ctx.steps.push({ ref: ctx.ref, pot: ctx.pot, translations: ctx.translations })
		}

		checkSetup(A, ctx)
		checkWeblateHistory(A, ctx)
		checkMaintainer(A, ctx)
		checkExtraction(A, ctx)
		checkCandidates(A, ctx)
		checkStrings(A, ctx)
		checkMarkupAndTranslations(A, ctx)
		checkSpelling(A, ctx)
		if (a.gate === 'pr') for (const r of ['L21', 'L22']) A.notApplicable(r, 'left to `--gate release`')
		else checkStability(A, ctx)
		A.add('L25', { sev: 'review', origin: 'vox', key: 'L25|manual', msg: 'not measurable by the tool: how people work in Weblate (RULES.md L25)' })
		if (ctx.inWeblate) A.notApplicable('L26', 'the app is in Weblate')
		else A.add('L26', { sev: 'review', origin: 'vox', key: 'L26|freeze', msg: 'not in Weblate yet: no changes to translations (l10n/<lang>.js|json, translationfiles/<lang>/) until the import (RULES.md L26)' })
		A.notApplicable('L27', 'checked once, in the import pull request (CHECKLIST.md C)')
		if (reviews) A.applyReviews(reviews.items || {})

		const md = render(A, ctx)
		if (a.out) { fs.mkdirSync(path.dirname(a.out), { recursive: true }); fs.writeFileSync(a.out, md) }
		if (a.json) {
			fs.mkdirSync(path.dirname(a.json), { recursive: true })
			fs.writeFileSync(a.json, JSON.stringify({
				tool: TOOL_VERSION, dockerCi: DOCKER_CI_SHA, app: ctx.appid, ref: ctx.ref, sha: ctx.sha, date: new Date().toISOString(),
				potEntries: ctx.pot.length,
				verdicts: Object.fromEntries(Object.keys(RULES).map((r) => [r, A.verdict(r)])),
				anna: Object.fromEntries(ANNA_POINTS.map(([n, , rules]) => [n, A.annaVerdict(rules)])),
				gate: a.gate ? { mode: a.gate, blocking: A.blocking(a.gate).map(([rule, f]) => ({ rule, key: f.key, msg: f.msg, where: f.where, detail: f.detail })) } : null,
				findings: A.findings, notes: A.notes, na: A.na, stability: A.stability || null,
			}, null, 2))
		}
		const say = a.out ? console.log : console.error // keep stdout clean when it carries the report
		if (!a.out) process.stdout.write(md)
		else {
			const rows = Object.keys(RULES).map((r) => `${r} ${A.verdict(r)}`)
			say(`${ctx.appid} @ ${ctx.ref}: ${rows.join(' · ')}`)
			say(`Nextcloud points: ${ANNA_POINTS.map(([n, , rules]) => `${n}=${A.annaVerdict(rules)}`).join(' ')}`)
		}
		const mustFail = Object.keys(RULES).some((r) => A.verdict(r) === 'FAIL')
		let exit = a.strict && mustFail ? 1 : 0
		if (a.gate) {
			const b = A.blocking(a.gate)
			say(`Gate ${a.gate}: ${b.length ? `FAIL, ${b.length} blocking finding(s)` : 'PASS'}`)
			const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
			for (const [r, f] of b) {
				say(`  ${r} ${f.msg}${f.where ? ` (${f.where})` : ''}${f.detail ? `: ${f.detail}` : ''}`)
				// GitHub-compatible annotation, so the line shows up on the pull request
				if (process.env.GITHUB_ACTIONS === 'true') {
					const m = /^(.+):(\d+)$/.exec(f.where || '')
					console.log(`::error ${m ? `file=${esc(m[1])},line=${m[2]},` : ''}title=${r} (translation rules)::${esc(`${f.msg}${f.detail ? `: ${f.detail}` : ''}`)}`)
				}
			}
			if (b.length) exit = 1
		}
		process.exitCode = exit
	} finally {
		if (!a.keep) fs.rmSync(base, { recursive: true, force: true })
		else console.error(`kept ${base}`)
	}
}

// l10n-sync.mjs reuses the pinned translationtool and the export helpers, so there is one place
// that decides how Nextcloud's extraction runs.
export { DOCKER_CI_SHA, appIdOf, copyDir, ensureDockerCi, parsePot, realHint, unescapePo }

// Run only when started directly (node l10n-audit.mjs …), not when another script imports it.
const startedDirectly = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))
if (startedDirectly) main().catch((e) => { console.error(e.stack || String(e)); process.exit(2) })
