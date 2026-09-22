/**
 * Regression tests for the l10n plumbing around the code — the parts that broke
 * silently and stayed broken for months because nothing ever checked them.
 *
 * The POT is the source Transifex reads. The Nextcloud sync-bot DELETES it from
 * the repo after every ingest (normal, see IntraVox's zigzag of "POT-template
 * terug" commits). That only works if the POT can be committed back. In IntroVox
 * it could not: .gitignore had a `translationfiles/` + `*` + `/` rule, which
 * matches the templates/ directory and therefore everything inside it. So when the bot removed the POT on 2026-06-09, every
 * `git add` of it silently no-opped and the template stayed gone — taking the
 * whole admin UI's translatability with it.
 *
 * These tests do not need the bot, a network, or a Transifex account: they
 * assert the local invariants that must hold for the round-trip to work at all.
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
			+ '  The sync-bot deletes the POT after each ingest; if the path is ignored,\n'
			+ '  putting it back silently does nothing and translations stop updating.\n'
			+ '  Keep the !translationfiles/templates/*.pot negations in .gitignore.');
	});

	test('.tx/config points at a POT that actually exists', () => {
		// With a source_file present, the bot skips its own extraction entirely
		// (that is what makes the trans() wrapper translatable at all). A
		// dangling path silently reverts us to bot-side extraction.
		const cfg = fs.readFileSync(path.join(ROOT, '.tx/config'), 'utf8');
		const match = cfg.match(/^\s*source_file\s*=\s*(.+?)\s*$/m);
		assert.ok(match, '.tx/config has no source_file — the bot would run its own extraction');
		const declared = match[1];
		assert.equal(declared, POT_REL, '.tx/config source_file does not match the generated POT path');
		assert.ok(fs.existsSync(path.join(ROOT, declared)),
			`.tx/config points at ${declared}, which does not exist. Run: npm run pot`);
	});

	test('the POT contains the admin UI strings', () => {
		// End-to-end: whatever the extractor found must survive into the file
		// Transifex actually reads.
		const pot = fs.readFileSync(path.join(ROOT, POT_REL), 'utf8');
		for (const s of ['Global settings', 'Show wizard to all users', 'Enable wizard for all users']) {
			assert.ok(pot.includes(`msgid "${s}"`), `POT is missing msgid ${JSON.stringify(s)}`);
		}
	});

	test('the POT has no duplicate msgids', () => {
		// msgfmt rejects duplicates, and so does Transifex — a POT that fails to
		// ingest leaves the resource frozen at its previous state with no error
		// anywhere in our own tooling.
		const pot = fs.readFileSync(path.join(ROOT, POT_REL), 'utf8');
		const ids = [...pot.matchAll(/^msgid "(.*)"$/gm)].map((m) => m[1]).filter(Boolean);
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
