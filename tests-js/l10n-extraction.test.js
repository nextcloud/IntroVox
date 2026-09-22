/**
 * Regression tests for the l10n extraction pipeline.
 *
 * These pin the three failures that between them left the entire IntroVox admin
 * UI untranslatable for months, while every language file looked healthy:
 *
 *   1. The admin UI was never extracted. src/admin/AdminApp.vue calls a local
 *      wrapper (`t('Global settings')`, no app id) exposed as `t: trans`. The
 *      Nextcloud sync-bot only matches the literal `t('introvox', '…')` form, so
 *      120 of 207 source strings never reached Transifex. The screenshot symptom
 *      was a fully French tour wrapped in an English settings page.
 *   2. Prose mentioning another app's `t('core', …)` became a msgid. The
 *      extractor reads source as plain text and cannot tell code from a comment.
 *   3. PHP strings live in templates/ as well as lib/. Scanning only lib/ drops
 *      the 10 $l->t() strings in personal.php and admin.php.
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { computeSourceStrings, sourceStringManifest } = require(path.join(ROOT, 'scripts/extract-en-json.js'));

const src = computeSourceStrings();
const msgids = new Set([...src.singulars, ...src.plurals.map(([s]) => s)]);

describe('l10n extraction', () => {
	test('extracts a plausible number of strings', () => {
		// Sanity floor: if the extractor ever returns (almost) nothing, every
		// assertion below would pass vacuously and these guards would be dead.
		assert.ok(msgids.size > 150, `only ${msgids.size} source strings found`);
	});

	test('covers the admin UI wrapper form t(\'string\') — regression: 120 missing strings', () => {
		// Verbatim strings from src/admin/AdminApp.vue, all via the local
		// `trans()` wrapper without an app id. Before the fix none of these
		// existed in any catalogue, so they rendered in English regardless of
		// the user's language.
		const adminStrings = [
			'Global settings',
			'Configure wizard availability and languages',
			'Enable wizard for all users',
			'When disabled, the wizard will not automatically start for new users.',
			'Show wizard to all users',
			'Wizard will be shown to all users on their next login',
			'Settings',
			'Steps',
			'Statistics',
			'Support',
		];
		const missing = adminStrings.filter((s) => !msgids.has(s));
		assert.deepEqual(missing, [], `admin strings not extracted: ${JSON.stringify(missing, null, 2)}`);
	});

	test('covers PHP strings in templates/, not just lib/', () => {
		// $l->t() in templates/personal.php and templates/admin.php.
		const templateStrings = [
			'Manage the introduction tour steps shown to new users.',
			'Manage your introduction tour preferences.',
			'Permanently disable the introduction tour',
			'Restart tour now',
			'Save settings',
		];
		const missing = templateStrings.filter((s) => !msgids.has(s));
		assert.deepEqual(missing, [], `templates/ strings not extracted: ${JSON.stringify(missing)}`);
	});

	test('never emits an app id as a translatable string', () => {
		// `core` leaked in from a comment in src/components/wizardSteps.js that
		// explains how Nextcloud core renders aria-labels via t('core', …).
		// Translators would have seen a bare "core" to translate in 86 languages.
		for (const appId of ['introvox', 'core', 'intravox', 'files', 'settings']) {
			assert.ok(!msgids.has(appId), `app id ${JSON.stringify(appId)} extracted as a msgid`);
		}
	});

	test('extracts no single bare lowercase word', () => {
		// Broader form of the rule above: a real UI string is never one
		// lowercase word. Anything that is, is almost certainly an app id or
		// another identifier picked up from prose.
		const suspicious = [...msgids].filter((s) => /^[a-z][a-z0-9_]*$/.test(s));
		assert.deepEqual(suspicious, [], `suspicious identifier-like msgids: ${JSON.stringify(suspicious)}`);
	});

	test('manifest hash is stable across runs', () => {
		// check-l10n-sync.js compares this hash; an unstable one (e.g. from Set
		// iteration order leaking into the output) would make the guard flap.
		const a = sourceStringManifest(computeSourceStrings());
		const b = sourceStringManifest(computeSourceStrings());
		assert.equal(a.sha256, b.sha256);
		assert.equal(a.count, msgids.size);
	});
});

describe('l10n catalogues', () => {
	// Every shipped language file, derived from disk rather than hardcoded, so a
	// newly synced language is covered automatically (the FormVox lesson: a
	// hand-typed language list silently skipped uk and orphaned 51 strings).
	const languages = fs.readdirSync(path.join(ROOT, 'l10n'))
		.filter((f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'en.json')
		.map((f) => f.replace(/\.json$/, ''));

	test('finds the shipped catalogues', () => {
		assert.ok(languages.length >= 10, `only ${languages.length} catalogues found`);
	});

	// Space-like codepoints that render near enough like a plain space: NBSP,
	// the en/em-space family, narrow NBSP, ideographic space and tab.
	const SPACE_LIKE = /[  -   　\t]/g;
	const normalise = (s) => s.replace(SPACE_LIKE, ' ');

	// Whitespace changes that were made ON PURPOSE, with the orphaning accepted.
	//
	// The guard exists to catch the accidental case — a string that loses its
	// translations to an edit nobody can see. A deliberate fix to comply with the
	// Nextcloud guideline (an ellipsis must follow U+00A0) has the same shape on
	// disk but the opposite intent, so it is listed here rather than left to make
	// the suite permanently red.
	//
	// Each entry is the NEW source string. Remove it once translators have
	// re-translated it and the bot has synced the new key back: source and
	// catalogue agree again and the exemption is dead weight.
	//
	// Do NOT add an entry to silence a failure you did not intend. Doing that is
	// the bug this test was written to catch (FormVox 1.4.6).
	const ACCEPTED_ORPHANS = new Set([
		// 1.7.9: 'Saving …' and 'Restarting tour …' moved from a plain space to
		// U+00A0. 33 translations across 17 languages were knowingly dropped —
		// only 2 of them had the NBSP right in the translation itself.
		'Saving\u00a0…',
		'Restarting tour\u00a0…',
	]);

	for (const lang of languages) {
		test(`${lang}: no source string differs from a translation key by whitespace alone`, () => {
			// A source string may legitimately have no translation yet. But if it
			// matches an EXISTING key apart from invisible whitespace, it is not a
			// new string — it is an old one whose translations were just orphaned
			// by an edit no reviewer can see. (FormVox 1.4.6 lost two strings in
			// five languages exactly this way.)
			const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'l10n', `${lang}.json`), 'utf8'));
			const catalogue = raw.translations || raw;

			const keysByShape = new Map();
			for (const key of Object.keys(catalogue)) {
				keysByShape.set(normalise(key), key);
			}

			const drifted = [...msgids]
				.filter((s) => !(s in catalogue))
				.filter((s) => !ACCEPTED_ORPHANS.has(s))
				.map((s) => ({ source: s, key: keysByShape.get(normalise(s)) }))
				.filter(({ key }) => key !== undefined);

			assert.deepEqual(drifted, [], drifted.map(({ source, key }) =>
				`\n  source:          ${JSON.stringify(source)}`
				+ `\n  ${lang}.json key: ${JSON.stringify(key)}`
				+ '\n  → identical apart from whitespace, so this string lost its translation.'
				+ '\n    Restore the original spacing in the source rather than pushing it as a new string.',
			).join('\n'));
		});

		test(`${lang}: .js and .json carry the same keys`, () => {
			// The bot writes both; a hand-edit or a half-finished generate step
			// can desync them, and Nextcloud serves the .js to the browser while
			// tooling reads the .json — so a drift shows up only in the UI.
			const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'l10n', `${lang}.json`), 'utf8'));
			const jsRaw = fs.readFileSync(path.join(ROOT, 'l10n', `${lang}.js`), 'utf8');
			const match = jsRaw.match(/\{[\s\S]*\}/);
			assert.ok(match, `${lang}.js has no object literal`);
			const jsObj = JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1'));

			const jsonKeys = Object.keys(json.translations || json).sort();
			const jsKeys = Object.keys(jsObj.translations || jsObj).sort();
			assert.deepEqual(jsKeys, jsonKeys, `${lang}.js and ${lang}.json disagree on which strings exist`);
		});
	}
});
