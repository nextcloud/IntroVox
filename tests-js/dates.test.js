/**
 * A tour's start dates (src/utils/dates.mjs): calendar days that must come
 * back as the same day, whatever the browser's time zone.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let dates;
before(async () => {
	dates = await import(pathToFileURL(path.resolve(__dirname, '../src/utils/dates.mjs')).href);
});

describe('tour dates', () => {
	test('a day goes to a local Date and back unchanged', () => {
		for (const iso of ['2026-01-01', '2026-03-29', '2026-10-25', '2026-12-31', '2028-02-29']) {
			const date = dates.isoToDate(iso);
			assert.equal(date.getHours(), 0, iso);
			assert.equal(dates.dateToIso(date), iso);
		}
	});

	test('no day, or not a day, is nothing', () => {
		for (const bad of ['', null, undefined, '2026-02-30', '2026-13-01', '1-10-2026', '2026-10-01T00:00', 20261001]) {
			assert.equal(dates.isoToDate(bad), null, JSON.stringify(bad));
		}
		assert.equal(dates.dateToIso(null), '');
		assert.equal(dates.dateToIso(new Date('not a date')), '');
	});

	test('the same in a time zone far from UTC', () => {
		// Late in the day, where UTC is already tomorrow (try TZ=America/Los_Angeles)
		const date = new Date(2026, 9, 1, 23, 30);
		assert.equal(dates.dateToIso(date), '2026-10-01');
	});
});
