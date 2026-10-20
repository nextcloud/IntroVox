# Backend Architecture

IntroVox's PHP backend follows Nextcloud's standard app structure: controllers expose REST endpoints, services hold business logic, background jobs handle periodic tasks, and listeners hook into Nextcloud lifecycle events.

## Directory Layout

```
lib/
├── AppInfo/
│   └── Application.php          ← Bootstrap, DI registration, event listener wiring
├── Controller/
│   ├── AdminController.php      ← Admin: steps of every tour, settings, languages, groups, statistics
│   ├── ToursController.php      ← Admin: the tours themselves (list, create, change, delete, show again, statistics, export, import)
│   ├── AssistantController.php  ← Admin: translating a tour and drafting steps with the Nextcloud Assistant
│   ├── ApiController.php        ← User endpoints: tour steps + tracking
│   ├── MediaController.php      ← Serves images, videos and captions of steps
│   ├── MediaUploadController.php ← Admin: adds media to steps
│   ├── LicenseController.php    ← Enterprise subscription validation (v1.4.x+)
│   └── PersonalController.php   ← Per-user tour preferences and the user's tour list
├── Service/
│   ├── DefaultStepsService.php  ← Single source of truth for the eight built-in tour steps (v1.7.0+)
│   ├── TourRepository.php       ← The tour index, the steps of tours for apps, who may get a tour
│   ├── TourStateService.php     ← Per-user tour state: seen, completed, skipped, Start tours by themselves
│   ├── TourValidator.php        ← Checks a tour and its trigger before it is stored
│   ├── TourOptOut.php           ← Who counts as having switched tours off, on the update to tours per app
│   ├── TourSchedule.php         ← When a tour may start by itself: days after the first login, between two dates
│   ├── BuiltinTours.php         ← The built-in tours for Files, Talk, Deck and Calendar, translated
│   ├── TourStats.php            ← How far people get: the per-user value and the totals per step
│   ├── TourStatistics.php       ← The numbers of one tour for the Statistics pane
│   ├── TourPackage.php          ← A whole tour as one .zip: writing it, and reading one that comes from anywhere
│   ├── TourTransfer.php         ← Exporting and importing a whole tour, media included
│   ├── TourAssistant.php        ← Assistant tasks for a tour: scheduling them, reading their answer
│   ├── TourPrompts.php          ← What the language model is asked, and how strictly its answer is read
│   ├── Checklist.php            ← The Dashboard checklist's tasks, an admin's choice of them, the default layout
│   ├── ChecklistService.php     ← The checklist's settings, and which tasks each user has done
│   ├── StepValidator.php        ← Checks steps (fields, types, sizes) on save and import
│   ├── MediaService.php         ← Stores, checks and serves step media
│   ├── TelemetryService.php     ← Aggregate usage tracking, sends to license server
│   └── LicenseService.php       ← Subscription validation against licenses.voxcloud.nl
├── Migration/
│   ├── IntroduceTours.php       ← Repair step: carries the old opt-out over to tours_disabled, once
│   ├── RemoveStaleDefaultWizardSteps.php
│   └── UnescapeLegacyWizardStepHtml.php
├── BackgroundJob/
│   ├── TelemetryJob.php         ← Daily telemetry ship (TimedJob)
│   └── LicenseUsageJob.php      ← Daily license sync with stable jitter
├── Dashboard/
│   └── ChecklistWidget.php      ← "Getting started" on the Dashboard (API v2 widget)
├── Listener/
│   ├── LoadScripts.php          ← Loads the main.js bootstrap and the runtime state on every page
│   └── UserMenuEntry.php        ← "Tours" in the user menu (LoadAdditionalEntriesEvent)
└── Settings/
    ├── AdminSection.php         ← Settings → Administration → IntroVox entry
    ├── AdminSettings.php        ← Admin settings page integration
    ├── HelpSection.php          ← Settings → Personal → IntroVox entry
    └── PersonalSettings.php     ← Personal settings page integration
```

## Controllers

### `AdminController`

The largest controller (~28 KB) covering admin operations other than the tours themselves:

