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
│  │  │ (wizard_*) │  │ (wizard_*, tours_*, tour_*)   │   │   │
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
| `src/main.js` | Small bootstrap on every Nextcloud page: decides whether a tour runs (`src/runtime/chooseTour.mjs`) and only then loads the tour code |
| `src/runtime/tour.js` | The tour chunk: mounts `WizardManager`; loaded only on a page where a tour runs |
| `src/admin.js` | Admin settings UI entry point |
| `src/personal.js` | Personal settings UI entry point |
| `src/components/WizardManager.vue` | Manages Shepherd.js tour lifecycle and step rendering, for the welcome tour and tours for apps |
| `src/admin/ToursList.vue`, `src/admin/NewTourDialog.vue` | The admin's Tours pane: the list of tours, and making or changing a tour for an app |
| `src/components/SupportSettings.vue` | Enterprise subscription UI in admin Support tab |
| `src/components/wizardSteps.js` | Default step definitions wrapped in `t('introvox', ...)` |

Technology stack: Vue 3 (Composition API), webpack, [Shepherd.js](https://shepherdjs.dev/), `@nextcloud/vue`.

See [Frontend Architecture](frontend-architecture.md).

### Backend (PHP)

| Component | Responsibility |
|---|---|
| `AdminController` | Admin CRUD for the steps of every tour, languages, settings; export/import |
| `ToursController` | Admin: the tours themselves (list, create, change, delete, show again) |
| `ApiController` | Endpoints for every logged-in user: `getWizardSteps`, `tourEvent`, tracking events |
| `LicenseController` | Enterprise subscription validation and stats |
| `PersonalController` | Per-user tour preferences (`wizard_disabled`, `tours_disabled`) and the user's list of tours for apps |
| `TourRepository`, `TourStateService`, `TourValidator` | The tours, per-user tour state, and checking a tour before it is stored |
| `TelemetryService` | Aggregates anonymous usage stats; ships to license server |
| `LicenseService` | Validates subscription keys against `licenses.voxcloud.nl` |
| `TelemetryJob` | Background job that ships telemetry on a daily cadence |
| `LicenseUsageJob` | Background job that syncs license state daily (with stable jitter) |
| `LoadScripts` | Event listener that loads IntroVox's bootstrap on every page, with the `introvox/runtime` initial state |
| `AdminSettings` / `PersonalSettings` | Nextcloud Settings page integration |

See [Backend Architecture](backend-architecture.md).

### Storage Model

| Storage | Use |
|---|---|
| `oc_appconfig` | Global settings (`wizard_enabled`, `wizard_version`); per-language admin overrides of the welcome tour (`wizard_steps_<lang>`, only present when an admin saved one); the tour index (`tours`) and the steps of tours for apps (`tour_steps_<id>_<lang>`); telemetry preferences |
| `oc_preferences` | Per-user state (`introvox/wizard_disabled`, `tours_disabled`, `tour_<id>_seen` / `_completed` / `_skipped` / `_reached`, `checklist_<id>`, `checklist_uploaded`, telemetry timestamps for `markUserStarted/Completed/Skipped`) |
| Browser localStorage | Frontend-only completion state of the welcome tour (`introvox_completed`, `introvox_version`); checked against `wizard_version` to decide auto-restart |

No custom database tables — IntroVox stays within Nextcloud's standard storage abstractions.

## Integration Points

### Nextcloud Services

IntroVox depends on these Nextcloud APIs:

- **`OCP\IConfig`** — global and per-user configuration
- **`OCP\IL10N`** — translation context (admin/personal UI strings)
- **`OCP\L10N\IFactory`** — `findLanguage(null)` for raw user-locale detection (v1.7.0+, deliberately bypasses per-app validation that silently rerouted on missing translations), `getLanguages()` for the override-picker display names, and `get('introvox', $lang)` to build the auto-translated default tour for any language
- **`OCP\IGroupManager`** — group membership checks for step filtering
- **`OCP\IUserSession`** — current-user lookup
- **`OCP\Util::hasExtendedSupport`** — Enterprise tier detection (v1.5.0+)
- **Nextcloud Settings sections** — admin and personal settings pages
- **Background jobs** — `TimedJob` for telemetry and license sync

### External Services

- **`licenses.voxcloud.nl`** — Enterprise subscription validation and telemetry collection (v1.4.x+)

## Request Flow: Tour Start

```
Browser                  IntroVox Frontend            IntroVox Backend
   │                              │                          │
   │── any page ─────────────────────────────────────────────▶│
   │                              │                          │── LoadScripts: js/main.js,
   │                              │                          │   lazy 'runtime' initial state
   │                              │                          │   (switches, welcome version,
   │                              │                          │    app tours due for this user)
   │◀─ page + runtime state ─────────────────────────────────│
   │── main.js (small) ──────────▶│                          │
   │                              │── chooseTour(): no tour? │
   │                              │   stop, no request       │
   │                              │── load 'tour' chunk      │
   │                              │── GET /api/steps         │
   │                              │   (?tour=<id> for an     │
   │                              │    app tour) ───────────▶│
   │                              │                          │── welcome: wizard_steps_<lang>, or the
   │                              │                          │   translated defaults (DefaultStepsService)
   │                              │                          │── app tour: tour_steps_<id>_<lang>;
   │                              │                          │   404 when it is not for this user
   │                              │                          │── filter by visibleToGroups
   │                              │◀─ steps[] ───────────────│
   │                              │── wait for the app       │
   │                              │── Shepherd.start()       │
   │                              │── POST /api/wizard/start │
   │                              │   or /api/tours/<id>/event ▶│── count it / mark it seen
   │◀─ tour appears ──────────────│                          │
```

See [Frontend Architecture](frontend-architecture.md) for the order of the rules in `chooseTour()`.

## Security Model

- **CSRF protection** restored in v1.5.0 on all state-changing admin endpoints
- **Defensive admin checks** via `IGroupManager::isAdmin()` on every admin endpoint, in addition to the framework's annotation-based check
- **Step HTML** is checked on save and import (`StepValidator`: known fields, types, lengths) and cleaned when shown: `sanitizeStepHtml()` (DOMPurify) keeps only basic formatting and links, so imported files and Transifex translations cannot add markup. Up to 1.6.x `OCP\Util::sanitizeHTML` escaped it on save; `UnescapeLegacyWizardStepHtml` repairs steps stored that way
- **Server-side group filtering** — `visibleToGroups` is enforced in the API layer; hidden steps are never sent to the client
- **HTTP response validation** on license-server calls — `LicenseService` checks status codes and JSON shape before trusting responses (v1.5.0+)

## Resilience

- **Defensive `is_array()` guard** in `ApiController::getWizardSteps` (v1.4.3+) — if `wizard_steps_<lang>` doesn't decode to a JSON array, the backend falls back to defaults rather than crashing
- **App-menu readiness fallback selectors + 10s timeout** (v1.4.2+) — tour won't hang indefinitely if menu selectors don't match
- **Steps wait for a missing element** — a step whose element isn't there yet waits aside in the bottom right corner with its text (bottom left while a dialog is open), leaves the page usable, and moves to the element once it appears; **Next** still goes on. Up to 1.7.x such a step was shown centered (v1.4.1+), before that it was skipped

## See Also

- [API Reference](api-reference.md) — REST endpoints
- [Frontend Architecture](frontend-architecture.md) — Vue 3 + Shepherd.js details
- [Backend Architecture](backend-architecture.md) — PHP controllers and services
- [Transifex Integration](transifex-integration.md) — l10n workflow
