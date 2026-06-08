# Language Management

As of v1.7.0, IntroVox automatically supports every language Nextcloud knows about. The wizard's default tour content is translated via Transifex, and end users see it in their Nextcloud language without any admin action.

Admins can optionally provide **per-language overrides** — custom copy that replaces the default content for a specific language only. Overrides are the exception; for most installs you never need one.

## How language coverage works (the short version)

- **Default content** comes from `$l->t('…')` calls in `lib/Controller/AdminController.php`. The English source strings are extracted to `translationfiles/templates/introvox.pot` and translated on Transifex (`nextcloud/introvox`).
- **End users always get the wizard in their Nextcloud language**, with the standard fallback chain: user locale → base language → English. No language opt-in by the admin, no per-user gating.
- **Admin overrides** live in the database (`oc_appconfig`, key `wizard_steps_<lang>`). One row per language that has an override; if no row exists, the Transifex-translated default is served.

## Adding a language override

1. Go to **Settings → Administration → IntroVox → Steps**.
2. Click **+ Add language override**.
3. Type to search the full Nextcloud language list, pick a language, click **Add override**.
4. The Steps editor switches to that language and shows the current default content as a starting point.
5. Edit the steps and click **💾 Save changes**. The override row is created at save-time, not earlier — so picking a language and bailing out costs nothing.

The override-language dropdown only lists languages that currently have an override (plus English, always). It will never show the full 80+ language list directly.

## Discarding an override

To send a language back to the auto-translated defaults:

1. Select the language in the dropdown.
2. Click **🔄 Reset**.
3. Confirm.

The `wizard_steps_<lang>` row is deleted. Users in that language now see the Transifex-translated defaults — including any new translations that landed on Transifex since the override was authored.

## How language detection works at runtime

When a user opens Nextcloud, IntroVox:

1. Reads the user's language via `IL10N::getLanguageCode()` (e.g. `nl_BE`).
2. Extracts the base language (`nl_BE` → `nl`).
3. Looks for `wizard_steps_nl` in `oc_appconfig`.
4. **Override exists** → serves it as-is (after group-visibility filtering).
5. **No override** → calls `DefaultStepsService::getForLanguage('nl')`, which builds the eight default steps via the Nextcloud `IFactory` translator. If a Dutch translation exists on Transifex, the user sees Dutch; if not, the fallback chain hands them English.

See [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) and [DefaultStepsService](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php) for the implementation.

## Upgrade notes for installs coming from 1.6.x

In 1.6.x, opening the Steps tab silently auto-persisted the default tour content into `oc_appconfig` so that the reorder UX worked. As a result, most 1.6.x installs have six rows in the database (en/nl/de/da/fr/sv) that are byte-identical to the 1.6.x defaults at the time.

After upgrade to 1.7.0:

- Those six rows show up in the Steps-tab dropdown as **overrides**.
- The wizard keeps working — end users see no difference.
- However, **those six languages won't pick up new Transifex translations** until the override row is removed. The 1.6.x default copy stays frozen in the DB.

To get back to "everything served from Transifex" for any of those six languages:

1. Open the Steps tab.
2. Pick the language in the dropdown.
3. Click **🔄 Reset**.

This deletes the row; from then on, Transifex updates flow through automatically.

If you'd actually customised one of those six languages in 1.6.x, leave it alone — it's a real override and Reset would discard your work.

The obsolete `enabled_languages` appconfig key is ignored by 1.7.0 code but left in the database for downgrade safety. You can remove it manually with:

```bash
occ config:app:delete introvox enabled_languages
```

## Adding a language that isn't on Transifex yet

You don't need to wait for Transifex — the override flow works for any language Nextcloud knows about, even if Transifex hasn't translated the IntroVox strings for it yet. Just add an override, write the copy yourself, save. Users in that language will see your override; users in other languages keep seeing whatever Transifex provides (or English fallback).

If Transifex later adds a translation for that language, your override **wins**. Reset the override when you no longer need the custom copy.

## Example use cases for overrides

- **Region-specific tips**: Dutch users get steps mentioning Dutch Nextcloud cloud providers; international users see generic Transifex-translated content.
- **Tenant-specific wording**: an institution wants "Welcome to ACME Cloud" instead of "Welcome to Nextcloud" for their users only.
- **Translation gaps**: a language Transifex hasn't covered yet — the admin writes it themselves as an override until a Transifex translation arrives.

## See Also

- [Multi-Language Support](../features/multi-language.md) — Transifex integration details
- [Transifex Integration](../architecture/transifex-integration.md) — l10n workflow
- [Managing Wizard Steps](managing-steps.md) — Edit steps per language
- [Settings](settings.md) — Available admin settings
