/**
 * IntroVox's settings are written untyped (IConfig::setUserValue,
 * IConfig::setAppValue), as every version before tours per app did.
 *
 * Nextcloud 31+ stores a type with each value. Once a key has been written
 * with a typed setter (IUserConfig::setValueString, IAppConfig::setValueBool
 * and the like), an untyped write to that key throws a type conflict. The
 * update to tours per app did exactly that: its repair step wrote
 * tours_disabled as a typed string, after which the personal switch, which
 * writes it untyped, failed for every user the update had switched off.
 * Found on Nextcloud 32.
 *
 * So: no typed setter on a user preference at all, and none on the app
 * values IntroVox had before tours per app (wizard_*, telemetry_*). The
 * newer app keys (the tour index, tour_steps_*) are only ever written typed.
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function phpFiles(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) phpFiles(full, acc);
		else if (entry.name.endsWith('.php')) acc.push(full);
	}
	return acc;
}

const TYPED_SETTER = /->(?:setValueString|setValueInt|setValueFloat|setValueBool|setValueArray|setValueMixed)\s*\(/;

// Typed writes that break an untyped key, by line
function typedWrites(source) {
	const found = [];
	source.split('\n').forEach((line, index) => {
		if (!TYPED_SETTER.test(line)) {
			return;
		}
		// A user preference: IUserConfig's setters take the user first
		if (/userConfig\s*->/i.test(line)) {
			found.push({ line: index + 1, text: line.trim(), why: 'typed user preference' });
			return;
		}
		// A key IntroVox already had, written untyped by older versions
		if (/,\s*'(?:wizard_|telemetry_)/.test(line)) {
			found.push({ line: index + 1, text: line.trim(), why: 'typed write to a key from before tours per app' });
		}
	});
	return found;
}

describe('config types', () => {
	test('the scanner catches both kinds', () => {
		const source = [
			"$this->userConfig->setValueString($uid, 'introvox', 'tours_disabled', 'true');",
			"$this->appConfig->setValueBool('introvox', 'wizard_enabled', true);",
			"$this->appConfig->setValueString('introvox', 'tours', $json, lazy: false);",
			"$this->config->setUserValue($uid, 'introvox', 'tours_disabled', 'true');",
		].join('\n');
		assert.deepEqual(typedWrites(source).map((f) => f.line), [1, 2]);
	});

	test('lib/ writes user preferences and old app keys untyped', () => {
		const found = [];
		for (const file of phpFiles(path.join(ROOT, 'lib'))) {
			for (const write of typedWrites(fs.readFileSync(file, 'utf8'))) {
				found.push(`${path.relative(ROOT, file)}:${write.line} (${write.why}): ${write.text}`);
			}
		}
		assert.deepEqual(found, [], found.join('\n'));
	});
});
