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
    │ (5) Users in that NC language see the wizard auto-translated, no admin action needed
    ▼
End user sees the tour in their language
```

Since v1.7.0 there is no admin opt-in step — every translation that ships in `l10n/` becomes available immediately. Admins only intervene if they want a per-language **override** (custom copy that replaces the auto-translated default for one specific language).

## Auto-Discovery Mechanisms

### Display Name Discovery (v1.6.0+)

The "+ Add language override" picker labels (e.g., "Nederlands", "Português") come from `OCP\L10N\IFactory::getLanguages()` — Nextcloud's built-in localized-language-name database. Every language Nextcloud knows about is selectable, not just the ones IntroVox already has a translation file for. This means an admin can author an override for a language that Transifex hasn't covered yet.

Before v1.6.0, IntroVox maintained a hardcoded map of language codes to display names (and emoji flags). Since v1.6.0 the map is gone — NC provides the names, correctly localised (an English admin sees "German", a German admin sees "Deutsch"). No emoji flags, matching the Nextcloud Settings convention.

### Translation Resolution at Runtime

`ApiController::getWizardSteps()` uses `IFactory::findLanguage(null)` to obtain the user's raw language preference (deliberately not `findLanguage('introvox')`, which would re-route to a language IntroVox happens to ship a translation file for). `DefaultStepsService::getForLanguage($lang)` then builds the eight default steps via `IFactory::get('introvox', $lang)`, with an explicit English fallback when `$lang` has no translation file — never the system default language.

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

## Reintroduced: `DefaultStepsService` (v1.7.0+)

A `DefaultStepsService` was originally removed in v1.6.0 because it shipped hardcoded Dutch defaults and was dead code. It was **reintroduced** in v1.7.0 — this time as the single source of truth for the eight built-in steps, shared between `AdminController` (editor view seed) and `ApiController` (end-user fetch). It uses `IFactory::get('introvox', $lang)` to render via Transifex, with explicit English fallback when the requested language has no translation file.

This is what made it possible to remove the legacy `useDefault: true` + empty-steps response pattern: the API now returns the full inline-translated step set in every response, so the client never has to rebuild defaults locally (which had been re-translating them through the browser-loaded Vue bundle, sometimes in the wrong language).

## Adding a New Language

1. **Via Transifex** (only path): contribute translations on [Transifex](https://www.transifex.com/nextcloud/nextcloud/) → the NC sync bot opens a PR to commit them → the next IntroVox release ships the new translations and end users in that language immediately get the auto-translated tour. No admin action required.
2. **Authoring a custom override locally**: an admin can add a `wizard_steps_<lang>` override row through the UI for any language Nextcloud supports, even before a Transifex translation exists. The override wins until it's reset, at which point Transifex takes over.

For full admin instructions see [Language Management](../admin/language-management.md).

## See Also

- [Multi-Language Support](../features/multi-language.md) — user-facing description
- [Language Management](../admin/language-management.md) — admin configuration
- [Frontend Architecture](frontend-architecture.md) — how translations are loaded at runtime
