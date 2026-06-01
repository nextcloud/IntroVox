# Transifex Integration

IntroVox participates in Nextcloud's central [Transifex](https://www.transifex.com/nextcloud/nextcloud/) translation pool since v1.6.0. This document describes the translation workflow, the file conventions, and the auto-discovery mechanisms that let new languages appear without code changes.

## Required Files

These files are in place in the IntroVox repository and configure Transifex sync:

| File | Purpose |
|---|---|
| `.tx/config` | Transifex resource configuration (PO format, points the sync bot at the right files) |
| `l10n/.gitkeep` | Keeps the `l10n/` directory tracked in git even before any translations land |
| `.l10nignore` | Exclusions for the Nextcloud l10n sync bot (e.g., docs/, .gitea/) |

## Translation Flow

```
Translator on Transifex
    │
    │ (1) translates strings
    ▼
Transifex resource
    │
    │ (2) NC l10n sync bot pulls translations
    ▼
GitHub PR / direct commit
    │  l10n/<lang>.json + l10n/<lang>.js
    │
    │ (3) merged into IntroVox repo
    ▼
Next IntroVox release
    │
    │ (4) tarball includes new language files
    ▼
Admin's Nextcloud instance
    │
    │ (5) IntroVox auto-discovers the language
    ▼
"Available languages" checklist
    │
    │ (6) admin enables the language
    ▼
Users with that NC language setting see the wizard in their language
```

## Auto-Discovery Mechanisms

IntroVox uses two auto-discovery patterns to make new languages "just work" without code changes.

### Language Code Discovery

`AdminController::getAvailableLanguagesWithMetadata()` (and `ApiController::getAvailableLanguages()`) scan the `l10n/` directory:

```php
foreach (scandir($l10nPath) as $file) {
    if (preg_match('/^([a-z]{2}(_[A-Z]{2})?)\.json$/', $file, $matches)) {
        $availableLanguages[] = substr($matches[1], 0, 2);  // base language code
    }
}
```

This means any `l10n/<lang>.json` file dropped into the app instantly appears in **Available languages** — no source code change, no PHP update.

### Display Name Discovery (v1.6.0+)

Language picker labels (e.g., "Nederlands", "Português") are sourced from `OCP\L10N\IFactory::getLanguages()` — Nextcloud's built-in localized-language-name database.

Before v1.6.0, IntroVox maintained a hardcoded map of language codes to display names (and emoji flags). Adding a new language required a code change. Since v1.6.0, the map is gone — Nextcloud provides the names, including correct localization (an English user sees "German", a German user sees "Deutsch").

The picker also no longer shows emoji flags, matching the Nextcloud Settings convention.

## English as Transifex Source (v1.6.0+)

Pre-v1.6.0, default step content used opaque translation keys:

```js
t('introvox', 'step_welcome_title')   // ← bad, translators see a key
```

This surfaced unusable msgids to Transifex translators, who had no context for what `step_welcome_title` should mean.

Since v1.6.0, default content uses English source strings as Transifex msgids:

```js
t('introvox', '👋 Welcome to Nextcloud')   // ← good, translators see real text
```

Translators on Transifex now see the actual English text and translate it directly. This applies to:

- All 16 default wizard step titles and texts
- ~50 PWA install instruction strings (covering 9 OS/browser combos)
- All admin and personal settings UI strings
- The previously-Dutch-hardcoded "Begrepen" button (now `t('introvox', 'Got it')`)

**Existing customized step content** stored in `oc_appconfig.wizard_steps_<lang>` is **not** affected by this change — only the built-in defaults use the new pattern.

## PWA Install Instructions (v1.6.0+)

The wizard includes a PWA install step that detects the user's OS and browser and shows tailored instructions. Pre-v1.6.0, all ~40 strings in `src/utils/deviceDetection.js` and `src/components/wizardSteps.js` were hardcoded Dutch literals, displayed to non-Dutch users as-is.

Since v1.6.0, every PWA string is wrapped in `t('introvox', '<English source>')`. Existing Dutch translations are preserved (they're now sourced from `l10n/nl.json` rather than hardcoded), and other languages fall back to English until Transifex syncs translations.

## Local Translation Workflow

For developers updating translations during development:

```bash
# After editing l10n/<lang>.json (manual or via Transifex pull):
python3 regenerate_js_translations.py

# Then build:
npm run build
```

The Python script converts `l10n/<lang>.json` files into the `l10n/<lang>.js` format that webpack picks up at build time. Both `.json` and `.js` files are shipped in the App Store tarball.

## Removed: `DefaultStepsService` (v1.6.0+)

`lib/Service/DefaultStepsService.php` was removed in v1.6.0. It contained hardcoded Dutch defaults and was never instantiated. Default step content now lives entirely in `src/components/wizardSteps.js` with proper `t()` wrapping.

## Adding a New Language

1. **Via Transifex** (preferred): contribute translations on [Transifex](https://www.transifex.com/nextcloud/nextcloud/) → wait for the NC sync bot to commit them → wait for the next IntroVox release.
2. **Manually**: drop a `l10n/<lang>.json` file into the app directory. The language appears in **Available languages** on the next page load.

For full admin instructions see [Language Management → Adding New Languages](../admin/language-management.md#adding-new-languages).

## See Also

- [Multi-Language Support](../features/multi-language.md) — user-facing description
- [Language Management](../admin/language-management.md) — admin configuration
- [Frontend Architecture](frontend-architecture.md) — how translations are loaded at runtime
