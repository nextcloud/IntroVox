/**
 * The HTML rules of the step text editor (src/admin/stepTextHtml.mjs).
 *
 * The editor knows exactly the formatting the tour keeps, so it shows a text
 * the way users see it. HTML they never see is left out of the editor, and
 * the editor names it, since it goes from the stored text once the admin
 * changes it. So the check that finds it must not miss a tag or an
 * attribute, and must not report anything users do see.
 *
 * Run with: npm run test:js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let html;
before(async () => {
	html = await import(pathToFileURL(path.resolve(__dirname, '../src/admin/stepTextHtml.mjs')).href);
});

describe('the editor and the tour agree on tags', () => {
	test('the editor knows exactly the tags the tour keeps', () => {
		const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/stepHtml.js'), 'utf8');
		const tour = JSON.parse(source.match(/const ALLOWED_TAGS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
		assert.deepEqual([...html.EDITOR_TAGS].sort(), [...tour].sort());
	});
});

describe('hiddenHtml', () => {
	test('nothing in the default steps is hidden', () => {
		const php = fs.readFileSync(path.resolve(__dirname, '../lib/Service/DefaultStepsService.php'), 'utf8');
		const texts = [...php.matchAll(/'text' => \$l->t\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1]);
		assert.ok(texts.length >= 5, `found ${texts.length} default texts`);
		for (const text of texts) {
			assert.deepEqual(html.hiddenHtml(text), [], text);
		}
	});

	test('plain text and everything the tour shows pass', () => {
		assert.deepEqual(html.hiddenHtml(''), []);
		assert.deepEqual(html.hiddenHtml('Just text'), []);
		assert.deepEqual(html.hiddenHtml('<h3>Title</h3><p>A <b>bold</b>, <i>italic</i>, <u>under</u> and <code>x</code><br/>line</p><ol><li><p>one</p></li></ol>'), []);
		assert.deepEqual(html.hiddenHtml('<p><small>fine print</small></p>'), []);
	});

	test('links keep their address and target; rel is the tour\'s to set', () => {
		assert.deepEqual(html.hiddenHtml('<a href="https://nextcloud.com" target="_blank" rel="noopener">x</a>'), []);
		assert.deepEqual(html.hiddenHtml('<a href=\'/apps/files/\'>x</a>'), []);
	});

	test('tags the tour removes are reported', () => {
		assert.deepEqual(html.hiddenHtml('<h2>Big</h2><img src="x">'), ['<h2>', '<img>']);
		assert.deepEqual(html.hiddenHtml('<div>a</div><div>b</div>'), ['<div>']);
		assert.deepEqual(html.hiddenHtml('<p>x</p><style>p{}</style>'), ['<style>']);
	});

	test('attributes the tour removes are reported', () => {
		assert.deepEqual(html.hiddenHtml('<p class="note">x</p>'), ['<p class>']);
		assert.deepEqual(html.hiddenHtml('<a href="#" onclick="go()">x</a>'), ['<a onclick>']);
		assert.deepEqual(html.hiddenHtml('<strong style="color: red">x</strong>'), ['<strong style>']);
	});

	test('a > inside a quoted attribute does not end the tag early', () => {
		assert.deepEqual(html.hiddenHtml('<a href="/a>b" title="x">y</a>'), ['<a title>']);
	});

	test('comments are reported', () => {
		assert.deepEqual(html.hiddenHtml('<p>x</p><!-- note -->'), ['<!-- -->']);
	});
});

describe('cleanEditorHtml', () => {
	test('list items lose the paragraph the editor wraps them in', () => {
		assert.equal(
			html.cleanEditorHtml('<ul><li><p>one</p></li><li><p>two <strong>2</strong></p></li></ul>'),
			'<ul><li>one</li><li>two <strong>2</strong></li></ul>');
	});

	test('a nested list stays inside its item', () => {
		assert.equal(
			html.cleanEditorHtml('<ul><li><p>one</p><ul><li><p>sub</p></li></ul></li></ul>'),
			'<ul><li>one<ul><li>sub</li></ul></li></ul>');
	});

	test('paragraphs outside lists stay', () => {
		assert.equal(html.cleanEditorHtml('<p>a</p><p>b</p>'), '<p>a</p><p>b</p>');
	});

	test('an empty editor is an empty text', () => {
		assert.equal(html.cleanEditorHtml('<p></p>'), '');
		assert.equal(html.cleanEditorHtml(''), '');
	});
});

describe('normalizeHref', () => {
	test('web, mail and phone addresses and paths stay as typed', () => {
		for (const href of ['https://nextcloud.com', 'http://x.test/a?b=c', 'mailto:help@example.com', 'tel:+31201234567', '/apps/files/', '#top', './page']) {
			assert.equal(html.normalizeHref(href), href);
		}
	});

	test('a bare domain becomes https', () => {
		assert.equal(html.normalizeHref('  nextcloud.com/features '), 'https://nextcloud.com/features');
	});

	test('other schemes are refused', () => {
		for (const href of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd']) {
			assert.equal(html.normalizeHref(href), '', href);
		}
	});

	test('nothing typed is nothing', () => {
		assert.equal(html.normalizeHref('   '), '');
	});
});
