/**
 * Every class a PHP file in lib/ names without a namespace is imported with
 * `use`, or lives in the same folder (namespace).
 *
 * `php -l` does not see a missing `use`: the file parses, and only the line
 * that runs it fails, with a 500. A built-in tour once gave a 500 to every
 * user that way (BuiltinTours::isBuiltin in ApiController).
 *
 * Run with: npm run test:js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LIB = path.resolve(__dirname, '../lib');
// PHP's own classes, used without a leading backslash in lib/
const BUILTIN = new Set(['self', 'static', 'parent', 'Throwable', 'Exception', 'RuntimeException', 'InvalidArgumentException', 'JsonException', 'ValueError', 'TypeError', 'DateTimeImmutable', 'DateTime', 'DateTimeZone', 'DateInterval', 'ZipArchive', 'Closure', 'Generator', 'Stringable', 'JsonSerializable']);

const phpFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
	const full = path.join(dir, entry.name);
	return entry.isDirectory() ? phpFiles(full) : entry.name.endsWith('.php') ? [full] : [];
});

test('every class named in lib/ is imported or in its own namespace', () => {
	const missing = [];
	for (const file of phpFiles(LIB)) {
		const source = fs.readFileSync(file, 'utf8');
		const code = source
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/[^\n]*/g, '')
			.replace(/'(?:[^'\\]|\\.)*'/g, "''");
		const imported = new Set([...source.matchAll(/^use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/gm)].map((m) => m[2] || m[1].split('\\').pop()));
		const local = new Set(fs.readdirSync(path.dirname(file)).filter((name) => name.endsWith('.php')).map((name) => name.slice(0, -4)));
		const used = new Set([
			...[...code.matchAll(/(?<![\\\w$>])([A-Z]\w+)::/g)].map((m) => m[1]),
			...[...code.matchAll(/\bnew\s+([A-Z]\w+)/g)].map((m) => m[1]),
			...[...code.matchAll(/\binstanceof\s+([A-Z]\w+)/g)].map((m) => m[1]),
			...[...code.matchAll(/catch\s*\(\s*([A-Z]\w+)/g)].map((m) => m[1]),
		]);
		for (const name of used) {
			if (!imported.has(name) && !local.has(name) && !BUILTIN.has(name)) {
				missing.push(`${path.relative(LIB, file)}: ${name}`);
			}
		}
	}
	assert.deepEqual(missing, []);
});
