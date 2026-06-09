# Multi-Language Support

Since v1.7.0, IntroVox is auto-translated into every language Nextcloud supports via the [`nextcloud/introvox`](https://www.transifex.com/nextcloud/nextcloud/) Transifex resource. Admins do not opt languages in or out; they only manage *overrides* — optional custom copy that replaces the default for a specific language.

## How language coverage works

The runtime model in one paragraph:

> Every NC user gets the wizard in their Nextcloud language. The fallback chain is *user locale → base language → English*. Default copy is auto-translated via `$l->t()` against the Transifex translation pool. An admin can optionally save a `wizard_steps_<lang>` override for a specific language; if one exists for the user's language, it replaces the defaults for that language only.

There is no list of "supported languages" inside IntroVox. The list is whatever Transifex has translated, plus English (always).

## Language detection at runtime

[`ApiController::getWizardSteps()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) calls `IFactory::findLanguage(null)` (deliberately not `findLanguage('introvox')`) to get the user's raw language preference without NC silently rerouting to a language IntroVox happens to ship a file for. Steps:

1. Read user lang via `IFactory::findLanguage(null)` — e.g. `nl_BE`
2. Extract base language: `nl_BE` → `nl`
3. Look up `wizard_steps_nl` in `oc_appconfig`
4. **Override exists** → serve it (after group-visibility filtering)
5. **No override** → call [`DefaultStepsService::getForLanguage('nl')`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php), which serves the eight built-in steps via `IFactory::get('introvox', 'nl')`. If no Dutch translation exists, the service explicitly falls back to **English** (not the system default).

## Fallback table

| User language | Admin override exists? | What the user sees |
|---|---|---|
| `nl` | yes | The admin's `wizard_steps_nl` content as-is |
| `nl` | no | Auto-translated defaults from Transifex (or English if no Dutch translation) |
| `it` | no, no Italian translation | English defaults (explicit `en` fallback in `DefaultStepsService`) |
| `xx` (invalid) | n/a | English defaults |

The explicit English fallback prevents the surprising "Italian user gets Dutch tour" behaviour caused by NC's default `findLanguage()` validation.

## Adding a language override (admin)

Per-language overrides live in the database, not on Transifex. They are per-install custom copy that an admin authors directly.

1. Go to **Settings → Administration → IntroVox → Steps**
2. Click **+ Add language override**
3. Search the full Nextcloud language list, pick a language
4. Edit the seeded English defaults to your liking
5. Click **💾 Save changes** — the override row is written at save-time

To discard an override and return to the auto-translated defaults: select the language → click **🔄 Reset** → confirm.

See [Language Management](../admin/language-management.md) for the full workflow.

## Translation flow on Transifex

For default tour copy (the eight built-in steps and all admin/personal-settings UI strings):

1. We commit `translationfiles/templates/introvox.pot` to GitHub
2. The Nextcloud Transifex sync bot pushes the POT to Transifex (resource: `nextcloud/introvox`)
3. Community translators contribute on Transifex
4. The same bot opens PRs to commit `l10n/<lang>.json` + `l10n/<lang>.js` back to the repo
5. The next IntroVox release ships the new translations; end users in that language pick them up automatically

For per-install admin overrides: Transifex is **not** involved. Each override is custom copy authored by the admin for their installation only.

## Transifex infrastructure

The repo carries:

- **`.tx/config`** — Transifex resource configuration (PO format, source = English)
- **`translationfiles/templates/introvox.pot`** — POT template extracted from all `$l->t()` and `t('introvox', ...)` calls
- **`l10n/.gitkeep`** — keeps the directory tracked even when empty
- **`.l10nignore`** — exclusions for the sync bot
- **`regenerate_js_translations.py`** — Python helper that regenerates `l10n/*.js` from `l10n/*.json`

The sync was requested in [docker-ci#938](https://github.com/nextcloud/docker-ci/issues/938) and went live alongside v1.7.0.

## Default-step strings as Transifex msgids

Since v1.6.0, the eight built-in tour steps go through `t('introvox', '<English source>')` (in [`DefaultStepsService::build()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php)). The English source text *is* the Transifex msgid, so translators see real sentences instead of opaque `step_welcome_title`-style keys.

Existing customised step content (stored in `oc_appconfig.wizard_steps_<lang>`) is independent and unaffected by Transifex updates.

## Display names for the override picker

The "+ Add language override" picker shows native language names (e.g., "Nederlands", "Português") via `OCP\L10N\IFactory::getLanguages()`. Every language Nextcloud knows about is selectable — not only those that already have an IntroVox translation. An admin can therefore author an override for a language that Transifex hasn't covered yet; their override wins until a Transifex translation arrives, at which point Reset hands the language back to the defaults.

## Upgrade notes (1.6.x → 1.7.0)

Versions before 1.7.0 auto-persisted the default tour content into `oc_appconfig` the first time the admin opened the Steps tab. After upgrade these byte-identical defaults are now treated as overrides (and visible in the override-dropdown). They keep working but **stop receiving Transifex translation updates** for those languages until the admin clicks Reset. See [Language Management](../admin/language-management.md#upgrade-notes-for-installs-coming-from-16x).

## See Also

- [Language Management](../admin/language-management.md) — full admin override workflow + upgrade notes
- [Transifex Integration](../architecture/transifex-integration.md) — sync-bot workflow
- [API Reference](../architecture/api-reference.md) — language-aware endpoints
