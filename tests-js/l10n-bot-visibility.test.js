/**
 * Simulate the Nextcloud Transifex extractor and fail if it would miss a string.
 *
 * This is the test that would have caught the real bug. Our own extractor is
 * deliberately permissive — it recognises every call form so the POT is
 * complete — but the POT we commit is NOT what reaches Transifex. The sync bot
 * runs `translationtool.phar create-pot-files`, which OVERWRITES our template
 * with its own extraction, pushes that, and deletes the file. Whatever its
 * extractor cannot see does not exist for translators, no matter how correct
 * our own tooling is.
 *
 * Verified against nextcloud/docker-ci (translations/handleAppsTranslations.sh
 * and translationtool/src/translationtool.php, read 2026-09-23). Two passes:
 *
 *   <template>  its own regex, matching  t('appid', '…')  literally
 *   <script>    spliced into a .js file and handed to
 *               xgettext --keyword=t:2 --keyword=n:2,3
 *
 * Both need the app id as the FIRST argument, and xgettext only knows the
 * keyword `t` — a helper named anything else is invisible to it. IntroVox had
 * `const trans = (key) => translate('introvox', key)` in admin/AdminApp.vue,
 * which failed both rules at once: 120 of 207 strings never reached Transifex,
 * and the entire admin UI stayed English in every language for three months.
 *
 * The rules this pins, for any new translation call:
 *   - name the helper `t` (or `n`), never `trans`, `$t` or `this.t`
 *   - pass 'introvox' explicitly at every call-site
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP_ID = 'introvox';

// translationtool.php collapses whitespace in a template match with PHP's
// preg_replace('/\s+/', ' '). PHP's \s is ASCII-only, so a U+00A0 survives it;
// JavaScript's \s also matches NBSP and would rewrite "Loading\u00a0…" to
// "Loading …", making strings that are present look missing. Six of ours carry
// a deliberate NBSP before an ellipsis (the Nextcloud punctuation guideline),
// so this distinction is not academic.
const collapsePhpWhitespace = (s) => s.replace(/[ \t\n\r\f\v]+/g, ' ');
const { computeSourceStrings } = require(path.join(ROOT, 'scripts/extract-en-json.js'));

// Collect .vue/.js under src/, honouring .l10nignore the way the bot does.
const IGNORED = fs.readFileSync(path.join(ROOT, '.l10nignore'), 'utf8')
	.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

const isIgnored = (rel) => IGNORED.some((pat) => {
	const clean = pat.replace(/\/$/, '');
	return rel === clean || rel.startsWith(clean + '/') || rel.split('/').includes(clean);
});

function walk(dir, acc = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, e.name);
		const rel = path.relative(ROOT, full);
		if (isIgnored(rel)) continue;
		if (e.isDirectory()) walk(full, acc);
		else if (/\.(vue|js)$/.test(e.name)) acc.push(full);
	}
	return acc;
}

/**
 * The bot's view of one file: which msgids its two passes would extract.
 *
 * The template regex is translationtool.php's own, transcribed. The script
 * pass approximates xgettext --keyword=t:2 by matching a call to a bare `t`
 * (or `n`) whose first argument is the app id — which is exactly the shape
 * xgettext's keyword spec accepts and all our code should use.
 */
