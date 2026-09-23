#!/usr/bin/env node
/**
 * Extract translatable strings into l10n/en.json — the canonical English source
 * that scripts/generate-pot.js turns into translationfiles/templates/introvox.pot.
 *
 * Why this exists: en.json is the source-of-truth for frontend (Vue/JS) strings,
 * but the Nextcloud Transifex sync-bot deletes it from the repo after each sync
 * (it is a build artifact, gitignored). It therefore has to be regenerated from
 * the code before every POT round. This script does that deterministically by
 * scanning the source for translation calls, so en.json is never hand-edited or
 * restored from git.
 *
 * What it scans:
 *   - src/**\/*.{vue,js}   t('introvox', '…')   this.t('…')   $t('…')   this.$t('…')
 *                          trans('…')  — the local wrapper in admin/AdminApp.vue
 *                          n('introvox', 's', 'p', …)   this.n(…)   $n('s', 'p', …)
 *   - lib/**\/*.php        ->t('…')             ->n('…', '…', …)            $l->t('…')
 *   - templates/**\/*.php  same PHP forms (personal.php / admin.php)
 *
 * Note: $t/$n are the Vue global-alias forms (bound to the appId, so they carry
 * NO 'introvox' first arg). IntroVox does not install such an alias today; the
 * patterns are kept so the extractor stays correct if one is ever added.
 *
 * Output structure (matches the NC bot's en.json exactly):
 *   { "translations": { "<msgid>": "<msgid>", "<singular>": ["<singular>", "<plural>"] } }
 *
 * Singular values map to themselves; plural entries map to a [singular, plural]
 * array — generate-pot.js already expects exactly this shape.
 *
 * This module also exports computeSourceStrings() so scripts/check-l10n-sync.js
 * can compute the exact same source-string set without a second copy of the
 * extraction regexes.
 *
 * Usage: node scripts/extract-en-json.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'l10n', 'en.json');
const COUNT = path.join(ROOT, 'l10n', '.source-count.json');
const MANIFEST = path.join(ROOT, 'l10n', '.source-strings.json');

// A single-quoted JS/PHP string literal, allowing backslash escapes
// (e.g. \' and \\). Captured group 1 is the raw, still-escaped contents.
const STR = "'((?:[^'\\\\]|\\\\.)*)'";

// Translation-call patterns. Each yields singular (and plural where present).
//
// Two families:
//   1. t()/n()  — optional 'introvox' first arg. Forms: t('introvox','…'),
//      this.t('…'), $l->t('…'), ->t('…'), ->n('…','…').
//   2. $t()/$n() — Vue global aliases, string is the FIRST arg (no 'introvox').
//      Forms: $t('…'), this.$t('…'), $n('s','p',…).
//
// The (?<![\w$]) lookbehind before family 1 stops us matching the trailing `t`
// of an identifier (impor`t(`) or method (spli`t(`). Family 2 anchors on the
// literal `$t(`/`$n(` token, which can't be a false positive.
const T_PREFIX = `(?:this\\.|\\$\\w+->|->)?`;

// The app id is never a translatable string.
//
// The `'introvox',` prefix is optional in the patterns below, because both
// `t('text')` and `t('introvox', 'text')` are valid call forms. That makes a
// bare `t('introvox'` match too, capturing the app id itself as the string —
// and the extractor reads source as plain text, so it cannot tell code from a
// comment. Five comment lines explaining the `t('introvox', …)` convention
// therefore put a meaningless "introvox" entry on Transifex, shown to
// translators in every language.
const APP_ID = 'introvox';

// Nor is any OTHER app id a translatable string. The extractor reads source as
// plain text and cannot tell code from a comment, so a prose mention of
// `t('core', ...)` (wizardSteps.js explains how core renders aria-labels) would
// otherwise land "core" on Transifex as a msgid. Any bare app-id-shaped match
// is dropped: real UI strings are never a single lowercase word.
const APP_ID_LIKE = /^[a-z][a-z0-9_]*$/;
function isAppId(s) {
	return s === APP_ID || APP_ID_LIKE.test(s);
}

// Factory functions so every caller gets fresh, non-shared RegExp instances
// (a shared /g regex carries lastIndex state between files).
function makeRegexes() {
	return {
		T_RE: new RegExp(`(?<![\\w$])${T_PREFIX}t\\(\\s*(?:'introvox'\\s*,\\s*)?${STR}`, 'g'),
		N_RE: new RegExp(`(?<![\\w$])${T_PREFIX}n\\(\\s*(?:'introvox'\\s*,\\s*)?${STR}\\s*,\\s*${STR}`, 'g'),
		DT_RE: new RegExp(`(?:this\\.)?\\$t\\(\\s*${STR}`, 'g'),
		DN_RE: new RegExp(`(?:this\\.)?\\$n\\(\\s*${STR}\\s*,\\s*${STR}`, 'g'),
		// Named wrapper. src/admin/AdminApp.vue exposes `trans` as `t`, so its
		// <script> calls read trans('introvox', '…') while T_RE's (?<![\w$])
		// lookbehind rejects the `t` inside that longer identifier (the same
		// rule that keeps spli`t(` and impor`t(` out). The app id is optional
		// here for the same reason it is in T_RE: both call forms are valid,
		// and isAppId() drops a bare id that slips through.
		W_RE: new RegExp(`(?<![\\w$])trans\\(\\s*(?:'introvox'\\s*,\\s*)?${STR}`, 'g'),
	};
}

// Find a `// TRANSLATORS: …` comment attached to the translation call that
// starts at `index`. gettext convention: the comment sits on the line(s)
// directly above the call, or inline earlier on the same line. Only
// immediately-preceding comment lines count — a blank line or any code between
// the comment and the call breaks the association, so an unrelated comment
// further up is never picked up.
//
// Consecutive `// TRANSLATORS:`/continuation lines are joined into one comment,
// which generate-pot.js emits as `#.` lines in the POT. Transifex shows those
// as the developer comment on the string.
// Two comment syntaxes, because a `.vue` file has two languages in it:
//   <script>   // TRANSLATORS: …
//   <template> <!-- TRANSLATORS: … -->
// A `//` inside a template is NOT a comment — Vue renders it as literal text —
// so template strings can only be annotated with the HTML form. Note that an
// HTML comment may not sit between an element's attributes (the Vue compiler
// rejects it), so for a t() call in an attribute put the comment on the line
// directly above that attribute's own line is impossible — annotate such
// strings from <script> instead, or accept the element-level placement only
// when the element has a single translatable attribute.
const TRANSLATORS_RE = /^\s*(?:\/\/|<!--)\s*TRANSLATORS:\s?(.*?)\s*(?:-->)?$/;

function findTranslatorComment(content, index) {
	// Walk backwards over the lines above the call.
	const before = content.slice(0, index);
	const lines = before.split('\n');
	// lines[lines.length-1] is the partial line the call sits on; anything before
	// the call on that same line may itself be the comment (inline form).
	const sameLine = lines[lines.length - 1];
	const inline = sameLine.match(TRANSLATORS_RE);
	if (inline) return inline[1].trim();
	// Otherwise only a comment on the immediately preceding line(s) attaches.
	const parts = [];
	for (let i = lines.length - 2; i >= 0; i--) {
		const m = lines[i].match(TRANSLATORS_RE);
		if (m) {
			parts.unshift(m[1].trim());
			continue;
		}
		break; // any non-TRANSLATORS line ends the block
	}
	return parts.length ? parts.join(' ').trim() : null;
}

// Un-escape a captured single-quoted literal into its real string value.
function unescapeLiteral(raw) {
	return raw.replace(/\\(['\\nt])/g, (_, ch) => {
		if (ch === 'n') return '\n';
		if (ch === 't') return '\t';
		return ch; // \' -> '   \\ -> \
	});
}

// Recursively collect files under dir matching one of the extensions.
function walk(dir, exts, acc = []) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (e) {
		return acc;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'node_modules' || entry.name === '.git') continue;
			walk(full, exts, acc);
		} else if (exts.some(ext => entry.name.endsWith(ext))) {
			acc.push(full);
		}
	}
	return acc;
}

/**
 * Scan src/ + lib/ for translation calls and return the deterministic source
 * string set. Single source of truth for both the POT extractor (this file's
 * CLI) and the prebuild guard (check-l10n-sync.js).
 *
 * @returns {{ singulars: string[], plurals: [string,string][], files: string[], comments: Map<string,string> }}
 *   singulars and plurals are sorted (localeCompare); a string used in n() is a
 *   plural pair and never also appears in singulars. `comments` maps a msgid to
 *   its `// TRANSLATORS:` comment (generate-pot.js emits these as POT `#.`
 *   lines, which Transifex shows as the string's developer comment).
 */
