/**
 * A step's selector list, split into its selectors (src/utils/selectorList.mjs).
 *
 * The tour tries them in order: "main, fallback" points at the main element
 * whenever it is there. A comma split inside :is() or an attribute value
 * would leave broken selectors that match nothing, and the step would sit in
 * the middle of the screen.
 *
 * Run with: npm run test:js
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let split;
before(async () => {
	({ splitSelectorList: split } = await import(pathToFileURL(path.resolve(__dirname, '../src/utils/selectorList.mjs')).href));
});

test('one selector stays one', () => {
	assert.deepEqual(split('#app-navigation-vue a[href="#/export"]'), ['#app-navigation-vue a[href="#/export"]']);
});

test('a list splits in written order, trimmed', () => {
	assert.deepEqual(split('.srdc-home__cards,  #app-navigation-vue a[href="#/export"] '), ['.srdc-home__cards', '#app-navigation-vue a[href="#/export"]']);
});

test('commas inside :is(), :not() and :has() stay', () => {
	assert.deepEqual(
		split('body:not(:has(.modal__card, .modal-mask)) a, :is(.a, .b) > span'),
		['body:not(:has(.modal__card, .modal-mask)) a', ':is(.a, .b) > span'],
	);
});

test('commas inside attribute values stay, quoted or escaped', () => {
	assert.deepEqual(split('[title="a, b"], [aria-label=\'c, d\'], .x\\,y'), ['[title="a, b"]', "[aria-label='c, d']", '.x\\,y']);
	assert.deepEqual(split('[title="say \\"hi, there\\""], .b'), ['[title="say \\"hi, there\\""]', '.b']);
});

test('empty parts and an empty list give nothing', () => {
	assert.deepEqual(split(''), []);
	assert.deepEqual(split(' , .a ,, '), ['.a']);
});

test('the built-in lists split where they were meant to', () => {
	assert.deepEqual(
		split('.new-group-conversation:not(:has(.set-contacts)) .new-group-conversation__footer > .button-vue--tertiary, .new-group-conversation:has(.set-contacts) .new-group-conversation__footer > .new-group-conversation__button'),
		['.new-group-conversation:not(:has(.set-contacts)) .new-group-conversation__footer > .button-vue--tertiary', '.new-group-conversation:has(.set-contacts) .new-group-conversation__footer > .new-group-conversation__button'],
	);
});
