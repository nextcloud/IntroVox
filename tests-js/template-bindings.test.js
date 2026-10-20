/**
 * Every name a template uses must exist on the component.
 *
 * A component with setup() exposes only what setup() returns. A ref or a
 * handler that is defined there but left out of the return object is
 * undefined in the template, and Vue says nothing: a click does nothing, a
 * comparison is always false. That has shipped twice. "Try again" called a
 * loadSteps the template could not see, and a new step opened as "Edit step"
 * because unsavedNewStepId was missing.
 *
 * The compiled template reads every name it does not know as `_ctx.name`.
 * This test collects those names and checks them against what the
 * component declares: the setup() return object, props, data(), computed
 * and methods.
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse, compileTemplate } = require('vue/compiler-sfc');

const ROOT = path.resolve(__dirname, '..');

const vueFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
	const full = path.join(dir, entry.name);
	if (entry.isDirectory()) {
		return vueFiles(full);
	}
	return entry.name.endsWith('.vue') ? [full] : [];
});

// The text between the brace at `open` and its partner. Strings, template
// literals and comments are skipped, so a brace inside them does not count.
const braced = (code, open) => {
	let depth = 0;
	for (let i = open; i < code.length; i++) {
		const c = code[i];
		if (c === '/' && code[i + 1] === '/') {
			i = code.indexOf('\n', i);
			if (i === -1) {
				break;
			}
		} else if (c === '/' && code[i + 1] === '*') {
			i = code.indexOf('*/', i) + 1;
		} else if (c === '\'' || c === '"' || c === '`') {
			for (i++; i < code.length && code[i] !== c; i++) {
				if (code[i] === '\\') {
					i++;
				}
			}
		} else if (c === '{' || c === '[' || c === '(') {
			depth++;
		} else if (c === '}' || c === ']' || c === ')') {
			depth--;
			if (depth === 0) {
				return code.slice(open + 1, i);
			}
		}
	}
	return '';
};

// Blank out strings, comments and nested brackets, keeping every offset,
// so only depth 0 is left and an index still points into the original
const topLevel = (body) => {
	const out = body.split('');
	let depth = 0;
	const blank = (from, to) => {
		for (let j = from; j <= to && j < out.length; j++) {
			out[j] = out[j] === '\n' ? '\n' : ' ';
		}
	};
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (c === '/' && body[i + 1] === '/') {
			const end = body.indexOf('\n', i);
			const last = end === -1 ? body.length - 1 : end - 1;
			blank(i, last);
			i = last;
		} else if (c === '/' && body[i + 1] === '*') {
			const last = body.indexOf('*/', i) + 1;
			blank(i, last);
			i = last;
		} else if (c === '\'' || c === '"' || c === '`') {
			const start = i;
			for (i++; i < body.length && body[i] !== c; i++) {
				if (body[i] === '\\') {
					i++;
				}
			}
			blank(start, i);
		} else if (c === '{' || c === '[' || c === '(') {
			depth++;
			out[i] = ' ';
		} else if (c === '}' || c === ']' || c === ')') {
			depth--;
			out[i] = ' ';
		} else if (depth > 0) {
			blank(i, i);
		}
	}
	return out.join('');
};

// The keys of an object literal: `a,` `b: x` `c()` `async d()` `...e`
const keysOf = (body) => topLevel(body)
	.split(',')
	.map((part) => part.trim().replace(/^async\s+/, ''))
	.filter((part) => !part.startsWith('...'))
	.map((part) => (part.match(/^([A-Za-z_$][\w$]*)/) || [])[1])
	.filter(Boolean);

// The object a member such as `props: {` or `setup() {` opens
const memberBody = (script, pattern) => {
	const match = script.match(pattern);
	return match ? braced(script, match.index + match[0].length - 1) : null;
};

// What the last `return {` at the top of a function body hands back
const returnedKeys = (fnBody) => {
	if (fnBody === null) {
		return [];
	}
	const at = topLevel(fnBody).lastIndexOf('return ');
	if (at === -1) {
		return [];
	}
	return keysOf(braced(fnBody, fnBody.indexOf('{', at)));
};

const declared = (script) => {
	const names = new Set();
	const add = (list) => list.forEach((name) => names.add(name));

	const props = memberBody(script, /\n\s*props:\s*\{/);
	if (props !== null) {
		add(keysOf(props));
	}
	const propsArray = script.match(/\n\s*props:\s*\[([^\]]*)\]/);
	if (propsArray) {
		add(propsArray[1].match(/[A-Za-z_$][\w$]*/g) || []);
	}
	add(returnedKeys(memberBody(script, /\n\s*setup\s*\([^)]*\)\s*\{/)));
	add(returnedKeys(memberBody(script, /\n\s*data\s*\(\)\s*\{/)));
	for (const member of ['computed', 'methods']) {
		const body = memberBody(script, new RegExp(`\\n\\s*${member}:\\s*\\{`));
		if (body !== null) {
			add(keysOf(body));
		}
	}
	return names;
};

const used = (template, file) => {
	const { code } = compileTemplate({ source: template, filename: file, id: 'audit' });
	return new Set([...code.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
};

describe('template bindings', () => {
	const files = vueFiles(path.join(ROOT, 'src'));

	test('finds the components', () => {
		assert.ok(files.length >= 10, `only ${files.length} .vue files found`);
	});

	test('reads what props and a setup() return object expose', () => {
		// Guards the guard: if declared() found nothing, every name would be
		// reported; if it found too much, the test would pass on anything.
		const script = `export default {
  props: { tour: { type: Object, default: null }, open: Boolean },
  setup(props, { emit }) {
    const shown = ref(false)
    const helper = () => { return { notThis: 1 } }
    if (props.open) { return { notThisEither: 1 } }
    // return { inAComment }
    return { shown, label: 'x', async load() {}, ...rest }
  }
}`;
		assert.deepEqual([...declared(script)].sort(), ['label', 'load', 'open', 'shown', 'tour']);
	});

	for (const file of files) {
		const relative = path.relative(ROOT, file);
		test(`${relative}: the template uses only what the component exposes`, () => {
			const { descriptor } = parse(fs.readFileSync(file, 'utf8'), { filename: file });
			if (!descriptor.template || !descriptor.script) {
				return;
			}
			const names = declared(descriptor.script.content);
			const missing = [...used(descriptor.template.content, file)]
				.filter((name) => !names.has(name) && !name.startsWith('$'));
			assert.deepEqual(missing, [], `${relative} uses ${missing.join(', ')} in its template, but setup(), props, data, computed and methods do not provide it`);
		});
	}
});
