# Backend Architecture

IntroVox's PHP backend follows Nextcloud's standard app structure: controllers expose REST endpoints, services hold business logic, background jobs handle periodic tasks, and listeners hook into Nextcloud lifecycle events.

## Directory Layout

```
lib/
├── AppInfo/
│   └── Application.php          ← Bootstrap, DI registration, event listener wiring
├── Controller/
│   ├── AdminController.php      ← Admin CRUD (steps, settings, languages, groups, statistics)
│   ├── ApiController.php        ← Public endpoints: getWizardSteps + tracking
│   ├── LicenseController.php    ← Enterprise subscription validation (v1.4.x+)
│   └── PersonalController.php   ← Per-user permanent_disable preference
├── Service/
│   ├── DefaultStepsService.php  ← Single source of truth for the eight built-in tour steps (v1.7.0+)
│   ├── TelemetryService.php     ← Aggregate usage tracking, sends to license server
│   └── LicenseService.php       ← Subscription validation against licenses.voxcloud.nl
├── BackgroundJob/
│   ├── TelemetryJob.php         ← Daily telemetry ship (TimedJob)
│   └── LicenseUsageJob.php      ← Daily license sync with stable jitter
├── Listener/
│   └── LoadScripts.php          ← Loads main.js on every Nextcloud page
└── Settings/
    ├── AdminSection.php         ← Settings → Administration → IntroVox entry
    ├── AdminSettings.php        ← Admin settings page integration
    ├── HelpSection.php          ← Settings → Personal → Help entry (legacy)
    └── PersonalSettings.php     ← Personal settings page integration
```

## Controllers

### `AdminController`

The largest controller (~30 KB) covering all admin operations:

- **Step CRUD** — `getSteps`, `saveSteps`, `addStep`, `updateStep`, `deleteStep`, `resetToDefault`
- **Import/Export** — `exportSteps`, `importSteps` with JSON validation
- **Settings** — `getSettings`, `saveSettings` (global toggles + enabled languages)
- **Language metadata** — `getAvailableLanguagesWithMetadata` (auto-discovered from `l10n/`)
- **Groups** — `getGroups` for the **Visible to groups** dropdown
- **Statistics** — `getStatistics`, `toggleTelemetry`, `sendTelemetryNow`

All admin endpoints (since v1.5.0):

- Use `IGroupManager::isAdmin()` as a defensive double-check on top of `@AdminRequired`
- Sanitize step `title` and `text` via `OCP\Util::sanitizeHTML` on write/import
- Enforce CSRF on state-changing POSTs

### `ApiController`

Public-facing endpoints, all annotated `@NoAdminRequired` (and `@NoCSRFRequired` for read-only `getWizardSteps`):

- **`getWizardSteps`** — language-aware, group-filtered step list. Includes defensive `is_array()` guard (v1.4.3+) for corrupt config blobs.
- **`trackWizardStart`** / **`trackWizardComplete`** / **`trackWizardSkip`** — fire telemetry events via `TelemetryService`

See [ApiController.php](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) and [API Reference](api-reference.md).

### `LicenseController` (v1.4.x+)

Enterprise subscription endpoints:

- `getStats` — current subscription status and step-count usage per language
- `saveSettings` — store the subscription key in appconfig
- `validate` — call out to `licenses.voxcloud.nl` to verify the key
- `updateUsage` — report current usage to the license server

### `PersonalController`

Two endpoints for the per-user permanent-disable preference:

- `getSettings` — read `permanent_disable` from `oc_preferences`
- `saveSettings` — write `permanent_disable`

## Services

### `DefaultStepsService` (v1.7.0+)

Single source of truth for the eight built-in tour steps (Welcome / Files / Calendar / Search / Getting started / Important features / Useful tips / Done). Used by both `AdminController` (to seed the Steps editor when no override exists) and `ApiController` (to serve end users when no override exists).

`getForLanguage(string $lang)` returns the eight steps built with `IFactory::get('introvox', $lang)`. If no translation file ships for `$lang`, the service explicitly falls back to English rather than letting `IFactory` pick the system default — so an Italian user without an Italian translation gets English copy, not whatever the instance's `default_language` happens to be.

