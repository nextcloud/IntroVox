/**
 * Every IntroVox route is called by our own frontend through
 * @nextcloud/axios, which sends the CSRF request token, from a page where the
 * user is logged in. So no route needs to opt out of either check — with two
 * exceptions. GET /media/{file} (MediaController::show): an <img> or <video>
 * cannot send a request token, and that route only reads. GET /tour/{id}
 * (LinkController::open): a share link in a mail cannot either; it only
 * redirects to the tour's page, and changes nothing.
 *
 * They once did opt out: GET /api/steps was a #[PublicPage] and skipped the
 * group filter when there was no user, so anyone could read every step of the
 * tour, group-restricted ones included, without logging in. The tracking
 * POSTs (start, complete, skip) had #[NoCSRFRequired], so any website could
 * fire them on behalf of a logged-in visitor. This file keeps those opt-outs
 * from creeping back in unnoticed, in whatever spelling: an attribute list, a
 * fully qualified or aliased name, a docblock annotation, a route declared on
 * the controller itself. The scanner is tested on fixtures of each.
 *
 * The routes are also loaded for real by tests-php (npm run test:php).
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'lib');

// The routes that may skip the CSRF check, and why (above)
const CSRF_EXCEPTIONS = [
	{ file: 'lib/Controller/MediaController.php', method: 'show' },
	{ file: 'lib/Controller/LinkController.php', method: 'open' },
];

function phpFiles(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) phpFiles(full, acc);
		else if (entry.name.endsWith('.php')) acc.push(full);
	}
	return acc;
}

/**
 * PHP source without comments, so prose about these attributes does not
 * count, with line breaks kept. `#[` starts an attribute, not a comment.
 */
function stripComments(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
		.replace(/\/\/[^\n]*/g, '')
		.replace(/#(?!\[)[^\n]*/g, '');
}

/**
 * Every function with the attributes in front of it, however they are
 * written: one per line, several in one #[...], on the same line as the
 * function, fully qualified.
 *
 * @return {Array<{name: string, attributes: string[]}>}
 */
function functionsWithAttributes(code) {
	const functions = [];
	const pattern = /((?:#\[(?:[^[\]]|\[[^[\]]*\])*\]\s*)*)(?:(?:public|protected|private|static|final|abstract)\s+)*function\s+(\w+)\s*\(/g;
	for (const [, attributeText, name] of code.matchAll(pattern)) {
		const attributes = [];
		for (const [, group] of attributeText.matchAll(/#\[((?:[^[\]]|\[[^[\]]*\])*)\]/g)) {
			// Top-level names in the group: before any '(' and after a ','
			for (const part of group.replace(/\([^()]*\)/g, '').split(',')) {
				const qualified = part.trim();
				if (qualified) attributes.push(qualified.split('\\').pop());
			}
		}
		functions.push({ name, attributes });
	}
	return functions;
}

/**
 * Everything in one PHP file that opts a route out of a check, or could.
 *
 * @param {string} source The file
 * @param {string} file Its path relative to the repository, for the exception
 * @return {string[]} One line per problem
 */
function scanOptOuts(source, file) {
	const problems = [];
	const code = stripComments(source);

	for (const [, annotation] of source.matchAll(/@(NoCSRFRequired|PublicPage|NoAdminRequired)\b/g)) {
		problems.push(`${file}: docblock annotation @${annotation}; use an attribute`);
	}
	for (const [, route] of code.matchAll(/\b(FrontpageRoute|ApiRoute)\b/g)) {
		problems.push(`${file}: #[${route}]; declare routes in appinfo/routes.php`);
	}
	for (const [, name] of code.matchAll(/\buse\s+[\w\\]*\b(NoCSRFRequired|PublicPage)\s+as\s+\w+/g)) {
		problems.push(`${file}: ${name} imported under another name`);
	}
	if (/\bPublicPage\b/.test(code)) {
		problems.push(`${file}: PublicPage`);
	}

	// NoCSRFRequired may only appear as an attribute on the one exception,
	// apart from its plain import
	const withoutImports = code.replace(/^\s*use\s+[\w\\]+\\NoCSRFRequired\s*;/gm, '');
	const tokens = (withoutImports.match(/\bNoCSRFRequired\b/g) || []).length;
	const optedOut = functionsWithAttributes(code).filter((fn) => fn.attributes.includes('NoCSRFRequired'));
	if (tokens !== optedOut.length) {
		problems.push(`${file}: NoCSRFRequired outside an attribute on a method`);
	}
	for (const fn of optedOut) {
		if (!CSRF_EXCEPTIONS.some((e) => e.file === file && e.method === fn.name)) {
			problems.push(`${file}: ${fn.name}() skips the CSRF check`);
		}
	}
	return problems;
}

// { 'admin#getSteps': ['NoAdminRequired', …] } for every public method
function controllerMethods() {
	const methods = {};
	const dir = path.join(LIB, 'Controller');
	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('Controller.php'))) {
		const controller = file.replace('Controller.php', '');
		const prefix = controller.charAt(0).toLowerCase() + controller.slice(1);
		const code = stripComments(fs.readFileSync(path.join(dir, file), 'utf8'));
		for (const fn of functionsWithAttributes(code)) {
			if (fn.name === '__construct') continue;
			if (!new RegExp(`public\\s+function\\s+${fn.name}\\s*\\(`).test(code)) continue;
			methods[`${prefix}#${fn.name}`] = fn.attributes;
		}
	}
	return methods;
}

// The route list as written; tests-php loads it for real as well
function routes() {
	const source = fs.readFileSync(path.join(ROOT, 'appinfo/routes.php'), 'utf8');
	return [...source.matchAll(/\[\s*'name'\s*=>\s*'([\w#]+)'[^\]]*?'url'\s*=>\s*'([^']+)'(?:[^\]]*?'verb'\s*=>\s*'(\w+)')?/g)]
		.map(([, name, url, verb]) => ({ name, url, verb: verb || 'GET' }));
}

function walk(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, acc);
		else if (/\.(vue|js|mjs)$/.test(entry.name)) acc.push(full);
	}
	return acc;
}