function botSees(file) {
	const source = fs.readFileSync(file, 'utf8');
	const found = new Set();

	const templateMatch = source.match(/<template>([\s\S]+)<\/template>/);
	const scriptMatches = [...source.matchAll(/<script[^>]*>([\s\S]+?)<\/script>/g)];
	const isVue = file.endsWith('.vue');

	// <template>: translationtool.php's regex, but non-greedy on the string.
	//
	// The real one is `'(.+)'` — greedy, so two t() calls on one line collapse
	// into a single match spanning both. xgettext then still picks them up from
	// the <script>-side pass or, for a template-only string, gettext's own
	// scan of the fake file, so the bot does not actually lose them; checking
	// greedily here would report failures the bot does not have. Matching each
	// call separately is the stricter, useful reading: it asks whether every
	// individual call has the app id, which is the rule we care about.
	if (isVue && templateMatch) {
		const re = new RegExp(`\\Wt\\s*\\(\\s*'?([\\w.]+)'?,\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g');
		for (const m of templateMatch[1].matchAll(re)) {
			if (m[1] === APP_ID) found.add(collapsePhpWhitespace(m[2].replace(/\\'/g, "'")));
		}
	}

	// <script> (or a plain .js): xgettext with --keyword=t:2 / --keyword=n:2,3.
	const scripts = isVue ? scriptMatches.map((m) => m[1]) : [source];
	for (const body of scripts) {
		const re = new RegExp(`(?<![\\w$.])[tn]\\(\\s*'${APP_ID}'\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g');
		for (const m of body.matchAll(re)) {
			found.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
		}
	}
	return found;
}

describe('Transifex bot visibility', () => {
	const files = walk(path.join(ROOT, 'src'));
	const visible = new Set();
	for (const f of files) for (const s of botSees(f)) visible.add(s);

	// Our own extractor also scans lib/ and templates/, which the bot reads with
	// plain xgettext --keyword=t on PHP. Those forms are unambiguous, so this
	// test only has to police the JS/Vue side.
	const src = computeSourceStrings();
	const frontend = new Set();
	for (const f of files) {
		const body = fs.readFileSync(f, 'utf8');
		for (const s of [...src.singulars, ...src.plurals.map(([a]) => a)]) {
			if (body.includes(`'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)) frontend.add(s);
		}
	}

	test('the simulation finds something', () => {
		// Guard against a broken simulation passing everything vacuously.
		assert.ok(visible.size > 100, `bot simulation only found ${visible.size} strings`);
	});

	test('every frontend string is visible to the bot extractor', () => {
		const invisible = [...frontend].filter((s) => !visible.has(s)).sort();
		assert.deepEqual(invisible, [], invisible.length
			? `${invisible.length} string(s) the Transifex bot cannot see, so translators never get them:\n`
				+ invisible.slice(0, 20).map((s) => `      ${JSON.stringify(s.slice(0, 80))}`).join('\n')
				+ '\n\n  Fix: name the helper t/n and pass the app id first —'
				+ "\n  t('introvox', 'text'), not trans('text') or this.t('text')."
			: '');
	});

	test('no translation helper is named anything but t or n', () => {
		// The rule above, enforced at the source rather than by its symptom, so
		// a new wrapper is caught the moment it appears instead of when someone
		// notices a screen is English.
		const offenders = [];
		for (const f of files) {
			const body = fs.readFileSync(f, 'utf8');
			for (const m of body.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*(?:\{\s*return\s+)?translate(?:Plural)?\(/g)) {
				if (m[1] !== 't' && m[1] !== 'n') {
					offenders.push(`${path.relative(ROOT, f)}: const ${m[1]} = (…) => translate(…)`);
				}
			}
		}
		assert.deepEqual(offenders, [], offenders.length
			? 'translation helpers xgettext cannot see (it only knows the keywords t and n):\n'
				+ offenders.map((o) => `      ${o}`).join('\n')
			: '');
	});

	test('no call-site omits the app id', () => {
		// t('Some text') resolves fine at runtime through a wrapper, and is
		// invisible to both extractor passes. The first argument must be the
		// app id, so a literal that contains a space is a missing app id.
		const offenders = [];
		for (const f of files) {
			const body = fs.readFileSync(f, 'utf8');
			for (const m of body.matchAll(/(?<![\w$.'])[tn]\(\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g)) {
				if (m[1] !== APP_ID && /\s/.test(m[1])) {
					offenders.push(`${path.relative(ROOT, f)}: t('${m[1].slice(0, 50)}…')`);
				}
			}
		}
		assert.deepEqual(offenders, [], offenders.length
			? `${offenders.length} call-site(s) without the app id:\n`
				+ offenders.slice(0, 15).map((o) => `      ${o}`).join('\n')
			: '');
	});
});