### `TelemetryService`

Tracks per-user wizard lifecycle events (start, complete, skip) and aggregates them into anonymous statistics. Uses `oc_preferences` to record per-user timestamps.

The aggregate payload includes:

- User counts (via `callForAllUsers` — uses all provisioned users since v1.4.3, was `callForSeenUsers` before, with a minimum of `1` so downstream consumers never see `0`)
- Subscription key + `hasExtendedSupport` flag (v1.5.0+) for license-server verification
- Tour-completion counts per language

`HTTP response validation` (v1.5.0+) — checks status codes and JSON shape before trusting responses, preventing false-positive license validations on transient server errors.

### `LicenseService`

Validates subscription keys against `licenses.voxcloud.nl`. Handles:

- Free tier: 10 steps per language
- Subscription tier: unlimited steps, full feature set
- Connection failure: cached status used, no functional degradation

## Background Jobs

Both jobs extend Nextcloud's `TimedJob`:

### `TelemetryJob`

Runs daily. Calls `TelemetryService` to ship aggregate stats to the license server.

### `LicenseUsageJob`

Runs daily with **stable jitter** to spread load across installations — derived from a hash of the instance ID so each NC server fires at a consistent but different time of day. This avoids the thundering-herd problem when many instances sync at midnight UTC.

## Listeners

### `LoadScripts`

Listens for `BeforeTemplateRenderedEvent` (or similar lifecycle event) to inject `js/main.js` and `css/wizard.css` on every Nextcloud page where the user is logged in.

This is what makes the wizard ambient — it's available on every page, not just the dashboard. The decision to actually display the tour happens client-side in `App.vue`.

## Settings Integration

| Class | Nextcloud section | Purpose |
|---|---|---|
| `AdminSection` | Settings → Administration | Registers the IntroVox sidebar entry |
| `AdminSettings` | Settings → Administration → IntroVox | Renders `admin.js` into the settings page |
| `PersonalSettings` | Settings → Personal → IntroVox | Renders `personal.js` into the settings page |
| `HelpSection` | (legacy) | Older personal-settings location, kept for backward compat |

## Storage Schema

IntroVox does not create custom database tables. All persistent state lives in Nextcloud's existing tables.

### `oc_appconfig` keys

| Key | Type | Purpose |
|---|---|---|
| `wizard_enabled` | string `'true'` / `'false'` | Global on/off |
| `wizard_version` | integer string | Bumped by **Show wizard to all users** to force re-show |
| `wizard_steps_<lang>` | JSON array of step objects | Per-language admin override; only present when an admin saved one |
| `subscription_key` | string | Enterprise subscription key (v1.4.x+) |
| `telemetry_enabled` | string `'true'` / `'false'` | Whether telemetry is active |

> The `enabled_languages` key was used pre-1.7.0 to gate which languages the wizard would start in. It was removed alongside #17. Installs upgraded from 1.6.x may still carry a stale row; the 1.7.0 code ignores it.

### `oc_preferences` keys (per user, app `introvox`)

| Key | Type | Purpose |
|---|---|---|
| `permanent_disable` | string `'1'` / `'0'` | Per-user permanent-disable preference |
| `wizard_started_at` | timestamp | When the user first started the wizard |
| `wizard_completed_at` | timestamp | When the user completed it |
| `wizard_skipped_at` | timestamp | When the user clicked **Skip and don't show again** |

## Security Model

- **CSRF protection** restored in v1.5.0 on all state-changing admin endpoints
- **Defensive admin checks** via `IGroupManager::isAdmin()` on every admin endpoint
- **HTML sanitization** via `OCP\Util::sanitizeHTML` on step content
- **Server-side group filtering** — `visibleToGroups` enforcement in `ApiController::getWizardSteps`
- **HTTP response validation** on license-server calls

See [Architecture Overview → Security Model](overview.md#security-model).

## See Also

- [Architecture Overview](overview.md)
- [API Reference](api-reference.md) — full endpoint list
- [Frontend Architecture](frontend-architecture.md)
- [Transifex Integration](transifex-integration.md)
