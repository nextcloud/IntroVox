# Multi-Language Support

Since v1.7.0, every language IntroVox has a translation for is available to users automatically. The translations are maintained in VoxCloud's Weblate and ship with the app. Admins do not opt languages in or out; they only manage *overrides* — optional custom copy that replaces the default for a specific language.

## How language coverage works

The runtime model in one paragraph:

> Every NC user gets the wizard in their Nextcloud language. IntroVox tries the user's full language first (`pt_BR`), then its base language (`pt`), then English. Default copy is translated via `$l->t()`, from the translations that ship with IntroVox in `l10n/`. An admin can optionally save a `wizard_steps_<lang>` override; overrides are made per base language, so an override for `pt` also serves users with `pt_BR` or `pt_PT`. An override replaces the defaults for that language only.

There is no list of "supported languages" inside IntroVox. The list is whatever has translations in Weblate, plus English (always). Every such language ships, however far along it is: there is no minimum percentage, and what is not translated yet shows in English. A translation made in Weblate after a release reaches users with the next IntroVox release.

## Language detection at runtime

[`ApiController::getWizardSteps()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) calls `IFactory::findLanguage(null)` (deliberately not `findLanguage('introvox')`) to get the user's raw language preference without NC silently rerouting to a language IntroVox happens to ship a file for. Steps:

1. Read user lang via `IFactory::findLanguage(null)` — e.g. `pt_BR`
2. Make the candidates: the full language, then its base language: `pt_BR`, `pt`
3. Look up `wizard_steps_pt_BR`, then `wizard_steps_pt` in `oc_appconfig`
4. **An override exists** → serve the first one found (after group-visibility filtering)
5. **No override** → take the first candidate IntroVox has a translation for (`IFactory::languageExists()`): `pt_BR`, else `pt`, else **English** (not the system default). [`DefaultStepsService::getForLanguage()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php) then serves the eight default steps in that language via `IFactory::get('introvox', <lang>)`

Before 2.0.0 only the base language was used, so a translation for `pt_BR` or `zh_CN` never reached anyone.

## Fallback table

| User language | Admin override exists? | What the user sees |
|---|---|---|
| `nl` | yes | The admin's `wizard_steps_nl` content as-is |
| `nl_BE` | yes, for `nl` | The `nl` override: overrides are per base language |
| `nl` | no | The translated defaults (or English if no Dutch translation) |
| `pt_BR` | no | The `pt_BR` translation; without one the base language `pt`, else English |
| `pt_BR` | yes, for `pt` | The `pt` override: an override goes before any translated defaults |
| `it` | no, no Italian translation | English defaults (explicit `en` fallback) |
| `xx` (invalid) | n/a | English defaults |

The explicit English fallback prevents the surprising "Italian user gets Dutch tour" behaviour caused by NC's default `findLanguage()` validation.

All of the above is about the welcome tour. A tour for an app has no translated defaults: it only has the steps an admin wrote. A user gets them in their own language, else in the base language, else in the tour's main language. The built-in tours are the exception: as long as none of these languages has steps of the admin's own, users get the built-in steps, translated into their own language, or in English while a translation is missing. See [Tours](../admin/tours.md).

## Adding a language override (admin)

Per-language overrides live in the database, not in Weblate. They are per-install custom copy that an admin authors directly.

1. Go to **Settings → Administration → IntroVox → Tours** and click **Edit steps** on the **Welcome tour**
2. Click **Add language override**
3. Search the full Nextcloud language list, pick a language, click **Add override**
4. The editor shows the default steps in that language (in English while there is no translation) as a starting point. Edit them; the override row is written with the first change you save

To discard an override and return to the translated defaults: select the language → click **Reset** → confirm.

See [Language Management](../admin/language-management.md) for the full workflow.

## Translation flow

For default tour copy (the welcome tour's eight default steps, the steps of the built-in tours, and all admin/personal-settings UI strings):

1. A developer who changes source strings runs `npm run pot` and commits `translationfiles/templates/introvox.pot` with the code
2. Once that is on `main`, Weblate picks up the new strings automatically
3. At release time, every string that is still empty gets a first translation by AI (Claude), in the languages Nextcloud users choose most; people review those translations in Weblate, and translators translate there as well. A translation made by a person is never replaced
4. Weblate commits the translations (`translationfiles/<lang>/introvox.po`) to the branch `l10n/weblate` and opens a pull request; CI builds `l10n/<lang>.json` + `l10n/<lang>.js` from them on that branch, leaving out strings marked "needs editing"
5. The pull request is merged, and the next IntroVox release ships the new translations; end users in that language pick them up automatically

Found a translation error, or want to help with a language? Open an issue on [GitHub](https://github.com/nextcloud/IntroVox/issues).

**A saved welcome tour keeps its own text.** When an admin has saved the welcome tour for a language (an override, see [Adding a language override](#adding-a-language-override-admin)), users in that language keep seeing that text, also after a release brings new or better translations: translations only reach languages without a saved tour. To give a language the translated defaults again, select it and click **Reset**.

For per-install admin overrides: Weblate is **not** involved. Each override is custom copy authored by the admin for their installation only.

## Translation files

The repo carries:

- **`translationfiles/templates/introvox.pot`** — POT template extracted from all `$l->t()` and `t('introvox', ...)` calls by Nextcloud's translationtool (`npm run pot`)
- **`translationfiles/<lang>/introvox.po`** — the translations of one language; Weblate is the only writer
- **`l10n/<lang>.json`** and **`l10n/<lang>.js`** — what Nextcloud loads, built from the `.po` files by CI (`scripts/l10n-sync.mjs build`); never edited by hand
- **`.l10nignore`** — folders translationtool skips when it builds the POT

See [Translations](../architecture/translations.md) for the whole pipeline, and for how it worked before November 2026.

## Default-step strings as msgids

Since v1.6.0, the welcome tour's eight default steps go through `t('introvox', '<English source>')` (in [`DefaultStepsService::build()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php)). The English source text *is* the msgid, so translators see real sentences instead of opaque `step_welcome_title`-style keys.

Existing customised step content (stored in `oc_appconfig.wizard_steps_<lang>`) is independent and unaffected by translation updates.

## Display names for the override picker

The **Add language override** picker shows native language names (e.g., "Nederlands", "Português") via `OCP\L10N\IFactory::getLanguages()`. Every language Nextcloud knows about is selectable, once per base language (`en_GB` is merged with `en`) — not only those that already have an IntroVox translation. An admin can therefore author an override for a language that has no translation yet; their override keeps winning after a translation arrives, and Reset then hands the language back to the translated defaults.

## Upgrade notes (1.6.x → 1.7.0)

Versions before 1.7.0 auto-persisted the default tour content into `oc_appconfig` the first time the admin opened the Steps tab. After upgrade these byte-identical defaults are now treated as overrides (and visible in the override-dropdown). They keep working but **stop receiving translation updates** for those languages until the admin clicks Reset. See [Language Management](../admin/language-management.md#upgrade-notes-for-installs-coming-from-16x).

## See Also

- [Language Management](../admin/language-management.md) — full admin override workflow + upgrade notes
- [Translations](../architecture/translations.md) — the translation pipeline
- [API Reference](../architecture/api-reference.md) — language-aware endpoints
