/**
 * Placeholder values: literal at a text site, escaped at an HTML site.
 *
 * translate() from @nextcloud/l10n HTML-escapes placeholder values by
 * default. That is right wherever the result is HTML (a tour step, v-html)
 * and in toasts, which @nextcloud/dialogs parse as HTML before showing their
 * text. Where Vue renders the result as text, it escapes once more, so a
 * group called "R&D" read "R&amp;D". Text sites pass TEXT
 * (src/utils/l10n.mjs); everything else keeps the default.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { translate, translatePlural } = require('@nextcloud/l10n');

const ROOT = path.resolve(__dirname, '..');
const NASTY = 'Tom & Jerry\'s <b>"team"</b>';

let TEXT;
before(async () => {
	({ TEXT } = await import(pathToFileURL(path.join(ROOT, 'src/utils/l10n.mjs')).href));
});

describe('placeholder escaping', () => {
	test('a value with & \' " < > renders literally at a text site', () => {
		assert.equal(
			translate('introvox', 'Delete {tour}', { tour: NASTY }, undefined, TEXT),
			'Delete Tom & Jerry\'s <b>"team"</b>',
		);
		assert.equal(
			translatePlural('introvox', '%n step in {tour}', '%n steps in {tour}', 2, { tour: NASTY }, TEXT),
			'2 steps in Tom & Jerry\'s <b>"team"</b>',
		);
	});

	test('the same value stays escaped at an HTML site', () => {
		// The library default, as used for tour steps and toasts
		assert.equal(
			translate('introvox', '<p>Delete {tour}</p>', { tour: NASTY }),
			'<p>Delete Tom &amp; Jerry&#39;s &lt;b&gt;&quot;team&quot;&lt;/b&gt;</p>',
		);
		// adminIntro.js: only the link it builds itself opts out, per value
		const link = '<a href="https://example.org">manual</a>'
		assert.equal(
			translate('introvox', '{link} for {tour}', { link: { value: link, escape: false }, tour: NASTY }, undefined, { sanitize: false }),
			link + ' for Tom &amp; Jerry&#39;s &lt;b&gt;&quot;team&quot;&lt;/b&gt;',
		);
	});

	test('TEXT cannot be changed by accident', () => {
		assert.ok(Object.isFrozen(TEXT));
		assert.deepEqual({ ...TEXT }, { escape: false, sanitize: false });
	});
});

// ---- Source guards: where TEXT may and must be used -----------------------

function walk(dir, acc = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walk(full, acc);
		else if (/\.(vue|js|mjs)$/.test(e.name)) acc.push(full);
	}
	return acc;
}

// The text of the call that opens at `start` (the index of its "(")
function callAt(source, start) {
	let depth = 0;
	let quote = null;
	for (let i = start; i < source.length; i++) {
		const ch = source[i];
		if (quote) {
			if (ch === '\\') i++;
			else if (ch === quote) quote = null;
		} else if (ch === '\'' || ch === '"' || ch === '`') {
			quote = ch;
		} else if ('({['.includes(ch)) {
			depth++;
		} else if (')}]'.includes(ch) && --depth === 0) {
			return source.slice(start, i + 1);
		}
	}
	return source.slice(start);
}

describe('escaping rules in src/', () => {
	const files = walk(path.join(ROOT, 'src'));
	const rel = (f) => path.relative(ROOT, f);

	test('no toast and no HTML sink gets a TEXT translation', () => {
		// Toasts put their message through innerHTML: an unescaped value
		// such as <img onerror=…> from a tour or group name would run.
		const offenders = [];
		for (const f of files) {
			const source = fs.readFileSync(f, 'utf8');
			for (const m of source.matchAll(/\b(show(?:Error|Success|Warning|Info)|html|escapeHtml)\(/g)) {
				if (/\bTEXT\b/.test(callAt(source, m.index + m[0].length - 1))) {
					offenders.push(`${rel(f)}: ${m[1]}(… TEXT …)`);
				}
			}
			source.split('\n').forEach((line, i) => {
				if (/v-html|innerHTML/.test(line) && /\bTEXT\b/.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
			});
		}
		assert.deepEqual(offenders, []);
	});

	test('every placeholder in a Vue template is rendered as text', () => {
		// A template only renders text (t() never goes into v-html here), so
		// a translation with values there must pass TEXT.
		const offenders = [];
		for (const f of files.filter((file) => file.endsWith('.vue'))) {
			const source = fs.readFileSync(f, 'utf8');
			const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1] || '';
			assert.ok(!/v-html="[^"]*\bt\(/.test(template), `${rel(f)}: t() in v-html`);
			for (const m of template.matchAll(/(?<![\w$.])(t|n)\(\s*'introvox'/g)) {
				const call = callAt(template, m.index + 1);
				const hasValues = m[1] === 't' ? /^\(\s*'introvox'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*\{/.test(call) : /\{\s*\w+\s*:/.test(call);
				if (hasValues && !/\bTEXT\)$/.test(call)) offenders.push(`${rel(f)}: ${call.slice(0, 70)}`);
			}
		}
		assert.deepEqual(offenders, []);
	});

	test('escape: false only in src/utils/l10n.mjs, or for one value', () => {
		const offenders = [];
		for (const f of files) {
			if (rel(f) === path.join('src', 'utils', 'l10n.mjs')) continue;
			fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
				if (/escape:\s*false/.test(line) && !/value:\s*\w+,\s*escape:\s*false/.test(line)) {
					offenders.push(`${rel(f)}:${i + 1}`);
				}
			});
		}
		assert.deepEqual(offenders, []);
	});
});
