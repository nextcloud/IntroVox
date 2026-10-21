# Getting Started with IntroVox

IntroVox is a Nextcloud app with guided tours: a welcome tour after a user's first login, and short tours that start the first time someone opens an app or a page. Tour content can be changed per language, and steps and tours can be limited to groups for role-based onboarding.

This guide helps you get started quickly based on your role.

## What is IntroVox?

IntroVox shows people around Nextcloud with tours:

- The **welcome tour** starts after a user's first login, on the first page they open. Its 8 default steps (Welcome to Nextcloud, Files & apps, Search, Your account & settings, Getting started, Important features, Useful tips, Done!) are translated through Transifex (`nextcloud/introvox` resource) into every language Nextcloud's translators cover. Three of them point at the apps menu, the search and the account menu; the others are centered
- **Tours for apps and pages** start the first time someone opens an app, such as Talk, or another page of Nextcloud; a tour that starts anywhere comes on whichever page someone opens next. Built-in tours for Files, Talk, Deck and Calendar come ready to switch on ([Tours](admin/tours.md))
- A step can go on when the user clicks its element or fills in a field, wait until what the user opened is there, and show an image, GIF or video
- Each user can skip or restart a tour, start any tour from their personal settings (**Tours** in the user menu leads there), or stop tours from starting by themselves
- Administrators replace the default text per language, limit steps and tours to groups, choose who gets a tour and when, share a tour with a link, see how far people get, move a tour to another Nextcloud, and translate or write steps with AI through the Nextcloud Assistant
- An optional **Getting started** checklist on the Dashboard lists first things to do and ticks itself off ([Checklist on the Dashboard](admin/settings.md#checklist-on-the-dashboard))

Behind the scenes the tour engine is [Shepherd.js](https://shepherdjs.dev/), wrapped in a Vue 3 frontend with a PHP backend that stores configuration in Nextcloud's `appconfig` table.

## Quick Start by Role

### Users

1. Log in to Nextcloud — the welcome tour starts after a short delay, on the first page you open (if your administrator has it on)
2. Click **Next** / **Back**, or use the left and right arrow keys
3. Press `Esc` or click **✕** to close the tour. It then does not start by itself again in this browser; in another browser it does
4. Click **Done** on the last step, or **Skip and don't show again** on the first, so the welcome tour doesn't start by itself again
5. Run it again with **Personal Settings → IntroVox → Restart tour now**; the other tours are listed there under **Tours**, each with **Start**. **Tours** in your user menu leads there
6. To stop all tours from starting by themselves, switch off **Start tours by themselves** in **Personal Settings → IntroVox**

See [User Overview](user/overview.md) and [Taking the Tour](user/taking-the-tour.md) for the full walkthrough.

### Administrators

1. Install IntroVox from the Nextcloud App Store (or via `occ app:install introvox`)
2. Go to **Settings → Administration → IntroVox**
3. Check that **Tours for everyone** is on (it is after installing) — the welcome tour then runs in every language Nextcloud supports, no per-language opt-in needed
4. Only if you want custom copy for a specific language: open **Tours**, click **Edit steps** on the **Welcome tour**, click **Add language override**, pick a language and edit
5. Optionally restrict steps to specific groups for [role-based onboarding](admin/group-visibility.md)
6. Optionally switch on a **Built-in** tour, or add a tour of your own: **Tours** → **New tour** ([Tours](admin/tours.md))
7. Optionally offer the checklist: **Show "Getting started" on the Dashboard** under **Settings**

See the [Admin Guide](admin/guide.md), [Tours](admin/tours.md) and [Managing Tour Steps](admin/managing-steps.md) for detailed configuration.

### Architects

Before evaluating IntroVox at scale, read:

- [Architecture Overview](architecture/overview.md) — Vue 3 frontend, Shepherd.js tour engine, PHP backend, appconfig storage
- [API Reference](architecture/api-reference.md) — public + admin endpoints
- [Multi-Language Support](features/multi-language.md) — Transifex integration and auto-discovery of language files

## Key Concepts

| Concept | Description |
|---|---|
| **Tour** | A set of steps. The **welcome tour** starts after a user's first login; a tour for an app or page starts the first time a user opens it; a tour that starts anywhere, on whichever page they open next. |
| **Built-in tour** | A ready-made tour for Files, Talk, Deck or Calendar, translated like the welcome tour. Switched off until you switch it on. |
| **Wizard step** | A single tour step with a title, HTML content, an optional image or video, an optional CSS selector to highlight an element, a position (left/right/top/bottom), and how it continues: **Next button**, **Click on the element** or **Filling in the field**. |
| **Centered step** | A step with no CSS selector — appears as a centered modal. Used for welcome and conclusion screens. |
| **Attached step** | A step with a CSS selector — appears next to the highlighted element, which gets an outline and a blinking arrow. While the element is not there yet, the step waits aside in a corner and moves to it once it appears. |
| **Language override** | Custom per-language copy that replaces the auto-translated defaults. Made per base language (one for `pt` also serves `pt_BR`), stored in appconfig under `wizard_steps_<lang>`, only created when an admin saves edits. |
| **Group visibility** | Steps can be restricted to specific Nextcloud groups via the `visibleToGroups` field. Empty = visible to all users. |
| **Default steps** | Built-in step definitions auto-translated via Transifex; loaded when no custom configuration exists for a language. |
| **Wizard version** | A counter (`wizard_version`) raised by **Show again to everyone** on the welcome tour — the frontend uses it to decide whether to show the welcome tour again. |

## Architectural Highlights

- **Native Nextcloud integration** — uses NC's `IConfig` for storage, `IL10N` for language detection, `IGroupManager` for group filtering, and `IUserSession` for per-user state.
- **A small script on every page** — every page loads a bootstrap of about 20 KB. It decides from the page's initial state whether a tour starts, without a request, and loads the tour code only then ([Frontend Architecture](architecture/frontend-architecture.md#tour-runtime)).
- **Server-side group filtering** — `visibleToGroups` enforcement happens in the PHP backend ([ApiController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)), so users cannot see hidden steps via browser tools.
- **Transifex-driven translations** — the `nextcloud/introvox` Transifex resource feeds every default tour string. New language files (`l10n/<lang>.json`) land via the Nextcloud sync bot and reach users with the next IntroVox release; no code changes required and admins don't need to opt them in. A user gets their full language (`pt_BR`), else its base language, else English.

## Next Steps

- [User Overview](user/overview.md) — Taking the tour
- [Admin Guide](admin/guide.md) — Setup and configuration
- [Tours](admin/tours.md) — The welcome tour and tours for apps
- [Managing Tour Steps](admin/managing-steps.md) — Step CRUD
- [Architecture Overview](architecture/overview.md) — System design

## See Also

- [Multi-Language Support](features/multi-language.md) — Adding new languages via Transifex
- [Group-Based Visibility](admin/group-visibility.md) — Role-based onboarding
- [Installation](deployment/installation.md) — App Store and manual install
