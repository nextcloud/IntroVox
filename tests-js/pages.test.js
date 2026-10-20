/**
 * Page matching for tours that span apps (src/utils/pages.mjs).
 *
 * A step with a page makes the tour navigate there when it is not already
 * on it. A false "not on the page" navigates in a loop until the step is
 * given up as unreachable; a false "on the page" shows the step where its
 * element does not exist. Both hinge on these few string rules, and on
 * instances that differ in webroot and in whether /index.php is in the URL.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pages;
before(async () => {
	pages = await import(pathToFileURL(path.resolve(__dirname, '../src/utils/pages.mjs')).href);
});

describe('instancePath', () => {
	test('drops webroot and /index.php', () => {
		assert.equal(pages.instancePath('/index.php/apps/spreed/'), '/apps/spreed/');
		assert.equal(pages.instancePath('/nextcloud/index.php/apps/files/files/42'), '/apps/files/files/42');
		assert.equal(pages.instancePath('/nextcloud/apps/files/'), '/apps/files/');
		assert.equal(pages.instancePath('/index.php/settings/user/security'), '/settings/user/security');
	});
});

describe('stepPageFor', () => {
	test('stores the app, not the conversation, folder or file', () => {
		assert.equal(pages.stepPageFor('/index.php/apps/spreed/call/abc123'), '/apps/spreed/');
		assert.equal(pages.stepPageFor('/apps/files/files/42'), '/apps/files/');
		assert.equal(pages.stepPageFor('/index.php/apps/dashboard/'), '/apps/dashboard/');
	});

	test('keeps settings pages whole', () => {
		assert.equal(pages.stepPageFor('/index.php/settings/user/security'), '/settings/user/security');
	});
});

describe('normalizePage', () => {
	test('keeps plain paths, adding the leading slash', () => {
		assert.equal(pages.normalizePage('/apps/spreed/'), '/apps/spreed/');
		assert.equal(pages.normalizePage('apps/files'), '/apps/files');
		assert.equal(pages.normalizePage('  /apps/files/  '), '/apps/files/');
		assert.equal(pages.normalizePage(''), '');
	});

	test('rejects anything that leads off this Nextcloud', () => {
		// generateUrl() only prefixes the webroot, which is empty on an instance
		// at the domain root: //evil.example then opens another site.
		for (const page of ['//evil.example/login', '/\\evil.example', '\\\\evil.example', '/\t/evil.example', 'https://evil.example/', 'javascript:alert(1)', '/javascript:alert(1)']) {
			assert.equal(pages.normalizePage(page), '', JSON.stringify(page));
		}
	});

	test('ignores what is not a string', () => {
		assert.equal(pages.normalizePage(['/apps/files/']), '');
		assert.equal(pages.normalizePage(null), '');
	});
});

describe('isOnPage', () => {
	test('no page means any page', () => {
		assert.equal(pages.isOnPage('', '/index.php/apps/files/'), true);
		assert.equal(pages.isOnPage(undefined, '/index.php/apps/files/'), true);
		assert.equal(pages.isOnPage('   ', '/index.php/apps/files/'), true);
	});

	test('matches deeper URLs of the same app, with or without webroot and index.php', () => {
		assert.equal(pages.isOnPage('/apps/spreed/', '/index.php/apps/spreed/call/abc123'), true);
		assert.equal(pages.isOnPage('/apps/files/', '/nextcloud/apps/files/files/42'), true);
		assert.equal(pages.isOnPage('/apps/files', '/index.php/apps/files/'), true, 'page without trailing slash');
		assert.equal(pages.isOnPage('apps/files/', '/index.php/apps/files/'), true, 'page without leading slash');
	});

	test('does not match another app that shares a prefix', () => {
		assert.equal(pages.isOnPage('/apps/files/', '/index.php/apps/files_sharing/'), false);
		assert.equal(pages.isOnPage('/apps/files', '/index.php/apps/files_sharing/'), false);
	});

	test('counts Talk conversations and file links as their app', () => {
		// An open conversation is /call/<token>, outside /apps/spreed/
		assert.equal(pages.isOnPage('/apps/spreed/', '/index.php/call/abc123'), true);
		assert.equal(pages.stepPageFor('/index.php/call/abc123'), '/apps/spreed/');
		assert.equal(pages.stepPageFor('/nextcloud/f/42'), '/apps/files/');
	});

	test('does not match after a redirect to another app', () => {
		// e.g. Talk is not enabled for this user and Nextcloud sends them to the dashboard
		assert.equal(pages.isOnPage('/apps/spreed/', '/index.php/apps/dashboard/'), false);
	});
});

describe('pageTrigger', () => {
	test('the same cases as TourValidator::pageTrigger in PHP', () => {
		const cases = JSON.parse(require('node:fs').readFileSync(path.resolve(__dirname, '../tests-php/fixtures/page-triggers.json'), 'utf8'));
		for (const [input, expected] of cases) {
			assert.deepEqual(pages.pageTrigger(input), expected, JSON.stringify(input));
		}
	});

	test('a trigger opens its page', () => {
		assert.equal(pages.triggerPage({ type: 'app', app: 'spreed' }), '/apps/spreed/');
		assert.equal(pages.triggerPage({ type: 'page', page: '/settings/user' }), '/settings/user');
	});
});