function computeSourceStrings() {
	const singulars = new Set();
	const plurals = new Map(); // singular -> plural
	const comments = new Map(); // msgid -> TRANSLATORS comment

	// PHP strings live in BOTH lib/ and templates/ — templates/personal.php and
	// admin.php carry 10 user-visible $l->t() strings. Scanning only lib/ would
	// silently drop them from the POT.
	const files = [
		...walk(path.join(ROOT, 'src'), ['.vue', '.js']),
		...walk(path.join(ROOT, 'lib'), ['.php']),
		...walk(path.join(ROOT, 'templates'), ['.php']),
	];

	for (const file of files) {
		const content = fs.readFileSync(file, 'utf8');
		const { T_RE, N_RE, DT_RE, DN_RE, W_RE } = makeRegexes();

		// Plurals first so we can record the pairing; their singular also counts.
		let m;
		for (const re of [N_RE, DN_RE]) {
			while ((m = re.exec(content)) !== null) {
				const sing = unescapeLiteral(m[1]);
				const plur = unescapeLiteral(m[2]);
				if (sing && !isAppId(sing)) {
					plurals.set(sing, plur);
					const c = findTranslatorComment(content, m.index);
					if (c && !comments.has(sing)) comments.set(sing, c);
				}
			}
		}

		for (const re of [T_RE, DT_RE, W_RE]) {
			while ((m = re.exec(content)) !== null) {
				const s = unescapeLiteral(m[1]);
				if (s && !isAppId(s)) {
					singulars.add(s);
					const c = findTranslatorComment(content, m.index);
					if (c && !comments.has(s)) comments.set(s, c);
				}
			}
		}
	}

	// Plurals take precedence: a string used in n() is an array entry, not a bare
	// singular, so drop it from the singular set to avoid a duplicate key clash.
	for (const sing of plurals.keys()) {
		singulars.delete(sing);
	}

	const sortedSingulars = [...singulars].sort((a, b) => a.localeCompare(b));
	const sortedPlurals = [...plurals.keys()]
		.sort((a, b) => a.localeCompare(b))
		.map(s => [s, plurals.get(s)]);

	return { singulars: sortedSingulars, plurals: sortedPlurals, files, comments };
}

