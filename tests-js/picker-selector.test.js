/**
 * The element picker's rules for what makes a selector survive a page reload,
 * another language and a Nextcloud update (src/picker/selector.mjs).
 *
 * A picked selector is stored and later resolved with querySelector() on the
 * users' pages. Accepting a generated id or a state class here yields a step
 * that works while the admin tests it and silently falls back to a centered
 * tooltip for everyone else.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let selector;
before(async () => {
	selector = await import(pathToFileURL(path.resolve(__dirname, '../src/picker/selector.mjs')).href);
});

describe('isStableId', () => {
	test('accepts the hand-written layout ids Nextcloud uses', () => {
		for (const id of ['header', 'content', 'user-menu', 'app-content', 'app-navigation', 'unified-search', 'app-content-vue', 'app-sidebar']) {
			assert.equal(selector.isStableId(id), true, id);
		}
	});

	test('rejects ids generated per page load', () => {
		const generated = [
			'trigger-xkqfj', // @nextcloud/vue: prefix + GenRandomId()
			'menu-abcde',
			'vs1__combobox', // NcSelect counter
			'uid-42',
			'3f2a9c1e-uuid',
			':r1:', // React useId
		];
		for (const id of generated) {
			assert.equal(selector.isStableId(id), false, id);
		}
	});
});

describe('isStableClass', () => {
	test('accepts component classes, including BEM elements and modifiers', () => {
		for (const name of ['app-menu__waffle', 'unified-search-input', 'account-menu__avatar', 'button-vue--vue-tertiary', 'app-item', 'icon-files']) {
			assert.equal(selector.isStableClass(name), true, name);
		}
	});

	test('rejects state classes that come and go', () => {
		for (const name of ['active', 'is-active', 'has-error', 'app-navigation-entry--active', 'header-menu--opened', 'router-link-exact-active', 'fade-enter-active', 'fade-leave-to', 'v-popper--shown']) {
			assert.equal(selector.isStableClass(name), false, name);
		}
	});

	test('rejects hashed and tooling classes', () => {
		for (const name of ['_root_1x2y3', 'css-4kq8z2', 'item-12345', 'shepherd-target', 'introvox-picker-cursor', 'w-1/2']) {
			assert.equal(selector.isStableClass(name), false, name);
		}
	});
});

describe('hrefMatchValue', () => {
	const base = 'https://cloud.example.com/index.php/apps/dashboard/';

	test('drops webroot and index.php so pretty and plain URLs match alike', () => {
		assert.equal(selector.hrefMatchValue('/index.php/apps/files/', base), '/apps/files/');
		assert.equal(selector.hrefMatchValue('/nextcloud/apps/files/', 'https://cloud.example.com/nextcloud/apps/dashboard/'), '/apps/files/');
		assert.equal(selector.hrefMatchValue('https://cloud.example.com/index.php/settings/user', base), '/settings/user');
	});

	test('ignores query and fragment', () => {
		assert.equal(selector.hrefMatchValue('/index.php/apps/files/files?dir=/Photos#top', base), '/apps/files/files');
	});

	test('returns null for links that identify nothing on this instance', () => {
		for (const href of ['', '#', '#section', 'javascript:void(0)', 'mailto:a@b.c', 'https://other.example.com/apps/files/', '/index.php/']) {
			assert.equal(selector.hrefMatchValue(href, base), null, JSON.stringify(href));
		}
	});
});

describe('private parts of links and attributes', () => {
	const base = 'https://cloud.example.com/index.php/apps/dashboard/';

	test('link paths stop before tokens and ids the admin happened to pick', () => {
		assert.equal(selector.hrefMatchValue('/index.php/call/k7x2mq9w', base), '/call/', 'Talk conversation token');
		assert.equal(selector.hrefMatchValue('/index.php/s/AbCdEfGh1234', base), '/s/', 'public share token');
		assert.equal(selector.hrefMatchValue('/index.php/f/42', base), '/f/', 'file id');
		assert.equal(selector.hrefMatchValue('/index.php/apps/files/files/1234?dir=/Private', base), '/apps/files/files/', 'numeric id');
		assert.equal(selector.hrefMatchValue('/index.php/apps/deck/board/a1b2c3d4e5', base), '/apps/deck/board/', 'token-like segment');
	});

	test('app links stay whole', () => {
		assert.equal(selector.hrefMatchValue('/index.php/apps/spreed/', base), '/apps/spreed/');
		assert.equal(selector.hrefMatchValue('/index.php/apps/files/files', base), '/apps/files/files');
	});

	test('attribute values: code-like names yes, user data no', () => {
		assert.equal(selector.isStableAttributeValue('data-id', 'files'), true);
		assert.equal(selector.isStableAttributeValue('data-cy-upload-picker', 'upload-picker'), true);
		assert.equal(selector.isStableAttributeValue('name', 'query'), true);
		assert.equal(selector.isStableAttributeValue('data-cy-files-list-row-name', 'report'), false, 'names what the user created');
		assert.equal(selector.isStableAttributeValue('data-cy-files-list-row-fileid', '42'), false);
		assert.equal(selector.isStableAttributeValue('data-id', 'Salaries 2026.xlsx'), false);
	});
});

describe('suggestPosition', () => {
	const rect = (left, top, width = 40, height = 40) => ({ left, top, right: left + width, bottom: top + height });

	test('follows the position guide in docs/admin/managing-steps.md', () => {
		assert.equal(selector.suggestPosition(rect(20, 5), 1400, 900), 'bottom', 'header item: tooltip below');
		assert.equal(selector.suggestPosition(rect(20, 400), 1400, 900), 'right', 'left sidebar: tooltip right');
		assert.equal(selector.suggestPosition(rect(1300, 400), 1400, 900), 'left', 'right side: tooltip left');
		assert.equal(selector.suggestPosition(rect(680, 850), 1400, 900), 'top', 'bottom navigation: tooltip above');
		assert.equal(selector.suggestPosition(rect(680, 400), 1400, 900), 'bottom', 'middle: below');
	});
});
