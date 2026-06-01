# Multi-Language Support

IntroVox supports separate wizard configurations per language, automatic detection of user language preferences, and Transifex-based community translations.

## Supported Languages Out of the Box

- 🇬🇧 English (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Deutsch (`de`)
- 🇫🇷 Français (`fr`)
- 🇩🇰 Dansk (`da`)
- 🇸🇪 Svenska (`sv`)

Additional languages can be added without code changes — see [Transifex Integration](#transifex-integration-v160) below.

## Automatic Language Detection

When a user logs in, IntroVox uses Nextcloud's `IL10N::getLanguageCode()` to detect their language, extracts the base code (e.g., `en_US` → `en`), and either:

- Loads `wizard_steps_<lang>` from appconfig (if the language is enabled), or
- Returns `languageDisabled: true` so the personal settings page can show the "not available in your language" message

See [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) for the implementation.

## Per-Language Configuration

Each enabled language has its own independent `wizard_steps_<lang>` config blob, accessible via the admin panel's language dropdown. Administrators can:

- Customize step content per language
- Reset only one language without affecting others
- Export/import steps per language

See [Language Management](../admin/language-management.md) and [Managing Wizard Steps](../admin/managing-steps.md).

## Transifex Integration (v1.6.0+)

Since v1.6.0, IntroVox participates in Nextcloud's central Transifex translation pool.

### Required Files (Already in Place)

- **`.tx/config`** — Transifex resource configuration (PO format)
- **`l10n/.gitkeep`** — keeps the directory tracked even when empty
- **`.l10nignore`** — exclusions for the Nextcloud l10n sync bot

### How New Languages Land

1. A community translator contributes translations on [Transifex](https://www.transifex.com/nextcloud/nextcloud/)
2. The Nextcloud l10n sync bot picks up the new translations and commits a `l10n/<lang>.json` (and `.js`) file
3. On the next IntroVox release, the new language is bundled into the tarball
4. IntroVox's [language auto-discovery](../admin/language-management.md#adding-new-languages) automatically picks it up — no code changes needed
5. Admins can enable the new language in **Available languages** and customize its steps

### Auto-Discovery of Language Display Names (v1.6.0+)

Language picker labels (e.g., "Nederlands", "Português") are sourced from `OCP\L10N\IFactory::getLanguages()`. Any new language synced from Transifex appears in the admin dropdown with its correct localized name automatically.

The picker shows native names without emoji flags, matching the Nextcloud Settings convention.

### English as Transifex Source

Pre-v1.6.0, default step content went through opaque keys like `step_welcome_title`, surfacing unusable msgids to translators. Since v1.6.0, default content is wrapped in `t('introvox', '<English source>')`, so translators see the actual English text as the msgid.

Existing customized step content (stored in `oc_appconfig.wizard_steps_<lang>`) is unaffected by this change.

### Per-Topic Translation Pools (v1.6.0+)

The Transifex resource includes:

- All admin and personal-settings UI strings
- Default wizard step titles/text (16 steps)
- ~50 PWA install instruction strings covering all 9 OS/browser combinations
- The "Got it" button label on the PWA step (previously hardcoded Dutch as "Begrepen")

## Adding New Languages Manually

If you can't wait for Transifex sync, you can drop a translation file directly:

1. Create `l10n/<lang>.json` (e.g., `pt_BR.json`) following Nextcloud's translation format
2. Place it in IntroVox's `l10n/` directory
3. Restart Nextcloud (or wait for app cache to refresh)
4. The new language appears in **Available languages**

For custom languages not in the default list, you also need to add the language code to `AdminController::getAvailableLanguages()` and provide defaults via `AdminController::getDefaultStepsForLanguage()`. The Transifex flow is preferred to avoid this code change.

## Fallback Strategy

| User language | IntroVox response |
|---|---|
| In `enabled_languages` and has `l10n/<lang>.json` | Shows steps in that language |
| Has `l10n/<lang>.json` but **not** in `enabled_languages` | Returns `languageDisabled: true`; tour does not start |
| Not in `enabled_languages` and no `l10n/<lang>.json` | Falls back to English steps |

This intentional design avoids surprising users with the tour in an unfamiliar language — they see the clear "not available in your language" message instead.

## See Also

- [Language Management](../admin/language-management.md) — enable/disable languages
- [Transifex Integration](../architecture/transifex-integration.md) — translation workflow
- [API Reference](../architecture/api-reference.md) — language-aware endpoints
