# Language Management

IntroVox supports completely separate wizard steps per language. You can configure different content for each language, enable or disable specific languages, and add new languages via Transifex translations.

## Supported Languages

Out of the box, IntroVox includes:

- 🇬🇧 English (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Deutsch (`de`)
- 🇫🇷 Français (`fr`)
- 🇩🇰 Dansk (`da`)
- 🇸🇪 Svenska (`sv`)

Additional languages can be added without code changes — see [Adding New Languages](#adding-new-languages) and [Multi-Language Support](../features/multi-language.md).

## Enabling and Disabling Languages

1. Go to **Settings → Administration → IntroVox**
2. In the **Available languages** section, check or uncheck languages
3. The setting saves automatically on each change

**Constraints:**

- At least one language must be enabled (the last enabled language cannot be disabled)
- Default on first install: only English is enabled

**Effect of disabling a language:**

- Users with that language as their Nextcloud language setting cannot see the wizard
- In personal settings they see: *"The introduction tour is not available in your language."*

## How Language Detection Works

When a user logs in, IntroVox:

1. Reads the user's Nextcloud language code via `IL10N::getLanguageCode()`
2. Extracts the base language (`en_US` → `en`)
3. Scans `l10n/` to discover all languages that have a `<lang>.json` file
4. Checks whether the base language is in the **Available languages** allowlist
5. Loads `wizard_steps_<lang>` from appconfig, falling back to defaults if not configured
6. Falls back to English if the user's language is not available

See [ApiController::getWizardSteps()](../../lib/Controller/ApiController.php) for the implementation.

## Per-Language Step Configuration

Each language has its own independent set of wizard steps. To edit steps for a specific language:

1. Under **Language settings**, click the language dropdown
2. Choose a language (only enabled languages appear)
3. The step list reloads with that language's configuration
4. Make your changes
5. Click **💾 Save changes** to persist

> **Warning:** Switching languages with unsaved changes will discard them — you'll see a confirmation dialog.

**Example use cases:**

- **Region-specific tips**: Dutch users get steps mentioning Dutch Nextcloud cloud providers; international users see generic steps.
- **Cultural adaptation**: Adjust tone, examples, or emoji use per language.
- **Translation control**: Hand each language's JSON to a translator; reimport when done.

## Resetting One Language

To reset only one language to defaults:

1. Select the language from the dropdown
2. Click **🔄 Reset to default**
3. Confirm

Only that language's `wizard_steps_<lang>` is reset; other languages remain unchanged.

## Adding New Languages

IntroVox auto-discovers languages from the `l10n/` directory — no code changes needed.

1. Visit the [Nextcloud Transifex project](https://www.transifex.com/nextcloud/nextcloud/) and contribute or download translations for IntroVox
2. Drop the resulting `l10n/<lang>.json` file into the app directory
3. The new language appears in the **Available languages** checkboxes automatically
4. Enable it and optionally customize its wizard steps

For the full Transifex flow see [Transifex Integration](../architecture/transifex-integration.md).

## Default Step Content per Language

When a language has no custom configuration, IntroVox uses built-in default steps wrapped in `t('introvox', '<English source>')`. As of v1.6.0, these source strings serve as Transifex msgids, so translators see the actual English content rather than opaque keys like `step_welcome_title`.

The defaults cover:

- Welcome to Nextcloud
- File management
- Calendar
- Search functionality
- Important features
- Useful tips
- Conclusion

## See Also

- [Multi-Language Support](../features/multi-language.md) — Transifex integration details
- [Transifex Integration](../architecture/transifex-integration.md) — l10n workflow
- [Managing Wizard Steps](managing-steps.md) — Edit steps per language
- [Settings](settings.md) — Available languages reference
