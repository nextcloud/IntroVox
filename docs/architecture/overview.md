# Architecture Overview

This document gives a technical overview of IntroVox's architecture for architects, developers, and IT decision-makers.

## System Overview

IntroVox is a Nextcloud app that follows Nextcloud's standard app architecture: a PHP backend exposing REST endpoints, a Vue 3 frontend bundled with webpack, and state stored in Nextcloud's `appconfig` and `preferences` tables.

```
┌──────────────────────────────────────────────────────────────┐
│                       Nextcloud Server                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  Files / Apps   │  │     IL10N · IGroupManager       │  │
│  │     menu        │  │     IUserSession · IConfig      │  │
│  └────────┬────────┘  └──────────────┬───────────────────┘  │
│           │                          │                       │
│  ┌────────┴──────────────────────────┴────────────────────┐ │
│  │                     IntroVox App                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ Vue Frontend │──│ PHP REST API │──│ Background   │ │ │
│  │  │ Shepherd.js  │  │ Controllers  │  │ Jobs         │ │ │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘ │ │
│  │                           │                            │ │
│  │  ┌────────────────────────┴──────────────────────┐    │ │
│  │  │              Services                          │    │ │
│  │  │  TelemetryService · LicenseService            │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│  ┌───────────────────────────┴───────────────────────────┐   │
│  │                  Nextcloud Database                    │   │
│  │  ┌────────────┐  ┌───────────────────────────────┐   │   │
│  │  │ appconfig  │  │ preferences (per-user)        │   │   │
│  │  │ (wizard_*) │  │ (introvox/permanent_disable)  │   │   │
│  │  └────────────┘  └───────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  licenses.voxcloud.nl
              (telemetry + subscription validation)
```

## Core Components

### Frontend (Vue 3 + Shepherd.js)

| Component | Responsibility |
|---|---|
| `src/App.vue` | Root Vue component mounted on every Nextcloud page |
| `src/main.js` | App entry point; bootstraps the wizard and registers global handlers |
| `src/admin.js` | Admin settings UI entry point |
| `src/personal.js` | Personal settings UI entry point |
| `src/components/WizardManager.vue` | Manages Shepherd.js tour lifecycle and step rendering |
| `src/components/SupportSettings.vue` | Enterprise subscription UI in admin Support tab |
| `src/components/wizardSteps.js` | Default step definitions wrapped in `t('introvox', ...)` |

Technology stack: Vue 3 (Composition API), webpack, [Shepherd.js](https://shepherdjs.dev/), `@nextcloud/vue`.

See [Frontend Architecture](frontend-architecture.md).

### Backend (PHP)

| Component | Responsibility |
|---|---|
| `AdminController` | Admin CRUD for steps, languages, settings; export/import |
| `ApiController` | Public-facing endpoints: `getWizardSteps`, tracking events |
| `LicenseController` | Enterprise subscription validation and stats |
| `PersonalController` | Per-user permanent-disable preference |
| `TelemetryService` | Aggregates anonymous usage stats; ships to license server |
| `LicenseService` | Validates subscription keys against `licenses.voxcloud.nl` |
| `TelemetryJob` | Background job that ships telemetry on a daily cadence |
| `LicenseUsageJob` | Background job that syncs license state daily (with stable jitter) |
| `LoadScripts` | Event listener that loads IntroVox's frontend on every page |
| `AdminSettings` / `PersonalSettings` | Nextcloud Settings page integration |

See [Backend Architecture](backend-architecture.md).

### Storage Model

| Storage | Use |
|---|---|
| `oc_appconfig` | Global settings (`wizard_enabled`, `enabled_languages`, `wizard_version`); per-language step configurations (`wizard_steps_<lang>`); telemetry preferences |
| `oc_preferences` | Per-user state (`introvox/permanent_disable`, telemetry timestamps for `markUserStarted/Completed/Skipped`) |
| Browser localStorage | Frontend-only completion state (`seen` / `completed`); checked against `wizard_version` to decide auto-restart |

No custom database tables — IntroVox stays within Nextcloud's standard storage abstractions.

## Integration Points

### Nextcloud Services

IntroVox depends on these Nextcloud APIs:

- **`OCP\IConfig`** — global and per-user configuration
- **`OCP\IL10N`** — user language detection and translation
- **`OCP\IGroupManager`** — group membership checks for step filtering
- **`OCP\IUserSession`** — current-user lookup
- **`OCP\Util::sanitizeHTML`** — XSS prevention on step content (v1.5.0+)
- **`OCP\Util::hasExtendedSupport`** — Enterprise tier detection (v1.5.0+)
- **`OCP\L10N\IFactory`** — language display name auto-discovery (v1.6.0+)
- **Nextcloud Settings sections** — admin and personal settings pages
- **Background jobs** — `TimedJob` for telemetry and license sync

### External Services

- **`licenses.voxcloud.nl`** — Enterprise subscription validation and telemetry collection (v1.4.x+)

## Request Flow: Tour Start

```
Browser                  IntroVox Frontend            IntroVox Backend
   │                              │                          │
   │── login to NC ──────────────▶│                          │
   │                              │── GET /api/steps ───────▶│
   │                              │                          │── load wizard_enabled
   │                              │                          │── load enabled_languages
   │                              │                          │── detect IL10N->getLanguageCode()
   │                              │                          │── load wizard_steps_<lang>
   │                              │                          │── filter by visibleToGroups
   │                              │◀─ steps[] ───────────────│
   │                              │                          │
   │                              │── wait for app-menu ─────│
   │                              │── Shepherd.start() ──────│
   │                              │                          │
   │                              │── POST /api/wizard/start │
   │                              │                          │── TelemetryService->markUserStarted()
   │◀─ wizard appears ────────────│                          │
```

## Security Model

- **CSRF protection** restored in v1.5.0 on all state-changing admin endpoints
- **Defensive admin checks** via `IGroupManager::isAdmin()` on every admin endpoint, in addition to the framework's annotation-based check
- **HTML sanitization** via `OCP\Util::sanitizeHTML` on step `title` and `text` fields on save/update/import (v1.5.0+)
- **Server-side group filtering** — `visibleToGroups` is enforced in the API layer; hidden steps are never sent to the client
- **HTTP response validation** on license-server calls — `LicenseService` checks status codes and JSON shape before trusting responses (v1.5.0+)

## Resilience

- **Defensive `is_array()` guard** in `ApiController::getWizardSteps` (v1.4.3+) — if `wizard_steps_<lang>` doesn't decode to a JSON array, the backend falls back to defaults rather than crashing
- **App-menu readiness fallback selectors + 10s timeout** (v1.4.2+) — tour won't hang indefinitely if menu selectors don't match
- **Element-not-found fallback to centered display** (v1.4.1+) — steps with missing target elements render as centered modals instead of being silently skipped

## See Also

- [API Reference](api-reference.md) — REST endpoints
- [Frontend Architecture](frontend-architecture.md) — Vue 3 + Shepherd.js details
- [Backend Architecture](backend-architecture.md) — PHP controllers and services
- [Transifex Integration](transifex-integration.md) — l10n workflow
