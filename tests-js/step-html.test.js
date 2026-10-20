/**
 * The cleaning of step HTML (src/utils/stepHtml.js).
 *
 * Step texts reach every user through Shepherd's innerHTML, and they do not
 * only come from the admin: imported tour files and Transifex translations of
 * the default steps carry markup nobody reviews. Nextcloud's CSP stops
 * scripts, but not links, styles or fake login forms, so the allowlist in
 * stepHtml.js is the only thing between a translated string and a phishing
 * form in the tour.
 *
 * DOMPurify needs a real DOM. Under Node it has none, and it then returns its
 * input UNCHANGED rather than failing — so a test that ran it here would pass
 * while proving nothing. assertSanitizerIsLive() below refuses to let that
 * happen: when no usable DOM is present the sanitizer cases are skipped
 * loudly instead of passing vacuously.
 *
 * What is always checked, DOM or not:
 *   - escapeHtml(), which is pure string work and guards titles/button labels
 *   - the allowlist itself: that the constants in stepHtml.js still say what
 *     the docs promise, so widening them is a deliberate, visible edit
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SOURCE = path.resolve(__dirname, '../src/utils/stepHtml.js');

// Tags that turn a step text into something other than formatting. Each one
// works under Nextcloud's CSP, which is why the allowlist exists.
const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed', 'svg', 'math', 'link', 'meta', 'base'];

let stepHtml = null;
let domAvailable = false;

before(async () => {
	// A DOM only exists when the suite runs in a browser-like environment.
	// Importing stepHtml.js without one is harmless; calling it is not.
	domAvailable = typeof globalThis.document !== 'undefined' && typeof globalThis.document.createElement === 'function';
	if (domAvailable) {
		stepHtml = await import(pathToFileURL(SOURCE).href);
	}
});

/**
 * @return {boolean} Whether the sanitizer can be trusted to actually strip
 *   anything here. DOMPurify silently passes input through without a DOM.
 */
function sanitizerIsLive() {
	if (!domAvailable || !stepHtml) {
		return false;
	}
	// The canary: if this is not stripped, DOMPurify is not really running and
	// every other assertion below would be meaningless.
	return stepHtml.sanitizeStepHtml('<script>alert(1)</script>x') === 'x';
}

describe('escapeHtml', () => {
	// Titles and button labels are plain text; Shepherd would parse them as HTML.
	let escapeHtml;
	before(() => {
		// Pure string work, so read it out of the module source rather than
		// importing the file, which pulls in DOMPurify and needs a DOM.
		const source = fs.readFileSync(SOURCE, 'utf8');
		const body = source.match(/export function escapeHtml\(text\) \{([\s\S]*?)\n\}/);
		assert.ok(body, 'escapeHtml() not found in stepHtml.js — did it move or get renamed?');
		escapeHtml = new Function('text', body[1].replace(/^\s*export\s+/, ''));
	});

	test('neutralises the characters that open a tag or close an attribute', () => {
		assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
		assert.equal(escapeHtml('a "quoted" title'), 'a &quot;quoted&quot; title');
		assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry');
	});

	test('escapes the ampersand first, so entities are not double-decoded', () => {
		// & last would turn <  into &amp;lt; and show the entity to the user.
		assert.equal(escapeHtml('&lt;'), '&amp;lt;');
	});

	test('renders null and undefined as empty, not as the words', () => {
		assert.equal(escapeHtml(null), '');
		assert.equal(escapeHtml(undefined), '');
	});

	test('leaves ordinary titles untouched', () => {
		assert.equal(escapeHtml('Welkom bij Nextcloud'), 'Welkom bij Nextcloud');
	});
});

describe('the allowlist in stepHtml.js', () => {
	// These assertions need no DOM: they pin the configuration itself, so
	// widening it shows up as a failing test rather than a silent change.
	const source = fs.readFileSync(SOURCE, 'utf8');
	const listOf = (name) => {
		const m = source.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
		assert.ok(m, `${name} not found in stepHtml.js`);
		return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
	};

	test('allows only the formatting the admin docs promise', () => {
		assert.deepEqual(
			listOf('ALLOWED_TAGS').sort(),
			['a', 'b', 'br', 'code', 'em', 'h3', 'h4', 'i', 'li', 'ol', 'p', 'small', 'strong', 'u', 'ul'],
		);
	});

	test('carries no tag that could script, style or phish', () => {
		const tags = listOf('ALLOWED_TAGS');
		for (const forbidden of FORBIDDEN_TAGS) {
			assert.ok(!tags.includes(forbidden), `<${forbidden}> must never be allowed in a step text`);
		}
	});

	test('allows no event handler or style attribute', () => {
		const attrs = listOf('ALLOWED_ATTR');
		assert.deepEqual(attrs.sort(), ['href', 'rel', 'target']);
		for (const attr of attrs) {
			assert.ok(!/^on/i.test(attr), `${attr} is an event handler`);
			assert.ok(attr !== 'style' && attr !== 'srcdoc', `${attr} must not be allowed`);
		}
	});

	test('gives every new tab a rel that cannot reach back at the tour', () => {
		// window.opener would otherwise let the opened page navigate the
		// instance away from under the user.
		assert.match(source, /noopener noreferrer/);
		assert.match(source, /afterSanitizeAttributes/);
	});
});

describe('sanitizeStepHtml', () => {
	// Only meaningful with a real DOM; see the file header.
	const live = () => sanitizerIsLive();

	test('strips scripting, styling and form markup', { skip: !live() && 'no DOM: DOMPurify would pass input through unchanged' }, () => {
		const cases = [
			['<script>alert(1)</script>Hallo', 'Hallo'],
			['<img src=x onerror=alert(1)>', ''],
			['<style>body{display:none}</style>', ''],
			['<iframe src="//evil.example"></iframe>', ''],
			['<form action="//evil.example"><input name=pw></form>', ''],
			['<p onclick="alert(1)">tekst</p>', '<p>tekst</p>'],
		];
		for (const [input, expected] of cases) {
			assert.equal(stepHtml.sanitizeStepHtml(input), expected, input);
		}
	});

	test('drops a javascript: link but keeps its text', { skip: !live() && 'no DOM' }, () => {
		assert.equal(stepHtml.sanitizeStepHtml('<a href="javascript:alert(1)">klik</a>'), '<a>klik</a>');
	});

	test('keeps the formatting a step is allowed to use', { skip: !live() && 'no DOM' }, () => {
		const ok = '<p>Normaal <strong>vet</strong> <a href="/apps/files/">link</a></p>';
		assert.equal(stepHtml.sanitizeStepHtml(ok), ok);
	});

	test('adds rel="noopener noreferrer" to a link that opens a new tab', { skip: !live() && 'no DOM' }, () => {
		const out = stepHtml.sanitizeStepHtml('<a href="https://example.com" target="_blank">ext</a>');
		assert.match(out, /rel="noopener noreferrer"/);
		assert.match(out, /target="_blank"/);
	});
});
