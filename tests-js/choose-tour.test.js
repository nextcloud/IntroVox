/**
 * Which tour a page load starts (src/runtime/chooseTour.mjs).
 *
 * The bootstrap asks this on every logged-in page before it loads any tour
 * code. A rule in the wrong order shows up as a tour inside the element
 * picker, a welcome tour over the admin intro, a resumed tour that never
 * resumes, or a tour on every single page.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let tours;
before(async () => {
	tours = await import(pathToFileURL(path.resolve(__dirname, '../src/runtime/chooseTour.mjs')).href);
});

const NOW = 1_800_000_000_000;
const runtime = (overrides = {}) => ({
	enabled: true,
	welcome: { version: '3', disabledByUser: false },
	tours: [],
	...overrides,
});
const context = (overrides = {}) => ({
	frame: null,
	resume: null,
	onAdminPage: false,
	runtime: runtime(),
	local: { completed: false, version: null },
	tourEndedAt: null,
	pathname: '/index.php/apps/files/',
	now: NOW,
	...overrides,
});
const seen = { completed: true, version: '3' };

describe('frameKind', () => {
	const names = { pickerName: 'introvox-element-picker', previewName: 'introvox-tour-preview' };

	test('a page of its own, or one embedded by another origin, is no frame', () => {
		assert.equal(tours.frameKind({ ...names, sameOriginParent: false, name: '' }), null);
		// Another website can open a tab with our frame name; only a
		// same-origin frame element counts
		assert.equal(tours.frameKind({ ...names, sameOriginParent: false, name: 'introvox-element-picker' }), null);
	});

	test('our two frames, and anyone else\'s same-origin frame', () => {
		assert.equal(tours.frameKind({ ...names, sameOriginParent: true, name: 'introvox-element-picker' }), 'picker');
		assert.equal(tours.frameKind({ ...names, sameOriginParent: true, name: 'introvox-tour-preview' }), 'preview');
		assert.equal(tours.frameKind({ ...names, sameOriginParent: true, name: 'some-viewer' }), 'foreign');
		assert.equal(tours.frameKind({ ...names, sameOriginParent: true, name: '' }), 'foreign');
	});
});

describe('welcomeOpen', () => {
	test('a new user on a new browser', () => {
		assert.equal(tours.welcomeOpen({ version: '1', disabledByUser: false }, { completed: false, version: null }), true);
	});

	test('done or skipped is recorded on the server, for every device', () => {
		assert.equal(tours.welcomeOpen({ version: '1', disabledByUser: true }, { completed: false, version: null }), false);
	});

	test('closed on this browser', () => {
		assert.equal(tours.welcomeOpen({ version: '3', disabledByUser: false }, seen), false);
	});

	test('"Show wizard to all users" raised the version', () => {
		assert.equal(tours.welcomeOpen({ version: '4', disabledByUser: false }, seen), true);
	});

	test('a version mark without completion still counts as open', () => {
		assert.equal(tours.welcomeOpen({ version: '3', disabledByUser: false }, { completed: false, version: '3' }), true);
	});
});

describe('chooseTour', () => {
	test('a new user gets the welcome tour', () => {
		assert.deepEqual(tours.chooseTour(context()), { tour: 'welcome', resume: null });
	});

	test('nothing in the element picker or someone else\'s same-origin frame, even mid-tour', () => {
		const resume = { stepId: 'x', at: NOW - 1000 };
		assert.equal(tours.chooseTour(context({ frame: 'picker', resume })), null);
		assert.equal(tours.chooseTour(context({ frame: 'foreign', resume })), null);
	});

	test('a tour underway carries on, before every other rule', () => {
		const resume = { stepId: 'talk', at: NOW - 60_000, tourId: 'welcome' };
		const switchedOff = context({ resume, runtime: runtime({ enabled: false }), local: seen, onAdminPage: true, tourEndedAt: NOW });
		assert.deepEqual(tours.chooseTour(switchedOff), { tour: 'welcome', resume });
	});

	test('a resume entry without tourId, from before tours had ids, is the welcome tour\'s', () => {
		const resume = { stepId: 'talk', at: NOW - 60_000 };
		assert.equal(tours.chooseTour(context({ resume })).tour, 'welcome');
	});

	test('a stale resume entry is ignored', () => {
		const resume = { stepId: 'talk', at: NOW - tours.RESUME_TTL - 1, tourId: 'welcome' };
		assert.equal(tours.chooseTour(context({ resume, local: seen })), null);
	});

	test('IntroVox\'s settings page has the admin intro instead', () => {
		assert.equal(tours.chooseTour(context({ onAdminPage: true })), null);
	});

	test('a page without the runtime state lets the tour code ask the server', () => {
		assert.deepEqual(tours.chooseTour(context({ runtime: null })), { tour: 'welcome', check: true });
	});

	test('switched off for everyone', () => {
		assert.equal(tours.chooseTour(context({ runtime: runtime({ enabled: false }) })), null);
	});

	test('welcome seen: no tour, so no tour code is loaded', () => {
		assert.equal(tours.chooseTour(context({ local: seen })), null);
		assert.equal(tours.chooseTour(context({ runtime: runtime({ welcome: { version: '3', disabledByUser: true } }) })), null);
	});

	test('the welcome tour comes before the "just ended" pause', () => {
		// Shown again to everyone while a tour just ended in this tab
		const choice = tours.chooseTour(context({ local: { completed: true, version: '2' }, tourEndedAt: NOW - 1000 }));
		assert.deepEqual(choice, { tour: 'welcome', resume: null });
	});

	test('just after a tour ended, nothing else starts', () => {
		assert.equal(tours.chooseTour(context({ local: seen, tourEndedAt: NOW - 1000 })), null);
		assert.equal(tours.chooseTour(context({ local: seen, tourEndedAt: NOW - tours.TOUR_ENDED_TTL - 1 })), null);
	});
});

describe('chooseTour with app tours', () => {
	const talk = { id: 'talk', page: '/apps/spreed/', version: 1 };
	const inTalk = '/index.php/apps/spreed/';

	test('an app tour due on its own page starts there', () => {
		assert.deepEqual(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk] }), pathname: inTalk })), { tour: 'talk' });
		assert.deepEqual(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk] }), pathname: '/call/abc123' })), { tour: 'talk' });
	});

	test('not on another page', () => {
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk] }), pathname: '/apps/files/' })), null);
	});

	test('the welcome tour comes first, the app tour waits for a later visit', () => {
		assert.deepEqual(tours.chooseTour(context({ runtime: runtime({ tours: [talk] }), pathname: inTalk })), { tour: 'welcome', resume: null });
	});

	test('not right after another tour ended in this tab', () => {
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk] }), pathname: inTalk, tourEndedAt: NOW - 1000 })), null);
	});

	test('nothing by itself for a user who switched tours off, or with tours off for everyone', () => {
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk], toursDisabled: true }), pathname: inTalk })), null);
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [talk], enabled: false }), pathname: inTalk })), null);
	});

	test('an explicit start works on its page, even with tours switched off', () => {
		const start = { tourId: 'deck', page: '/apps/deck/', at: NOW - 1000 };
		const off = runtime({ toursDisabled: true });
		assert.deepEqual(tours.chooseTour(context({ start, runtime: off, local: seen, pathname: '/index.php/apps/deck/board/1' })), { tour: 'deck', manual: true });
		assert.equal(tours.chooseTour(context({ start, runtime: off, local: seen, pathname: '/apps/files/' })), null);
		assert.equal(tours.chooseTour(context({ start: { ...start, at: NOW - tours.START_TTL - 1 }, runtime: off, local: seen, pathname: '/apps/deck/' })), null);
	});

	test('"Restart tour now" starts the welcome tour on the next page, even with tours switched off', () => {
		// PersonalApp redirects to / and cannot know which app that lands on
		const start = { tourId: 'welcome', at: NOW - 1000 };
		const off = runtime({ toursDisabled: true });
		assert.deepEqual(tours.chooseTour(context({ start, runtime: off, local: seen, pathname: '/apps/dashboard/' })), { tour: 'welcome', manual: true });
		assert.equal(tours.chooseTour(context({ start: { ...start, at: NOW - tours.START_TTL - 1 }, runtime: off, local: seen, pathname: '/apps/dashboard/' })), null);
	});

	test('a share link starts its tour on the page it opens, like a start by hand', () => {
		const off = runtime({ toursDisabled: true });
		assert.deepEqual(tours.chooseTour(context({ link: 'talk', runtime: off, local: seen, pathname: inTalk })), { tour: 'talk', manual: true });
		assert.deepEqual(tours.chooseTour(context({ link: 'welcome', local: seen })), { tour: 'welcome', manual: true });
		// Following a link asks for that tour, also over one that was underway
		// (leaving a page mid-tour leaves an entry to carry it on); the admin
		// page keeps its own tour
		const resume = { stepId: 's2', at: NOW - 1000, tourId: 'deck' };
		assert.deepEqual(tours.chooseTour(context({ link: 'talk', resume, local: seen })), { tour: 'talk', manual: true });
		assert.deepEqual(tours.chooseTour(context({ resume, local: seen })), { tour: 'deck', resume });
		assert.equal(tours.chooseTour(context({ link: 'talk', onAdminPage: true, local: seen })), null);
		assert.equal(tours.chooseTour(context({ link: 'talk', frame: 'picker' })), null);
	});

	test('a tour that starts anywhere is due on every page, but never first', () => {
		const tips = { id: 'tips', page: '', version: 1, anywhere: true };
		assert.deepEqual(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [tips] }), pathname: '/apps/files/' })), { tour: 'tips' });
		assert.deepEqual(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [tips] }), pathname: '/settings/user' })), { tour: 'tips' });
		assert.deepEqual(tours.chooseTour(context({ runtime: runtime({ tours: [tips] }) })), { tour: 'welcome', resume: null });
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [tips] }), onAdminPage: true })), null);
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [tips] }), tourEndedAt: NOW - 1000 })), null);
	});

	test('a tour without a page never starts by itself', () => {
		assert.equal(tours.chooseTour(context({ local: seen, runtime: runtime({ tours: [{ id: 'x', page: '', version: 1 }] }) })), null);
		assert.equal(tours.chooseTour(context({ local: seen, start: { tourId: 'x', page: '', at: NOW } })), null);
	});

	test('a resume entry keeps its tour', () => {
		const resume = { stepId: 's2', at: NOW - 1000, tourId: 'talk' };
		assert.deepEqual(tours.chooseTour(context({ resume, local: seen })), { tour: 'talk', resume });
	});

	test('the welcome tour switched off on its own', () => {
		assert.equal(tours.chooseTour(context({ runtime: runtime({ welcome: { enabled: false, version: '3', disabledByUser: false } }) })), null);
	});
});