/**
 * The canonical, order-stable list of every source msgid (singulars + the
 * singular form of each plural), and its sha256. This is what the manifest and
 * the guard compare on — durable across POT deletes by the bot.
 *
 * @param {{singulars:string[], plurals:[string,string][]}} src
 * @returns {{ msgids: string[], sha256: string, count: number }}
 */
function sourceStringManifest(src) {
	const msgids = [...src.singulars, ...src.plurals.map(([s]) => s)]
		.sort((a, b) => a.localeCompare(b));
	const sha256 = crypto.createHash('sha256')
		.update(JSON.stringify(msgids))
		.digest('hex');
	return { msgids, sha256, count: msgids.length };
}

module.exports = { computeSourceStrings, sourceStringManifest };

// ---- CLI ----
if (require.main === module) {
	const src = computeSourceStrings();

	// Build the translations object, sorted for deterministic output.
	const translations = {};
	for (const s of src.singulars) {
		translations[s] = s;
	}
	for (const [s, p] of src.plurals) {
		translations[s] = [s, p];
	}

	const out = { translations, pluralForm: 'nplurals=2; plural=(n != 1);' };
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, JSON.stringify(out, null, 4) + '\n');

	// Committed count file — the runtime denominator for the admin "translation
	// coverage" percentage (l10n/en.json is a gitignored build artifact absent on
	// the server, so the total lives here instead).
	const sourceStrings = src.singulars.length + src.plurals.length;
	fs.writeFileSync(COUNT, JSON.stringify({ sourceStrings }, null, 4) + '\n');

	// Committed source-string manifest — the durable record of exactly which
	// msgids the Transifex bot has been given. scripts/check-l10n-sync.js fails
	// the build if the code's set no longer matches this, i.e. strings were added
	// without pushing them to Transifex (npm run l10n:push). The full sorted list
	// is stored (not just the hash) so every git diff shows what entered/left.
	const manifest = sourceStringManifest(src);
	fs.writeFileSync(MANIFEST, JSON.stringify({
		count: manifest.count,
		sha256: manifest.sha256,
		strings: manifest.msgids,
	}, null, 4) + '\n');

	console.log(`Extracted ${src.singulars.length} singular + ${src.plurals.length} plural strings`);
	console.log(`Scanned ${src.files.length} files`);
	console.log(`Wrote ${path.relative(ROOT, OUT)}`);
	console.log(`Wrote ${path.relative(ROOT, COUNT)} (sourceStrings=${sourceStrings})`);
	console.log(`Wrote ${path.relative(ROOT, MANIFEST)} (count=${manifest.count}, sha256=${manifest.sha256.slice(0, 12)}…)`);
}
