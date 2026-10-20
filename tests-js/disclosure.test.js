/**
 * The telemetry disclosure keeps its marker.
 *
 * `display: flex` on a <summary> removes the marker box. The element still
 * opens on click, every interaction test still passes, and the row renders as
 * a line of stranded text with nothing indicating it can be opened. Nothing
 * warns you; only looking at it does — which is how it shipped the first time.
 *
 * So the thing worth pinning is not that the disclosure opens. It is that the
 * summary carries an explicit chevron, that the native marker is suppressed so
 * no browser draws a second one, and that the row is a real target.
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = path.resolve(__dirname, '../src/admin/StatisticsPane.vue');
const source = fs.readFileSync(SOURCE, 'utf8');

/**
 * @param {string} cls The disclosure's class name
 * @return {string} The markup of that <details> element
 */
function detailsMarkup(cls) {
	const open = source.indexOf(`<details class="${cls}"`);
	assert.notEqual(open, -1, `no <details class="${cls}"> in StatisticsPane.vue`);
	const close = source.indexOf('</details>', open);
	assert.notEqual(close, -1, 'unclosed <details>');
	return source.slice(open, close);
}

/**
 * @param {string} selector A CSS selector, as written in the stylesheet
 * @return {string} The declarations of that rule
 */
function rule(selector) {
	const at = source.indexOf(`\n${selector} {`);
	assert.notEqual(at, -1, `no rule for ${selector}`);
	return source.slice(at, source.indexOf('}', at));
}

describe('the telemetry disclosure', () => {
	const markup = detailsMarkup('telemetry-details');

	test('is a native <details>, not a div the app opens itself', () => {
		// Keyboard-operable, findable with find-in-page, announced as an
		// expandable group, and it needs no ARIA of ours.
		assert.match(markup, /<summary>/);
	});

	test('the summary carries a chevron — the part display: flex takes away', () => {
		const summary = markup.slice(markup.indexOf('<summary>'), markup.indexOf('</summary>'));
		assert.match(summary, /ChevronRight/, 'no chevron inside the rendered <summary>');
		assert.match(summary, /telemetry-details__chevron/, 'chevron carries no class to rotate');
	});

	test('the chevron is decorative, so it is hidden from screen readers', () => {
		// The summary's own text names the control.
		const summary = markup.slice(markup.indexOf('<summary>'), markup.indexOf('</summary>'));
		assert.match(summary, /aria-hidden="true"/);
	});

	test('one chevron rotates rather than two icons being swapped', () => {
		// One element, one transition, and it inherits the page's
		// prefers-reduced-motion block for free.
		assert.match(rule('.telemetry-details[open] .telemetry-details__chevron'), /rotate\(90deg\)/);
		const summary = markup.slice(markup.indexOf('<summary>'), markup.indexOf('</summary>'));
		assert.doesNotMatch(summary, /ChevronDown/, 'a second icon means a v-if swap, not a rotation');
	});
});

describe('the styled summary', () => {
	const summaryRule = rule('.telemetry-details summary');

	test('suppresses the native marker, so there is never a second one', () => {
		assert.match(summaryRule, /list-style:\s*none/);
		assert.match(rule('.telemetry-details summary::-webkit-details-marker'), /display:\s*none/);
	});

	test('is a real target, not a line of text', () => {
		assert.match(summaryRule, /min-height:\s*var\(--default-clickable-area\)/);
		assert.match(summaryRule, /cursor:\s*pointer/);
	});

	test('answers hover and keyboard focus', () => {
		assert.match(rule('.telemetry-details summary:hover'), /background-color/);
		assert.match(rule('.telemetry-details summary:focus-visible'), /outline:\s*2px solid/);
	});
});
