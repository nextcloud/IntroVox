# Getting Started with IntroVox

IntroVox is a Nextcloud app that gives new users a guided, step-by-step tour through Nextcloud's main features on first login. Tour content is fully customizable per language, and steps can be restricted to specific user groups for role-based onboarding.

This guide helps you get started quickly based on your role.

## What is IntroVox?

IntroVox shows new users an interactive onboarding tour the first time they log in. The tour:

- Highlights key Nextcloud UI elements (Files, Calendar, Search, Settings, etc.)
- Supports 6 languages out of the box (EN, NL, DE, DA, FR, SV) with Transifex-ready translation infrastructure
- Lets each user skip, restart, or permanently disable it
- Lets administrators configure steps per language and per user group

Behind the scenes the tour engine is [Shepherd.js](https://shepherdjs.dev/), wrapped in a Vue 3 frontend with a PHP backend that stores configuration in Nextcloud's `appconfig` table.

## Quick Start by Role

### Users

1. Log in to Nextcloud — the tour starts automatically after a short delay (if your administrator has enabled it for your language)
2. Click **Next** / **Back** or use `Enter` / `Backspace` to navigate
3. Press `Escape` or click **✕** to close the tour (it will reappear next login)
4. Click **Done** on the final step or **Skip and don't show again** to permanently disable auto-start
5. Restart anytime via **Personal Settings → IntroVox → Restart tour now**

See [User Overview](user/overview.md) and [Taking the Tour](user/taking-the-tour.md) for the full walkthrough.

### Administrators

1. Install IntroVox from the Nextcloud App Store (or via `occ app:install introvox`)
2. Go to **Settings → Administration → IntroVox**
3. Toggle **Wizard enabled for all users**
4. Check the languages you want to support under **Available languages**
5. Per language, customize or import wizard steps via the language dropdown
6. Optionally restrict steps to specific groups for [role-based onboarding](admin/group-visibility.md)

See the [Admin Guide](admin/guide.md) and [Managing Wizard Steps](admin/managing-steps.md) for detailed configuration.

### Architects

Before evaluating IntroVox at scale, read:

- [Architecture Overview](architecture/overview.md) — Vue 3 frontend, Shepherd.js tour engine, PHP backend, appconfig storage
- [API Reference](architecture/api-reference.md) — public + admin endpoints
- [Multi-Language Support](features/multi-language.md) — Transifex integration and auto-discovery of language files

## Key Concepts

| Concept | Description |
|---|---|
| **Wizard step** | A single tour step with a title, HTML content, optional CSS selector to highlight an element, and a position (left/right/top/bottom). |
| **Centered step** | A step with no CSS selector — appears as a centered modal. Used for welcome and conclusion screens. |
| **Attached step** | A step with a CSS selector — appears next to the highlighted element with a glowing border. |
| **Language configuration** | Each language has its own independent set of wizard steps, stored in appconfig under `wizard_steps_<lang>`. |
| **Group visibility** | Steps can be restricted to specific Nextcloud groups via the `visibleToGroups` field. Empty = visible to all users. |
| **Default steps** | Built-in step definitions auto-translated via Transifex; loaded when no custom configuration exists for a language. |
| **Wizard version** | A counter (`wizard_version`) bumped by admin actions like "Show wizard to all users" — frontend uses it to decide whether to re-show. |

## Architectural Highlights

- **Native Nextcloud integration** — uses NC's `IConfig` for storage, `IL10N` for language detection, `IGroupManager` for group filtering, and `IUserSession` for per-user state.
- **Server-side group filtering** — `visibleToGroups` enforcement happens in the PHP backend ([ApiController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)), so users cannot see hidden steps via browser tools.
- **Transifex-ready translations** — new language files (`l10n/<lang>.json`) are automatically picked up; no code changes required.

## Next Steps

- [User Overview](user/overview.md) — Taking the tour
- [Admin Guide](admin/guide.md) — Setup and configuration
- [Managing Wizard Steps](admin/managing-steps.md) — Step CRUD
- [Architecture Overview](architecture/overview.md) — System design

## See Also

- [Multi-Language Support](features/multi-language.md) — Adding new languages via Transifex
- [Group-Based Visibility](admin/group-visibility.md) — Role-based onboarding
- [Installation](deployment/installation.md) — App Store and manual install
