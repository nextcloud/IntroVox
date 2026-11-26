/**
 * Regression tests for the l10n plumbing around the code — the parts that broke
 * silently and stayed broken for months because nothing ever checked them.
 *
 * The POT is the source Weblate reads, and translationfiles/<lang>/introvox.po the
 * translations it writes; both must be committable. Under Transifex they were not:
 * .gitignore had a `translationfiles/` + `*` + `/` rule, which matches the
 * templates/ directory and therefore everything inside it. So when Nextcloud's
 * sync-bot removed the POT on 2026-06-09, every `git add` of it silently no-opped
 * and the template stayed gone — taking the whole admin UI's translatability with it.
 *
 * These tests do not need Weblate, a network or an account: they assert the local
 * invariants that must hold for the round-trip to work at all.
 *
 * Run with: npm run test:js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const POT_REL = 'translationfiles/templates/introvox.pot';
const inGitRepo = fs.existsSync(path.join(ROOT, '.git'));

// Some of these invariants are about git itself, so they can only be asserted
// inside a real checkout. A released tarball or an exported tree has no .git;
// skip there rather than report a failure that says nothing about the code.
const git = (...args) => {
	try {
		return { ok: true, out: execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim() };
	} catch (e) {
		return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
	}
};

// The POT comes from Nextcloud's translationtool (xgettext), which wraps a long string over
// several lines: `msgid ""` followed by `"…"` continuation lines. Read whole fields, not lines.
const unescapePo = (s) => s.replace(/\\(["\\nt])/g, (_, c) => ({ n: '\n', t: '\t' })[c] ?? c);
const potEntries = (pot) => pot.split(/\n\n+/).map((block) => {
	const field = (name) => {
		const m = block.match(new RegExp(`^${name} ((?:"(?:[^"\\\\]|\\\\.)*"\\n?)+)`, 'm'));
		return m ? [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => unescapePo(x[1])).join('') : null;
	};
	return { id: field('msgid'), plural: field('msgid_plural') };
}).filter((e) => e.id);

describe('POT round-trip plumbing', () => {
	test('the POT path is not gitignored', { skip: !inGitRepo && 'not a git checkout' }, () => {
		// Ask git directly whether the file is addable. `check-ignore -v` is the
		// wrong probe here: it exits 0 and prints the matching rule even when
		// that rule is a NEGATION, so a correctly un-ignored POT looks identical
		// to an ignored one. `check-ignore -q --no-index` answers the actual
		// question — exit 0 means ignored, exit 1 means not.
		const res = git('check-ignore', '-q', '--no-index', POT_REL);
		assert.equal(res.ok, false,
			`${POT_REL} is gitignored.\n`
			+ '  If the path is ignored, `npm run pot` writes a POT that git never sees,\n'
			+ '  and Weblate stops getting new strings.\n'
			+ '  Keep translationfiles/ fully tracked in .gitignore.');
	});

	test('the Weblate setup is in place, and Transifex is gone', () => {
		// Since 2026-11-24 the app is translated in VoxCloud's Weblate (design
		// l10n/RULES.md L01): l10n-sync builds the POT and l10n/ from the .po files.
		// A .tx/config left behind would invite a second writer.
		assert.ok(!fs.existsSync(path.join(ROOT, '.tx/config')), '.tx/config is back: the app no longer syncs with Transifex');
		assert.ok(fs.existsSync(path.join(ROOT, 'scripts/l10n-sync.mjs')), 'scripts/l10n-sync.mjs is missing (copied from design)');
		assert.ok(fs.existsSync(path.join(ROOT, POT_REL)), `${POT_REL} is missing. Run: npm run pot`);
		const langs = fs.readdirSync(path.join(ROOT, 'translationfiles'))
			.filter((d) => d !== 'templates' && fs.existsSync(path.join(ROOT, 'translationfiles', d, 'introvox.po')));
		assert.ok(langs.length > 100, `only ${langs.length} languages in translationfiles/: the .po files are the source of the translations`);
	});

	test('the POT contains the admin UI strings', () => {
		// End-to-end: whatever the extractor found must survive into the file
		// Weblate actually reads.
		const pot = fs.readFileSync(path.join(ROOT, POT_REL), 'utf8');
		for (const s of ['Global settings', 'Show Tours in the user menu', 'Tours for everyone']) {
			assert.ok(pot.includes(`msgid "${s}"`), `POT is missing msgid ${JSON.stringify(s)}`);
		}
	});

	test('the POT has no duplicate msgids', () => {
		// msgfmt rejects duplicates, and so does Weblate — a POT that fails to
		// parse leaves the component at its previous state with no error
		// anywhere in our own tooling.
		const pot = fs.readFileSync(path.join(ROOT, POT_REL), 'utf8');
		const ids = potEntries(pot).map((e) => e.id);
		const seen = new Set();
		const dupes = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
		assert.deepEqual([...new Set(dupes)], [], 'duplicate msgids in the POT');
	});
});

describe('release packaging', () => {
	// deploy.sh is Forgejo-only: push-to-github.sh strips it (see
	// .gitignore-github), so on the public GitHub mirror — and therefore in
	// GitHub Actions — this file does not exist. Skip rather than fail there;
	// the checks still run locally and on Forgejo, which is where releases are
	// actually cut.
	const DEPLOY = path.join(ROOT, 'deploy.sh');
	const hasDeploy = fs.existsSync(DEPLOY);
	const deploy = hasDeploy ? fs.readFileSync(DEPLOY, 'utf8') : '';

	test('deploy.sh ships the l10n directory', { skip: !hasDeploy && 'deploy.sh not in this checkout' }, () => {
		// Guards the inverse mistake of the test below: excluding l10n wholesale
		// would ship an app with no translations at all.
		assert.ok(/^\s*"l10n"\s*$/m.test(deploy), 'deploy.sh no longer includes l10n/');
	});

	test('deploy.sh strips l10n build artefacts from the tarball', { skip: !hasDeploy && 'deploy.sh not in this checkout' }, () => {
		// l10n/ is copied wholesale into the package, so en.json/en.js — which
		// exist only as POT input — would otherwise land on the server. Nextcloud
		// loads any l10n/<lang>.js it finds, and the .source-*.json files are
		// build bookkeeping with no runtime meaning.
		for (const artefact of ['l10n/en.json', 'l10n/en.js', 'l10n/.source-count.json', 'l10n/.source-strings.json']) {
			assert.ok(deploy.includes(artefact),
				`deploy.sh does not remove ${artefact} from the deployment directory`);
		}
	});

	test('generated catalogues are not tracked in git', { skip: !inGitRepo && 'not a git checkout' }, () => {
		// en.json/en.js are regenerated on every POT round; tracking them would
		// produce a diff on each run and fight the bot, which deletes en.json.
		const tracked = git('ls-files', 'l10n/en.json', 'l10n/en.js');
		assert.equal(tracked.ok, true, `git ls-files failed: ${tracked.out}`);
		assert.equal(tracked.out, '', `generated catalogues are tracked: ${tracked.out}`);
	});

	test('the source-string manifest IS tracked', { skip: !inGitRepo && 'not a git checkout' }, () => {
		// The opposite rule: check-l10n-sync.js compares against this file, so it
		// must be committed or the guard cannot fail on a fresh checkout.
		// (It is only tracked once committed — skip before the first commit.)
		const tracked = git('ls-files', 'l10n/.source-strings.json');
		const staged = git('diff', '--cached', '--name-only', '--', 'l10n/.source-strings.json');
		assert.ok(tracked.out !== '' || staged.out !== '',
			'l10n/.source-strings.json must be committed — check-l10n-sync.js reads it');
	});
});

describe('plural translations', () => {
	// Nextcloud looks a plural up under `_<singular>_::_<plural>_`, in IL10N::n()
	// as in translatePlural() of @nextcloud/l10n. IntroVox 2.0.0 shipped every
	// plural under its bare singular (an old conversion script wrote them so): 46
	// translations in 15 languages that n() never found, so the admin UI showed
	// "%n people" in English everywhere. Nothing failed, nothing logged.
	const pot = fs.readFileSync(path.join(ROOT, POT_REL), 'utf8');
	const plurals = new Set(potEntries(pot).filter((e) => e.plural !== null).map((e) => `_${e.id}_::_${e.plural}_`));
	const catalogues = fs.readdirSync(path.join(ROOT, 'l10n')).filter((f) => /^[^.].*\.json$/.test(f));

	test('the POT has plurals to check', () => {
		assert.ok(plurals.size > 0, 'no msgid_plural found in the POT — the regex no longer matches it');
	});

	test('every plural sits under the key n() looks up', () => {
		const wrong = [];
		for (const f of catalogues) {
			const { translations } = JSON.parse(fs.readFileSync(path.join(ROOT, 'l10n', f), 'utf8'));
			for (const [key, value] of Object.entries(translations)) {
				if (Array.isArray(value) && !plurals.has(key)) {
					wrong.push(`${f}: ${JSON.stringify(key).slice(0, 70)}`);
				}
			}
		}
		assert.deepEqual(wrong, [], 'plural translations under a key n() never looks up');
	});
});
