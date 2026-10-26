/**
 * <introvox-tour-list> is a fixed interface for other apps (the Help page of
 * helplinks shows it). A host names the tag, calls TourListEmbed::load(), and
 * the element reads GET /personal/settings. Rename any of these and a host
 * shows nothing, without an error of its own: these checks fail first.
 *
 * Run with: npm run test:js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const constant = (source, name) => source.match(new RegExp(`const ${name} = '([^']+)'`))?.[1];

const php = read('lib/Embed/TourListEmbed.php');
const element = read('src/embed/embed.js');

test('the element is defined under the tag name hosts are told to use', () => {
	assert.equal(constant(php, 'TAG_NAME'), 'introvox-tour-list');
	assert.equal(constant(element, 'TAG_NAME'), 'introvox-tour-list');
	assert.match(element, /customElements\.define\(TAG_NAME, /);
});

test('load() queues the bundle that defines it', () => {
	const script = constant(php, 'SCRIPT');
	assert.equal(script, 'introvox-embed');
	assert.match(php, /Util::addScript\('introvox', self::SCRIPT\)/);
	const webpack = require(path.join(ROOT, 'webpack.config.js'));
	assert.equal(webpack.entry[script], './src/embed/embed.js');
});

test('a host can guard on the class and on the user', () => {
	assert.match(php, /^namespace OCA\\IntroVox\\Embed;$/m);
	assert.match(php, /^class TourListEmbed \{$/m);
	assert.match(php, /public function isAvailable\(\?string \$userId = null\): bool/);
	assert.match(php, /public function load\(\): void/);
});

test('the events hosts listen for are the ones the element sends', () => {
	assert.match(element, /forward\('introvox:loaded'\)/);
	assert.match(element, /forward\('introvox:error'\)/);
});

test('the class names hosts style the links by are still there', () => {
	const links = read('src/embed/TourLinks.vue');
	for (const name of ['introvox-tour-list__items', 'introvox-tour-list__item', 'introvox-tour-list__link', 'introvox-tour-list__link--welcome', 'introvox-tour-list__link--seen', 'introvox-tour-list__icon', 'introvox-tour-list__icon--app', 'introvox-tour-list__name']) {
		assert.ok(links.includes(name), name);
	}
	// The look is the host's
	assert.doesNotMatch(links, /<style/);
});

test('each link is the tour\'s share link', () => {
	assert.match(read('src/embed/TourLinks.vue'), /generateUrl\('\/apps\/introvox\/tour\/\{id\}', \{ id \}\)/);
	assert.match(read('appinfo/routes.php'), /'name' => 'link#open', 'url' => '\/tour\/\{id\}'/);
	// The welcome tour too: forUser() knows it
	assert.match(read('lib/Controller/LinkController.php'), /\$this->tours->forUser\(\$id, /);
});

test('the personal settings still answer with what the element reads', () => {
	const controller = read('lib/Controller/PersonalController.php');
	for (const key of ['toursEnabled', 'tours']) {
		assert.match(controller, new RegExp(`'${key}' => `), key);
	}
	for (const key of ['id', 'name', 'page', 'app', 'seen']) {
		assert.match(controller, new RegExp(`\\s'${key}' => `), `tours[].${key}`);
	}
	const embedded = read('src/embed/EmbeddedTourList.vue');
	assert.match(embedded, /data\?\.toursEnabled/);
	assert.match(embedded, /data\?\.tours/);
});