- **Steps** — `getSteps`, `saveSteps`, `resetToDefault`. Each takes a `tour` parameter (default `welcome`): the welcome tour's steps live in `wizard_steps_<lang>` with the Transifex defaults behind them; any other tour's in `tour_steps_<id>_<lang>`, through `TourRepository`, with no defaults. An unknown tour gets a 404.
- **Import/Export** — `exportSteps`, `importSteps` with JSON validation, also per `tour`
- **Settings** — `getSettings`, `saveSettings`: **Tours for everyone** (`wizard_enabled`), and `showToAll`, which runs `TourRepository::showAgain('welcome')`
- **Languages** — `getAvailableLanguagesWithMetadata` (every language Nextcloud knows, from `IFactory::getLanguages()`), `listOverrides` (the languages of one tour)
- **Groups** — `getGroups` for the **Visible to groups** dropdown
- **Statistics** — `getStatistics`, `toggleTelemetry`, `sendTelemetryNow`, `markTelemetryAsked`
- **Admin tour** — `markIntroDone`

All admin endpoints (since v1.5.0):

- Use `IGroupManager::isAdmin()` as a defensive double-check on top of Nextcloud's own admin check (none has `#[NoAdminRequired]`)
- Check steps with `StepValidator` on save and import: known fields only, each of the right type and size. Title and text are stored as written; the HTML is cleaned where it is shown (`src/utils/stepHtml.js`)
- Require the CSRF token, like every IntroVox route but two (see [API Reference → CSRF Protection](api-reference.md#csrf-protection))

### `ToursController`

The tours themselves, admin only: `index`, `create`, `update`, `destroy`, `reshow`, and `apps` (the apps menu, for **Where does it start?**). Their steps go through `AdminController` with a tour id.

- `create` validates with `TourValidator`; a new tour is always switched off
- `update` on the welcome tour only takes `enabled`; switching any other tour on needs an enabled step in its main language (`needs_steps`)
- `update` and `destroy` refresh who may see the tour's media (`MediaService::refreshAccess()`)
- The list adds each tour's languages, its app's name and icon (read from the apps menu, never stored) and its step count

### `ApiController`

Endpoints for every logged-in user, all annotated `#[NoAdminRequired]`. Like every IntroVox endpoint they require the CSRF token; `tests-js/controller-security.test.js` fails the build if one opts out.

- **`getWizardSteps`** — language-aware, group-filtered step list. Without `tour`, or with `welcome`: the welcome tour, with a defensive `is_array()` guard (v1.4.3+) for corrupt config blobs. With another id: `appTourSteps()`, the steps of that tour in the user's language, its base language or the tour's main language.
- **`appTourSteps`** (private) — answers `404 { "success": false }` to everything refused: a malformed or unknown id, tours off, the tour off, a user outside its groups or without access to its app. One answer for all, so nothing shows which tours exist. It does not check whether the tour would start by itself, so a start by hand works.
- **`tourEvent`** — `start`, `complete` or `skip` of a tour for an app, for this user, behind the same 404 check. `start` stores the tour's version in `tour_<id>_seen` and says whether this was the first start at that version. Rate limited to 30 per hour per user (`#[UserRateLimit(limit: 30, period: 3600)]`).
- **`trackWizardStart`** / **`trackWizardComplete`** / **`trackWizardSkip`** — the welcome tour's telemetry events via `TelemetryService`; rate limited per user (10 per hour each)

See [ApiController.php](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) and [API Reference](api-reference.md).

### `MediaController` and `MediaUploadController`

`MediaUploadController` (admin) stores an uploaded file, or one copied from the admin's Files, through `MediaService`. `MediaController::show` serves it to users who may see a step that uses it. It is one of two routes without a CSRF token, because an `<img>` or `<video>` cannot send one; it only reads, needs strict cookies, and answers everything it refuses with the same 404. The other is `LinkController::open`, a tour's share link (`GET /tour/{id}`): a link in a mail cannot send one either; it changes nothing and only redirects to the tour's page with `?introvox-tour=<id>`.

### `LicenseController` (v1.4.x+)

Enterprise subscription endpoints:

- `getStats` — current subscription status and step-count usage per language
- `saveSettings` — store the subscription key in appconfig
- `validate` — call out to `licenses.voxcloud.nl` to verify the key
- `updateUsage` — report current usage to the license server

### `PersonalController`

- `getSettings` — `wizardDisabledByUser` (`wizard_disabled`), `toursDisabled` (`tours_disabled`), and `tours`: the tours for an app or page this user may get (`TourRepository::availableTo()`), each with its page, the app's name and icon from the user's own apps menu, and whether the user has seen it
- `saveSettings` — writes `wizard_disabled` (`wizardDisabled`) and/or `tours_disabled` (`toursDisabled`, through `TourStateService::setToursDisabled()`, which also sets `wizard_disabled` when switching tours off)

## Services

### `DefaultStepsService` (v1.7.0+)

Single source of truth for the eight built-in tour steps (Welcome / Files / Calendar / Search / Getting started / Important features / Useful tips / Done) of the welcome tour. Used by both `AdminController` (to seed the step editor when no override exists) and `ApiController` (to serve end users when no override exists). Tours for an app or page have no defaults.

`getForLanguage(string $lang)` returns the eight steps built with `IFactory::get('introvox', $lang)`. If no translation file ships for `$lang`, the service explicitly falls back to English rather than letting `IFactory` pick the system default — so an Italian user without an Italian translation gets English copy, not whatever the instance's `default_language` happens to be.

### `TourRepository`

The tours. The index (appconfig `tours`, a JSON array of at most 50 tours) holds what each tour is. The welcome tour is always in the list, even when the key is missing (a fresh install, or an instance updated from a version without tours); only its `enabled` and `enabledAt` are stored there, and its version is `wizard_version`. The steps of every other tour are lazy appconfig values, `tour_steps_<id>_<lang>`, so they are read only when a tour runs or is edited, never on the path every page takes.

- `all()`, `get()`, `create()`, `update()` — the index. `update()` sets `enabledAt` the first time a tour goes on
- `delete()` — removes the tour, its steps in every language and every user's `tour_<id>_*` state; a JSON backup goes to app data (`backups/`, the last ten kept). Not for the welcome tour
- `showAgain()` — for the welcome tour: deletes every user's `wizard_disabled` and raises `wizard_version`; for another tour: raises its `version`. Never touches `tours_disabled`
- `availableTo($tour, $user)` — whether a user may get a tour at all: **Tours for everyone** on, the tour on, the user in its groups (if any), and able to open its app (`IAppManager::isEnabledForUser()`)
- `steps()`, `saveSteps()`, `deleteSteps()`, `languages()` — the steps of a tour for an app or page

### `TourStateService`

Per-user state, in user preferences:

- `toursDisabled()` / `setToursDisabled()` — `tours_disabled`; switching tours off also sets `wizard_disabled` to `'true'`, so an older IntroVox respects it too
- `seen()` / `markStarted()` — `tour_<id>_seen`, the version at which the tour last started; `markStarted()` returns whether this start is the first at that version
- `mark()` — `tour_<id>_completed` / `tour_<id>_skipped`, the time, kept from the first time
- `markReached()` — `tour_<id>_reached` (the welcome tour too: `tour_welcome_reached`), `<version>|<index>|<step id>`: the furthest step of the user's last automatic run, replaced only by a further step or a newer version (`TourStats::replaces()`)
- `due($user, $tour)` — whether a tour starts by itself for the user the next time they open its page: `availableTo()`, not seen at this version, `tours_disabled` not set, for audience `new` a first login at or after `enabledAt`, and `TourSchedule::allows()`

### `TourValidator`

Plain PHP, tested directly (`tests-php/TourValidatorTest.php`). Checks the fields an admin may set (`name`, `trigger`, `visibleToGroups`, `mainLanguage`, `audience`, `enabled`), reduces a page trigger to one fixed form (`/index.php/apps/spreed/…` and `/call/…` are app `spreed`, `/f/…` is `files`; a plain path otherwise, without `%`, dots, backslashes or another host), and makes the id from the name (`slug()`). Also defines the storage keys: `stepsKey()` → `tour_steps_<id>_<lang>`, `stateKey()` → `tour_<id>_<state>`.

### `BuiltinTours`

The tours IntroVox ships for Files, Talk, Deck and Calendar (`builtin-files`, `builtin-talk`, `builtin-deck`, `builtin-calendar`). `stepsIn($l)` defines their steps with `$l->t()`, so the strings reach Transifex like the welcome tour's; it takes any object with `t()`, which lets `tests-php/BuiltinToursTest.php` check every step against `StepValidator` without Nextcloud. `steps($id, $language)` translates them into a language, its base language, or English.

`TourRepository::all()` lists a built-in tour while its app is installed (`IAppManager::isInstalled()`): name, app and main language from `BuiltinTours`, the rest (`EDITABLE`: on/off, groups, audience, schedule; plus `enabledAt` and `version`) from the tour index, where only that state is stored. `update()` changes only those fields and `delete()` refuses. `stepsOrDefaults()` gives the steps users get: the admin's own for a language, else the translated defaults of the welcome tour or a built-in tour; the user API, the step editor, the statistics and the Tours list all go through it.

### `TourSchedule`

Plain PHP, tested directly (`tests-php/TourValidatorTest.php`). `allows($tour, $firstLogin, $now)`: a tour with `startAfterDays` starts by itself only that many days after the user's first login (an unknown first login counts as long ago), and with `startFrom` / `startUntil` only on and between those days, compared as `YYYY-MM-DD` in the time zone of `$now`. `TourStateService::due()` passes the user's own time zone (`IDateTimeZone`). Starting by hand and share links don't go through it.

### `UserMenuEntry`

Listens to `LoadAdditionalEntriesEvent`, as Nextcloud's own settings app does, and adds **Tours** to the user menu (order 99997, just above **Help**), linking to the personal section `introvox-help`. Only while **Tours for everyone** is on and `user_menu` is not `'false'`.

### `TourStats` and `TourStatistics`

`TourStats` is plain PHP, tested directly (`tests-php/TourStatsTest.php`): encoding the `tour_<id>_reached` value, when a new step replaces it, and `funnel()`, which turns the values of all users into "at least this far" per step, in the steps' current order. Users whose step is not in the list count as `other`.

`TourStatistics::forTour()` puts one tour's numbers together for `GET /admin/tours/{id}/statistics`: unique users who started, completed and skipped it (from their preferences, through `IUserConfig::getValuesByUsers()`), and the funnel over the steps of one language. Each user writes only their own value, so nothing is counted twice or lost when many people run a tour at once. Nothing here goes into telemetry.

### `TourPackage` and `TourTransfer`

`TourPackage` is plain PHP with the zip extension, tested directly (`tests-php/TourPackageTest.php`). `write()` makes the `.zip` (`tour.json` and `media/<file>`); `read()` reads one from anywhere: only those names, each once, at most 501 files and a byte limit, checked against the zip's directory first and again while reading. `contents()` puts `tour.json` through `TourValidator` and `StepValidator`.

`TourTransfer` does the Nextcloud side. `export()` collects a tour's steps in every language (the welcome tour: only the admin's own) and the media they use. `import()` makes a new tour, switched off, with fresh copies of the media through `MediaService::store()`, drops groups the instance lacks, and reports what it left out; a welcome tour package replaces the welcome tour's own steps once the admin confirms. `fromFiles()` copies a package from the admin's own Files, refusing a share that may only be viewed (`MediaService::fileFromFiles()`). The package limit is `tour_package_limit` (default 100 MiB).

### `TourAssistant` and `TourPrompts`

`TourPrompts` is plain PHP, tested directly (`tests-php/TourPromptsTest.php`): the prompt to translate steps (only their ids, titles, texts and image descriptions, as JSON) or to draft them from a description, and `readSteps()`, which takes the JSON array out of an answer and refuses anything else. `applyTranslation()` puts the translated words in the steps as they are, and refuses the answer when a step is missing or empty; `draftSteps()` makes centered steps on the tour's page. `cutOff()` tells an answer that stopped before its end (empty, or an array that never closes) from one that is no use, so the admin hears to raise the provider's limit on the length of an answer.

`TourAssistant` schedules a `core:text2text` task (`OCP\TaskProcessing\IManager`) with what it is for in its custom id (`introvox:translate:<tour>:<from>:<to>`, `introvox:draft:<tour>:<lang>`), and reads the answer against the steps that are there when it is asked for, through `StepValidator`. `AssistantController` gives the admin page only the admin's own tasks.

### `Checklist`, `ChecklistService` and `ChecklistWidget`

"Getting started" on the Dashboard. `ChecklistWidget` is an API v2 widget (`IAPIWidgetV2`), so the Dashboard and the mobile apps draw its items themselves; `IConditionalWidget` keeps it out of the widget list while `checklist_enabled` is off, and it reloads every minute. `Checklist` is plain PHP, tested directly (`tests-php/ChecklistTest.php`): the tasks in their order, the admin's choice from `checklist_tasks`, and the Dashboard's default layout (`dashboard` / `layout`) with or without the widget.

`ChecklistService` decides, per user, which chosen tasks apply and which are done, from what the user did:

| Task | Applies when | Done when |
|---|---|---|
| `welcome` | Tours and the welcome tour are on | `wizard_completed` is set |
| `upload` | always | A file in the user's home storage has an `upload_time` (WebDAV records it; the skeleton files have none). Remembered in `checklist_uploaded`, so the files are looked through only until then |
| `avatar` | always | `IAvatar::isCustomAvatar()` |
| `client` | always | A sign-in (`authtoken`) whose name is a desktop or mobile client's user agent (`mirall`, `Nextcloud-android`, `Nextcloud-iOS`, `Nextcloud-Talk`) |
| `talk` | Talk is enabled for the user | A chat message of the user's own (`comments`, `object_type` `chat`, verb `comment`); Talk's sample conversations hold messages from others |
| `twofactor` | A provider other than backup codes is registered | Such a provider is enabled (`IRegistry::getProviderStates()`) |

An admin's own tasks (`checklist_custom`, checked by `Checklist::custom()`: a title, a short text, and a page of this Nextcloud, never another site) come after these. Their link carries `?introvox-check=<id>`; the bootstrap takes it out of the address and reports it (`POST /api/checklist/{id}`, `ApiController::checklistOpened()`), which sets `checklist_<id>` for the user. Deleting a task deletes that key for every user (`IUserConfig::deleteKey()`).

### `TourOptOut`

The rule the `IntroduceTours` repair step uses on the update that brings tours per app: a user counts as having switched tours off when `wizard_disabled` is `'true'`, `wizard_started` is set, and neither `wizard_completed` nor `wizard_skipped` is. A user who already has `tours_disabled` keeps it.

### `TelemetryService`

Tracks per-user welcome-tour lifecycle events (start, complete, skip) and aggregates them into anonymous statistics. Uses `oc_preferences` to record per-user timestamps. Tours for an app or page are not counted.

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

## Repair Steps

Post-migration repair steps (`appinfo/info.xml`) run on every update:

- `RemoveStaleDefaultWizardSteps`, `UnescapeLegacyWizardStepHtml` — clean-ups from earlier versions
- `IntroduceTours` — sets `tours_disabled` to `'true'` for users who match `TourOptOut`, then sets the appconfig flag `tours_introduced`, so it runs once. It writes the value untyped, as `TourStateService` does, so the user can switch tours back on later. A fresh install needs nothing.

## Background Jobs

Both jobs extend Nextcloud's `TimedJob`:

### `TelemetryJob`

Runs daily. Calls `TelemetryService` to ship aggregate stats to the license server.

### `LicenseUsageJob`

Runs daily with **stable jitter** to spread load across installations — derived from a hash of the instance ID so each NC server fires at a consistent but different time of day. This avoids the thundering-herd problem when many instances sync at midnight UTC.

## Listeners

### `LoadScripts`

Listens for `BeforeTemplateRenderedEvent` on every page where a user is logged in and IntroVox is enabled for them (this respects **Limit to groups**). It adds `js/main.js`, a small bootstrap, and provides the lazy initial state `introvox/runtime`:

```json
{
  "enabled": true,
  "toursDisabled": false,
  "welcome": { "enabled": true, "version": "3", "disabledByUser": false },
  "tours": [{ "id": "talk", "page": "/apps/spreed/", "version": 1 }]
}
```

`tours` holds only the tours that would start by themselves for this user (`TourStateService::due()`), with their page and version, and `anywhere: true` for a tour that starts on any page; no steps, names or groups. The state is lazy, so it is only worked out when the page is rendered. If working it out fails, it is left out and the bootstrap asks the server instead, as before this state existed.

The bootstrap decides from this whether a tour runs on the page, and only then loads the tour code; see [Frontend Architecture](frontend-architecture.md#tour-runtime).

## Settings Integration

| Class | Nextcloud section | Purpose |
|---|---|---|
| `AdminSection` | Settings → Administration | Registers the IntroVox sidebar entry |
| `AdminSettings` | Settings → Administration → IntroVox | Renders `admin.js` into the settings page |
| `HelpSection` | Settings → Personal | Registers the IntroVox entry in the personal settings sidebar (id `introvox-help`) |
| `PersonalSettings` | Settings → Personal → IntroVox | Renders `personal.js` into that section |

## Storage Schema

IntroVox does not create custom database tables. All persistent state lives in Nextcloud's existing tables, plus media files and tour backups in its app data folder.

### `oc_appconfig` keys

| Key | Type | Purpose |
|---|---|---|
| `wizard_enabled` | string `'true'` / `'false'` | **Tours for everyone**: every tour on or off |
| `wizard_version` | integer string | The welcome tour's version; bumped by the welcome tour's **Show again to everyone** to force re-show |
| `wizard_steps_<lang>` | JSON array of step objects | Welcome tour: per-language admin override; only present when an admin saved one |
| `tours` | JSON array of tour objects | The tour index (at most 50). The welcome tour's entry only holds `id`, `enabled`, `enabledAt` |
| `tour_steps_<id>_<lang>` | JSON array of step objects (lazy) | The steps of a tour for an app or page in one language |
| `tours_introduced` | timestamp | Set when the `IntroduceTours` repair step has run |
| `checklist_enabled` | string `'true'` / `'false'` | **Show "Getting started" on the Dashboard** |
| `checklist_tasks` | JSON list of task ids | The tasks an admin chose; absent means all of them |
| `checklist_custom` | JSON list of `{ id, title, text, page }` | An admin's own tasks, at most 10 |
| `license_key` | string | Enterprise subscription key (v1.4.x+) |
| `telemetry_enabled` | string `'true'` / `'false'` | Whether telemetry is active |
| `telemetry_asked` | timestamp | When the admin tour first asked the telemetry question |

> The `enabled_languages` key was used pre-1.7.0 to gate which languages the wizard would start in. It was removed alongside #17. Installs upgraded from 1.6.x may still carry a stale row; the 1.7.0 code ignores it.

### `oc_preferences` keys (per user, app `introvox`)

| Key | Type | Purpose |
|---|---|---|
| `wizard_disabled` | string `'true'` / `'false'` | The welcome tour is done for this user: **Done**, **Skip and don't show again**, or **Start tours by themselves** switched off. Cleared for everyone by the welcome tour's **Show again to everyone**, for one user by **Restart tour now** |
| `tours_disabled` | string `'true'` / `'false'` | **Start tours by themselves** is off: no tour starts by itself for this user |
| `tour_<id>_seen` | integer string | The version of a tour for an app or page at which it last started for this user |
| `tour_<id>_completed` | timestamp | When the user first finished that tour |
| `tour_<id>_skipped` | timestamp | When the user first skipped that tour |
| `wizard_started` | timestamp | When the user first started the welcome tour (telemetry) |
| `wizard_completed` | timestamp | When the user first completed it |
| `wizard_skipped` | timestamp | When the user first clicked **Skip and don't show again** |
| `admin_intro_done` | `'1'` | This admin has seen the admin tour |
| `checklist_uploaded` | timestamp | When the checklist first found a file this user uploaded |
| `checklist_<id>` | timestamp | When the user opened that own task from the checklist |

## Security Model

- **CSRF protection** on every route but the media one and the share link, `GET` included (v1.5.0 for the admin endpoints; all routes since the release after 1.7.9)
- **Defensive admin checks** via `IGroupManager::isAdmin()` on every admin endpoint
- **Step validation** via `StepValidator` on save and import; HTML in step text is reduced to the supported tags where it is shown
- **Server-side group filtering** — `visibleToGroups` enforcement in `ApiController::getWizardSteps`, per step and, for tours for an app, per tour
- **One 404 for everything refused** on the user routes of tours for apps and on media, so nothing shows which tours or files exist
- **HTTP response validation** on license-server calls

See [Architecture Overview → Security Model](overview.md#security-model).

## See Also

- [Architecture Overview](overview.md)
- [API Reference](api-reference.md) — full endpoint list
- [Frontend Architecture](frontend-architecture.md)
- [Transifex Integration](transifex-integration.md)