describe('the opt-out scanner itself', () => {
	const clean = (source) => scanOptOuts(`<?php\n${source}`, 'lib/Controller/OtherController.php');
	const exception = (source) => scanOptOuts(`<?php\n${source}`, CSRF_EXCEPTIONS[0].file);

	test('catches every way to write the attribute', () => {
		const fixtures = {
			'own line': '#[NoCSRFRequired]\npublic function a() {}',
			'in a list': '#[NoAdminRequired, NoCSRFRequired]\npublic function a() {}',
			'fully qualified': '#[\\OCP\\AppFramework\\Http\\Attribute\\NoCSRFRequired]\npublic function a() {}',
			'same line': '#[NoCSRFRequired] public function a() {}',
			'two groups on a line': '#[NoAdminRequired] #[NoCSRFRequired] public function a() {}',
			'with arguments before it': '#[UserRateLimit(limit: 1, period: 2), NoCSRFRequired]\npublic function a() {}',
			'on the class': '#[NoCSRFRequired]\nclass A {}',
			'aliased': 'use OCP\\AppFramework\\Http\\Attribute\\NoCSRFRequired as Open;\n#[Open]\npublic function a() {}',
			'docblock': '/**\n * @NoCSRFRequired\n */\npublic function a() {}',
			'public page': '#[PublicPage]\npublic function a() {}',
			'public page docblock': '/** @PublicPage */\npublic function a() {}',
			'no admin docblock': '/** @NoAdminRequired */\npublic function a() {}',
			'route on the controller': '#[FrontpageRoute(verb: "GET", url: "/x")]\npublic function a() {}',
			'api route': '#[ApiRoute(verb: "GET", url: "/x")]\npublic function a() {}',
		};
		for (const [name, source] of Object.entries(fixtures)) {
			assert.notDeepEqual(clean(source), [], `missed: ${name}`);
		}
	});

	test('ignores prose in comments and plain imports', () => {
		assert.deepEqual(clean('// no NoCSRFRequired or PublicPage here\npublic function a() {}'), []);
		assert.deepEqual(clean('/* NoCSRFRequired */\n#[NoAdminRequired]\npublic function a() {}'), []);
	});

	test('allows an exception, and only on its own method', () => {
		const show = 'use OCP\\AppFramework\\Http\\Attribute\\NoCSRFRequired;\n#[NoAdminRequired]\n#[NoCSRFRequired]\npublic function show() {}';
		assert.deepEqual(exception(show), []);
		assert.notDeepEqual(exception(show + '\n#[NoCSRFRequired]\npublic function other() {}'), []);
		assert.notDeepEqual(exception('#[NoCSRFRequired]\npublic function upload() {}'), []);
	});

	test('reads attributes on the methods', () => {
		const fns = functionsWithAttributes('#[NoAdminRequired]\n#[UserRateLimit(limit: 10, period: 3600)]\npublic function track() {}\npublic function plain() {}');
		assert.deepEqual(fns, [
			{ name: 'track', attributes: ['NoAdminRequired', 'UserRateLimit'] },
			{ name: 'plain', attributes: [] },
		]);
	});
});

describe('controller security', () => {
	const methods = controllerMethods();
	const routeList = routes();

	test('the parser finds the controllers', () => {
		// Guard against a broken regex passing everything vacuously.
		assert.ok(Object.keys(methods).length > 20, `only ${Object.keys(methods).length} controller methods found`);
		assert.ok(routeList.length > 20, `only ${routeList.length} routes found`);
	});

	test('every route points at an existing controller method', () => {
		// media_upload#store is MediaUploadController::store, as Nextcloud reads it
		const method = (name) => name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
		const missing = routeList.filter((r) => !(method(r.name) in methods)).map((r) => `${r.verb} ${r.url} → ${r.name}`);
		assert.deepEqual(missing, []);
	});

	test('nothing in lib/ opts out of the login or CSRF check, except media#show and link#open', () => {
		const problems = phpFiles(LIB).flatMap((file) =>
			scanOptOuts(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file)));
		assert.deepEqual(problems, [], 'the frontend sends the request token via @nextcloud/axios; call new endpoints that way instead');
	});

	test('the tracking endpoints are rate limited per user', () => {
		// Any user can call them; they write to the database on each call.
		const tracking = ['api#trackWizardStart', 'api#trackWizardComplete', 'api#trackWizardSkip', 'api#tourEvent'];
		const missing = tracking.filter((name) => !(methods[name] || []).includes('UserRateLimit'));
		assert.deepEqual(missing, []);
	});

	test('the frontend calls the API only through @nextcloud/axios', () => {
		// A bare fetch() sends no request token, so it would fail against the
		// CSRF check above; it also tends to hard-code URLs that break on
		// instances with a webroot or without pretty URLs.
		const offenders = walk(path.join(ROOT, 'src'))
			.filter((file) => /\bfetch\(/.test(fs.readFileSync(file, 'utf8')))
			.map((file) => path.relative(ROOT, file));
		assert.deepEqual(offenders, []);
	});
});

module.exports = { scanOptOuts, functionsWithAttributes };
