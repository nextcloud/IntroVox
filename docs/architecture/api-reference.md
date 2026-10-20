# API Reference

REST endpoints exposed by IntroVox. All routes are defined in [appinfo/routes.php](https://github.com/nextcloud/IntroVox/blob/main/appinfo/routes.php).

There are two kinds of tour. The **welcome tour** (id `welcome`) is the tour new users get after their first login; its steps live in `wizard_steps_<lang>` with the Transifex-translated defaults behind them. **Tours for an app or page** (any other id) start the first time someone opens that app or page; they only have the steps an admin wrote. See [Tours](../admin/tours.md).

## Public API

Tour endpoints are reachable by any logged-in user, not only admins. None of them works without logging in.

### `GET /apps/introvox/api/steps`

Returns the steps of one tour for the current user, filtered by language, group visibility and enabled state. Disabled steps and the `visibleToGroups` lists of saved steps stay on the server; a step with a malformed group list is left out.

**Attributes:** `#[NoAdminRequired]`

**Query:** `tour` (optional, default `welcome`)

#### The welcome tour (`tour` absent or `welcome`)

**Response (200):**

```json
{
  "success": true,
  "steps": [
    {
      "id": "welcome",
      "title": "👋 Welcome to Nextcloud",
      "text": "<p>Nice to have you here!</p>",
      "attachTo": "",
      "position": "right",
      "enabled": true
    }
  ],
  "useDefault": false,
  "enabled": true,
  "language": "en",
  "version": "1"
}
```

**Special response fields:**

- `useDefault: true` — no admin override exists for this language; the `steps` array is the auto-translated Transifex default set (the client should use it as-is and **not** rebuild defaults locally)
- `enabled: false` — **Tours for everyone** (`wizard_enabled`) is off, or the welcome tour is switched off in the Tours list; `steps` is then empty, `language` is `en` and there is no `version`
- `version` — `wizard_version`, as a string; raised by the welcome tour's **Show again to everyone**

> The `languageDisabled: true` field was removed in v1.7.0 along with the `enabled_languages` opt-in concept.

#### A tour for an app or page (`tour=<id>`)

**Response (200):**

```json
{
  "success": true,
  "tour": "talk",
  "version": 2,
  "steps": [
    {
      "id": "start-a-call",
      "title": "Start a call",
      "text": "<p>…</p>",
      "attachTo": "",
      "position": "right",
      "enabled": true,
      "page": "/apps/spreed/"
    }
  ]
}
```

- `steps` — in the user's language (e.g. `pt_BR`), else its base language (`pt`), else the tour's main language; disabled and group-restricted steps removed, `visibleToGroups` stripped. There are no translated defaults: a language without saved steps falls through to the next.
- `version` — the tour's version (integer); raised by **Show again to everyone**

This route does not check whether the tour would start *by itself* (seen before, **Start tours by themselves** off, audience). That is the runtime's decision, so that a tour started by hand from the personal settings still loads.

**Response (404):** `{ "success": false }` for everything refused: a malformed or unknown id, **Tours for everyone** off, the tour switched off, a user outside the tour's groups, or a user who cannot open the tour's app. One answer for all of these, so the response says nothing about which tours exist.

**Implementation:** [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)

### `POST /apps/introvox/api/wizard/start`

Records that the current user started the welcome tour.

**Attributes:** `#[NoAdminRequired]`, `#[UserRateLimit(limit: 10, period: 3600)]` (the same on complete and skip; each counts once per user)

**Response:** `{ "success": true }`

### `POST /apps/introvox/api/wizard/complete`

Records that the current user completed the welcome tour.

**Attributes:** `#[NoAdminRequired]`, `#[UserRateLimit(limit: 10, period: 3600)]`

**Response:** `{ "success": true }`

### `POST /apps/introvox/api/wizard/skip`

Records that the current user clicked **Skip and don't show again**.

**Attributes:** `#[NoAdminRequired]`, `#[UserRateLimit(limit: 10, period: 3600)]`

**Response:** `{ "success": true }`

These three are for the welcome tour only. Marking it done for the user (`wizard_disabled`) is a separate call, `POST /personal/settings` with `wizardDisabled: true`.

### `POST /apps/introvox/api/tours/{id}/event`

Records that a tour for an app or page started, was completed or was skipped for the current user. `{id}` matches `[a-z0-9][a-z0-9-]{0,31}`.

**Attributes:** `#[NoAdminRequired]`, `#[UserRateLimit(limit: 30, period: 3600)]`

**Body:** `{ "event": "start" | "complete" | "skip" }`

**Responses:**

- `start` → `{ "success": true, "first": true }`. Stores the tour's current version in `tour_<id>_seen`; from then on the tour does not start by itself for this user, in any browser, until its version is raised. `first` is `false` when that version was already stored, for example because another tab or device started it a moment before; the frontend then only shows the tour if it was started by hand.
- `complete` / `skip` → `{ "success": true }`. Stores the time in `tour_<id>_completed` / `tour_<id>_skipped`, the first time only.
- Any other `event` → `400 { "success": false }`
- `404 { "success": false }` — the same rule as `GET /api/steps?tour=<id>`, so nobody can write state for a tour they don't get. The welcome tour (`welcome`) also gets 404 here: it uses `/api/wizard/*`.

**Implementation:** [ApiController::tourEvent()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)

### `POST /apps/introvox/api/tours/{id}/reached`

Records that a step of a tour was shown to the current user, for **How far people get** in the statistics. The welcome tour too (`welcome`). The frontend sends it only during a run that started by itself (not a start by hand, not a preview), and only for a step further than this run got before.

**Attributes:** `#[NoAdminRequired]`, `#[UserRateLimit(limit: 300, period: 3600)]`

**Body:** `{ "step": "<step id>", "index": 2 }` — `index` is the step's place in the run as this user saw it, from 1

**Responses:**

- `{ "success": true }`. Stores `<version>|<index>|<step id>` in `tour_<id>_reached` when that is further than what is stored for the tour's current version, or when the stored value is from an older version (**Show again to everyone** starts the count over). Going back a step changes nothing.
- `400 { "success": false }` — `step` is not a step id (letters, digits, `_`, `-`, `.`; at most 100) or `index` is not 1–100
- `404 { "success": false }` — for anyone who does not get the tour, an unknown tour, or a tour that is off; the welcome tour while it or **Tours for everyone** is off

Each user writes only their own value, so concurrent runs lose nothing; the admin only ever sees totals.

**Implementation:** [ApiController::tourReached()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php), [TourStats](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourStats.php)

### `POST /apps/introvox/api/checklist/{id}`

An admin's own task of the checklist on the Dashboard was opened from the list: done for the current user (`checklist_<id>`). The page the task opens carries `?introvox-check=<id>`, which the bootstrap takes out of the address and reports here. `404 { "success": false }` for a task that is not there or a checklist that is off. At most 60 requests per hour per user.

### `GET /apps/introvox/media/{file}`

Serves an image, video or captions file used in a step. `{file}` is a 32-character hex id with the extension `png`, `jpg`, `gif`, `mp4`, `webm` or `vtt`. Only for a logged-in user who may see a step that uses the file; everything refused gets the same 404.

**Attributes:** `#[NoAdminRequired]`, `#[NoCSRFRequired]`, `#[StrictCookiesRequired]` — see [CSRF Protection](#csrf-protection)

## Share Links

**Copy link** gives `/index.php/apps/introvox/tour/<id>` (`LinkController::open`). Someone who is not logged in goes through the login first, which keeps that path (it drops a query string). The route then redirects to the tour's page (`/apps/files/` for the welcome tour and a tour that starts anywhere) with `?introvox-tour=<id>`, or to the default page for a tour this user may not get. It has no CSRF check, as a link in a mail cannot carry a token; it changes nothing.

Any page of this Nextcloud with `?introvox-tour=<id>` starts that tour there, as a start by hand (`src/main.js`, `chooseTour()`), also over a tour that was underway. The server reads the parameter with the page and passes it on in the runtime state (`link`), because an app that sends its start page on at once (Deck goes to Upcoming cards) has dropped it from the address by the time the bootstrap runs. The bootstrap takes the parameter out of the address straight away, checks it is a tour id, and the tour then loads its steps through `GET /api/steps?tour=<id>` — so it starts only for someone who may get the tour, and anyone else gets the page without one. It is not counted in the statistics.

## Personal Settings API

Per-user state. Requires authentication; `401` without a user.

### `GET /apps/introvox/personal/settings`

**Response:**

```json
{
  "success": true,
  "wizardDisabledByUser": false,
  "toursDisabled": false,
  "tours": [
    {
      "id": "talk",
      "name": "Talk",
      "page": "/apps/spreed/",
      "app": { "name": "Talk", "icon": "/apps/spreed/img/app.svg" },
      "seen": false
    }
  ]
}
```

- `wizardDisabledByUser` — the user preference `wizard_disabled`: the welcome tour is done for this user (**Done**, **Skip and don't show again**, or **Start tours by themselves** switched off)
- `toursDisabled` — the user preference `tours_disabled`: **Start tours by themselves** is off
- `tours` — the tours for an app or page this user may get (switched on, **Tours for everyone** on, in the tour's groups, and able to open its app); not the welcome tour. `page` is `/apps/<app>/` for an app tour, or the page path. `app` is the name and icon from the user's own apps menu, `null` for a page tour. `seen` is `true` once any version of the tour started for the user.

### `POST /apps/introvox/personal/settings`

**Body:** either field, or both:

```json
{ "wizardDisabled": true, "toursDisabled": true }
```

- `wizardDisabled` — writes `wizard_disabled` (`'true'` / `'false'`). The tour sends `true` on **Done** and **Skip and don't show again**; **Restart tour now** sends `false`.
- `toursDisabled` — writes `tours_disabled` (`'true'` / `'false'`). `true` also sets `wizard_disabled` to `'true'`; `false` leaves `wizard_disabled` as it is.

**Response:** `{ "success": true, "message": "Settings saved" }`

## Admin API

All admin endpoints require administrator privileges. CSRF protection is enforced on every endpoint (see [CSRF Protection](#csrf-protection)).

### Tours

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/tours` | List every tour, the welcome tour first |
| `POST` | `/apps/introvox/admin/tours` | Create a tour for an app or page |
| `PUT` | `/apps/introvox/admin/tours/{id}` | Change a tour, or switch it on or off |
| `DELETE` | `/apps/introvox/admin/tours/{id}` | Delete a tour for an app or page |
| `POST` | `/apps/introvox/admin/tours/{id}/reshow` | **Show again to everyone** |
| `GET` | `/apps/introvox/admin/tours/{id}/statistics` | Started, completed, skipped, and how far people get, step by step |
| `GET` | `/apps/introvox/admin/tours/{id}/export` | The whole tour as a `.zip` |
| `POST` | `/apps/introvox/admin/tours/import` | A tour from such a `.zip` |
| `GET` | `/apps/introvox/admin/apps` | The apps in the admin's apps menu, for **Where does it start?**: `{ "success": true, "apps": [{ "id", "name", "icon" }] }` |

`{id}` matches `[a-z0-9][a-z0-9-]{0,31}`. A non-admin gets `403`: Nextcloud refuses the request itself (none of these routes has `#[NoAdminRequired]`), and `ToursController` checks again (`{ "success": false, "error": "forbidden" }`).

**`GET /admin/tours` response:**

```json
{
  "success": true,
  "toursEnabled": true,
  "tours": [
    {
      "id": "welcome",
      "name": "",
      "trigger": { "type": "login" },
      "enabled": true,
      "enabledAt": 0,
      "audience": "everyone",
      "visibleToGroups": [],
      "mainLanguage": "en",
      "version": 3,
      "builtin": true,
      "languages": ["nl"],
      "app": null,
      "stepCount": 0
    },
    {
      "id": "talk",
      "name": "Talk",
      "trigger": { "type": "app", "app": "spreed" },
      "enabled": true,
      "enabledAt": 1767225600,
      "audience": "everyone",
      "visibleToGroups": [],
      "mainLanguage": "en",
      "version": 1,
      "builtin": false,
      "languages": ["en", "nl"],
      "app": { "name": "Talk", "icon": "/apps/spreed/img/app.svg" },
      "stepCount": 4
    }
  ]
}
```

**Tour object:**

| Field | Description |
|---|---|
| `id` | Set by the server: an ASCII slug of the name (at most 28 characters, `-2`, `-3`… when taken, never `welcome`, no underscores) |
| `name` | 1–100 characters; empty for the welcome tour, which the UI names itself |
| `trigger` | `{ "type": "login" }` (welcome tour only), `{ "type": "app", "app": "<app id>" }`, `{ "type": "page", "page": "/settings/user" }` or `{ "type": "any" }` (on whichever page the user opens next, never IntroVox's admin page). A page inside an app is stored as that app: `/index.php/apps/spreed/…` and `/call/…` become `spreed`, `/f/…` becomes `files`. A page may only hold letters, digits, `-`, `_` and slashes (no `%`, dots, backslashes or another host), at most 200 characters |
| `enabled` | On or off. A new tour starts off |
| `enabledAt` | When the tour was first switched on (Unix time, `0` before that); the start of "new users" |
| `audience` | `everyone`, or `new`: only users whose first login came at or after `enabledAt` |
| `visibleToGroups` | Group ids that get the tour; `[]` = all users |
| `startAfterDays` | 0–365: it starts by itself only this many days after the user's first login (`0` = straight away; an unknown first login counts as long ago) |
| `startFrom`, `startUntil` | `YYYY-MM-DD` or `""`: it starts by itself only on and between these days, both included, in the user's own time zone. `startFrom` may not be after `startUntil` |
| `mainLanguage` | Language the steps are written in first (`en`, `pt_BR`); the last fallback for users |
| `version` | Raised by **Show again to everyone**. For the welcome tour this is `wizard_version` |
| `builtin` | `true` for the welcome tour and the built-in tours (`builtin-files`, `builtin-talk`, `builtin-deck`, `builtin-calendar`; listed only while their app is installed). Their `name` is translated; their `name`, `trigger` and `mainLanguage` cannot be changed, and they cannot be deleted |
| `languages`, `app`, `stepCount` | Only in the list, worked out per request: the languages with saved steps (for the welcome tour: those with an override), the app's name and icon from the admin's apps menu, and the number of steps in the main language (`0` for the welcome tour) |

**`POST /admin/tours`**

Body: `{ "tour": { "name": "Talk", "trigger": { "type": "app", "app": "spreed" }, "visibleToGroups": [], "mainLanguage": "en", "audience": "everyone", "startAfterDays": 0, "startFrom": "", "startUntil": "" } }` — only `name` and `trigger` are required; the tour is always created switched off.

Response: `{ "success": true, "tour": { … } }`. Errors: `400 { "success": false, "error": "Invalid tour: <reason>" }`, including `Invalid tour: at most 50 tours`.

**`PUT /admin/tours/{id}`**

Body: `{ "tour": { … } }`. For a tour for an app or page, the given fields (`name`, `trigger`, `visibleToGroups`, `mainLanguage`, `audience`, `enabled`, `startAfterDays`, `startFrom`, `startUntil`; `TourValidator::FIELDS`) replace the stored ones and the result is validated as on create. For a built-in tour only `enabled`, `visibleToGroups`, `audience` and the three schedule fields count (`BuiltinTours::EDITABLE`); anything else sent is ignored. For the welcome tour only `{ "tour": { "enabled": true | false } }` counts.

Switching a tour on needs at least one enabled step in its main language, otherwise `400 { "success": false, "error": "needs_steps" }`. Unknown id: `404 { "success": false, "error": "not_found" }`.

Response: `{ "success": true, "tour": { … } }`.

**`DELETE /admin/tours/{id}`**

Removes the tour from the index, its steps in every language (`tour_steps_<id>_*`) and every user's state of it (`tour_<id>_seen`, `_completed`, `_skipped`, `_reached`). A JSON backup of the tour and its steps goes to IntroVox's app data folder (`backups/`); the last ten are kept, with no route to restore them. The welcome tour and the built-in tours cannot be deleted: `404 { "success": false, "error": "not_found" }`, as for an unknown id.

Response: `{ "success": true }`.

**`POST /admin/tours/{id}/reshow`**

For a tour for an app or page: raises its `version`, so it starts by itself again for everyone whose `tour_<id>_seen` is lower. For the welcome tour: deletes every user's `wizard_disabled` and raises `wizard_version`. Neither touches `tours_disabled`.

Response: `{ "success": true, "tour": { … } }`; unknown id: `404 { "success": false, "error": "not_found" }`.

**`GET /admin/tours/{id}/statistics`**

Query: `?lang=<code>` — the language whose steps the funnel follows. Unknown or absent: the tour's main language (the welcome tour: `en`).

```json
{
  "success": true,
  "statistics": {
    "started": 12,
    "completed": 7,
    "skipped": 2,
    "language": "en",
    "languages": ["en", "nl"],
    "steps": [
      { "id": "t-1", "title": "Welcome to Talk", "enabled": true, "reached": 12 },
      { "id": "t-2", "title": "Start a conversation", "enabled": true, "reached": 9 }
    ],
    "other": 1,
    "counted": 12
  }
}
```

- `started`, `completed`, `skipped` — unique users, counted from their preferences: for a tour for an app or page `tour_<id>_seen`, `_completed`, `_skipped`; for the welcome tour `wizard_started`, `wizard_completed`, `wizard_skipped`
- `steps` — every step of `language` in its current order (switched-off ones too), with `reached`: how many users got at least that far in their last automatic run (`tour_<id>_reached`). For the welcome tour, the admin's own steps for that language, or the translated defaults
- `other` — users whose furthest step is not in this list: deleted since, or a step of another language
- `counted` — users with a `tour_<id>_reached` value; the percentages in the UI are of this

Nothing here goes into telemetry. Unknown id: `404 { "success": false, "error": "not_found" }`.

**`GET /admin/tours/{id}/export`**

The whole tour as `introvox-tour-<id>.zip` (`Content-Type: application/zip`): `tour.json` and `media/<file>` for every image, video and captions file a step uses. `tour.json`:

```json
{
  "format": "introvox-tour",
  "version": 1,
  "exportedAt": "2026-10-01T12:00:00+00:00",
  "introvox": "2.0.0",
  "tour": { "kind": "app", "name": "Talk", "trigger": { "type": "app", "app": "spreed" }, "mainLanguage": "en", "visibleToGroups": [], "audience": "everyone" },
  "languages": { "en": [ … ], "nl": [ … ] }
}
```

For the welcome tour `tour` is `{ "kind": "welcome" }` and `languages` holds only the admin's own steps (`wizard_steps_<lang>`), never the translated defaults; with none, `400 { "success": false, "error": "nothing_to_export" }`. Ids, `enabled`, `enabledAt` and `version` are not exported.

**`POST /admin/tours/import`**

Either the form field `file` (an upload), or `{ "path": "/Tours/talk.zip" }` for a file in the admin's own Files — for packages over PHP's upload limit; a share that may only be viewed is refused. `replaceWelcome: "1"` confirms a welcome tour package (below).

Reading a package trusts nothing: only `tour.json` and `media/<32 hex>.<png|jpg|gif|mp4|webm|vtt>` may be in it, each once, at most 501 files and `tour_package_limit` bytes unpacked (default 100 MiB; `occ config:app:set introvox tour_package_limit --value=<bytes>`), checked against the zip's directory before reading and again while reading. The tour and its steps go through the same checks as the editor (`TourValidator`, `StepValidator`); the media through the same checks as an upload, as fresh copies with new ids.

- A tour for an app or page becomes a new tour, switched off: `{ "success": true, "confirm": false, "kind": "app", "languages": ["en", "nl"], "tour": { … }, "droppedGroups": ["staff"], "mediaLeftOut": 0, "appMissing": null }`. Groups this Nextcloud lacks are left out (`droppedGroups`); media missing from the package or over this server's limits is left out of its step (`mediaLeftOut`); `appMissing` names the trigger's app when it is not installed here.
- A welcome tour package without `replaceWelcome` changes nothing: `409 { "success": false, "error": "confirm_welcome", "languages": ["en"] }`. With it, the welcome tour's own steps are replaced for those languages.
- Refused: `400 { "success": false, "error": "<reason>", "detail": "…" }` with `not_a_package`, `no_manifest`, `unexpected_file`, `too_many_files`, `too_large`, `too_large_for_server`, `newer_version`, `bad_tour`, `too_many_tours`, `no_file`, `not_found` or `view_only`.

**Implementation:** [ToursController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ToursController.php), [TourRepository](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourRepository.php), [TourValidator](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourValidator.php), [TourStatistics](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourStatistics.php), [TourTransfer](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourTransfer.php), [TourPackage](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourPackage.php)

### Assistant

Translating a tour and drafting its steps with the Nextcloud Assistant: a `core:text2text` task for whatever provider is set up. Tasks run in the background; the admin page asks for the result, and saves what the admin checked through `POST /admin/steps`. Nothing is stored here.

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/assistant` | `{ "success": true, "available": true }`: whether a provider for free prompts is set up |
| `POST` | `/apps/introvox/admin/assistant/translate` | Body `{ "tour", "from", "to" }`: the steps of `from` translated into `to`. Answers `{ "success": true, "task": 42 }` |
| `POST` | `/apps/introvox/admin/assistant/draft` | Body `{ "tour", "description", "lang" }`: three to six new steps in `lang`, from a description of at most 2000 characters |
| `GET` | `/apps/introvox/admin/assistant/tasks/{id}` | `{ "status": "running" }`, `{ "status": "done", "steps": [ … ], "language": "nl" }` or `{ "status": "failed", "error": "<reason>" }` |

Refused: `400` with `invalid`, or `no_steps` when `from` has nothing to translate; `503 unavailable` without a provider; `404` for a task that is not the admin's own or not IntroVox's. A failed task's `error` is `failed` (the provider gave up), `cut_off` (the answer stopped before its end: the provider's limit on its length), `unreadable` (no steps in the answer, or steps `StepValidator` refuses) or `changed` (the tour, or the steps that were sent, changed while it ran). Each scheduling route takes 60 calls per admin per hour.

A translation changes only the words: ids, elements, pages, media and groups come from the steps as they are when the answer is read. Drafted steps are centered, on the tour's page, with ids `ai-<task>-<n>`.

**Implementation:** [AssistantController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/AssistantController.php), [TourAssistant](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourAssistant.php), [TourPrompts](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/TourPrompts.php)

### Step CRUD

Every step endpoint takes a `tour` parameter (default `welcome`). For the welcome tour the steps live in `wizard_steps_<lang>`; for any other tour in `tour_steps_<id>_<lang>`. An unknown tour gets `404 { "success": false, "error": "Unknown tour" }`.

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/steps` | Get the steps of a tour in a language (query: `?lang=<code>&tour=<id>`). For the welcome tour and a built-in tour without the admin's own steps: the translated defaults. For another tour: its saved steps or `[]`, and the response also carries `"tour"` |
| `POST` | `/apps/introvox/admin/steps` | Save the full step list (body: `{ "steps": [...], "lang": "<code>", "tour": "<id>" }`) |
| `POST` | `/apps/introvox/admin/reset` | Delete a language's steps (body: `{ "lang", "tour" }`). For the welcome tour the next GET serves the auto-translated defaults; another tour has no defaults, so that language is simply empty |

### Import/Export

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/apps/introvox/admin/export` | Export a tour's steps for a language as JSON (body: `{ "lang", "tour" }`). Filename `introvox_steps_<lang>.json` for the welcome tour, `introvox_<id>_steps_<lang>.json` otherwise |
| `POST` | `/apps/introvox/admin/import` | Import steps into a tour (body: `{ "fileContent": "<JSON>", "tour": "<id>" }`). The file is `{ "language": "<code>", "steps": [...] }`, as written by export; the language comes from the file |

These move one language of a tour's steps. A whole tour, with its settings, every language and its media, moves with `GET /admin/tours/{id}/export` and `POST /admin/tours/import` (above).

### Settings

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/settings` | `{ "success": true, "enabled": true, "userMenu": true, "checklist": { … } }` — **Tours for everyone** (`wizard_enabled`), **Show Tours in the user menu** (`user_menu`), and the checklist on the Dashboard: `{ "enabled": false, "onDashboard": false, "tasks": [{ "id": "upload", "title": "Upload a file", "hint": "…", "note": "", "chosen": true }, …], "custom": [{ "id": "c-1a2b3c4d", "title": "Open Talk", "text": "…", "page": "/apps/spreed/" }] }` |
| `POST` | `/apps/introvox/admin/settings` | Body with any of `enabled`, `userMenu` and `checklist` (any of `enabled`, `tasks` as a list of task ids, `custom` as the whole list of own tasks — without `id` for a new one — and `onDashboard`); only what is sent changes. Own tasks that do not pass give `400` with `error` `title`, `text`, `page`, `too_many` or `invalid`, and nothing changes. Showing the welcome tour again is its reshow, above |
| `GET` | `/apps/introvox/admin/languages` | List every Nextcloud-supported language (for the "Add language override" picker), with native display names |
| `GET` | `/apps/introvox/admin/overrides` | Languages for the step editor's dropdown (query: `?tour=<id>`). Welcome tour: `en` plus every language with an override row. Another tour: its main language plus every language it has steps in |
| `GET` | `/apps/introvox/admin/groups` | Get list of Nextcloud groups for the **Visible to groups** dropdown |

### Media

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/apps/introvox/admin/media` | Upload an image, video or captions file for a step (form field `file`; `kind`: `media` or `captions`) |
| `POST` | `/apps/introvox/admin/media/from-files` | Copy one in from the admin's own Files (`path`, `kind`) |

### Statistics and Telemetry

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/statistics` | Instance totals and the welcome tour's counters, as telemetry sends them; per tour see `GET /admin/tours/{id}/statistics` |
| `POST` | `/apps/introvox/admin/telemetry` | Toggle telemetry on/off |
| `POST` | `/apps/introvox/admin/telemetry/send` | Manually trigger telemetry send |
| `POST` | `/apps/introvox/admin/telemetry/asked` | Record that the admin tour asked the telemetry question |
| `POST` | `/apps/introvox/admin/intro/done` | Record that this admin has seen the admin tour (`admin_intro_done`) |

### License (Enterprise Subscription)

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/license/stats` | Get current license status and step-count usage |
| `POST` | `/apps/introvox/admin/license/settings` | Save subscription key |
| `POST` | `/apps/introvox/admin/license/validate` | Validate subscription key against license server |
| `POST` | `/apps/introvox/admin/license/usage` | Report current usage to license server |

## Step Object Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique step identifier |
| `title` | string | Yes | Step heading, shown as plain text |
| `text` | string | No | Step body content; HTML, reduced to the supported tags where it is shown |
| `attachTo` | string | No | CSS selector for element highlight; empty for centered |
| `position` | string | No | One of `right`, `left`, `top`, `bottom` |
| `enabled` | boolean | No | Whether the step is shown (default `true`) |
| `visibleToGroups` | string[] | No | Group IDs that can see this step (default `[]` = all users) |
| `page` | string | No | App the step belongs to, e.g. `/apps/spreed/`; the tour opens it first. Empty = any page |
| `openFirst` | string | No | CSS selector of a button (usually a menu) the tour clicks before the step |
| `advance` | string | No | `click`: the step continues when the user clicks its element; `input`: Next works once the field the step points at (or the field inside it) has text; `button` (or absent): a Next button |
| `customTarget` | boolean | No | Set by the admin UI when the element of a default step was changed; the admin's selector then replaces the built-in one |
| `media` | object | No | An image or video: `file` (an IntroVox media id such as `<32 hex>.png`), `alt`, `decorative`, `size` (`small`, `full`, `wide`); for a video also `playback` (`loop`, `controls`) and `captions` (a `.vtt` media id) |

The steps of every tour use this schema. Saving and importing check every field's type and size ([StepValidator](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/StepValidator.php)); the HTML in `text` is cleaned where it is shown (`src/utils/stepHtml.js`).

## Authentication

- **Tour API** (`/api/*`, `/media/*`) — requires Nextcloud session
- **Personal API** (`/personal/*`) — requires Nextcloud session
- **Admin API** (`/admin/*`) — requires Nextcloud session **and** admin role; double-checked via `IGroupManager::isAdmin()` (v1.5.0+)

No route is reachable without logging in: none has `#[PublicPage]`. Until the release after 1.7.9, `GET /api/steps` did, and without a user it skipped the group filter, so anyone could read every step, group-restricted ones included.

## CSRF Protection

Every endpoint requires a valid CSRF token, `GET` requests included, with two exceptions. `GET /media/{file}`, because an `<img>` or `<video>` cannot send a token: that route only reads, needs a logged-in user with strict cookies (which no cross-site request carries), and answers everything it refuses with the same 404. `GET /tour/{id}`, a share link from a mail, which cannot carry one either: it needs a logged-in user, changes nothing, and only redirects (see [Share Links](#share-links)). Until the release after 1.7.9 the tracking endpoints (`POST /api/wizard/start`, `/complete`, `/skip`) and the read-only `GET` endpoints skipped the check, so any website could fire the tracking calls on behalf of a logged-in visitor.

Use `@nextcloud/axios` from the frontend — it injects the token automatically. A bare `fetch()` sends no token and gets `412 Precondition Failed`.

`tests-js/controller-security.test.js` fails the build when a route gets `#[PublicPage]`, when any route other than the media one gets `#[NoCSRFRequired]`, or when the frontend calls the API with `fetch()`.

## See Also

- [Architecture Overview](overview.md) — system context
- [Backend Architecture](backend-architecture.md) — controller and service details
- [Tours](../admin/tours.md) — tours for apps, from the admin's side
- [Group-Based Visibility](../admin/group-visibility.md) — `visibleToGroups` semantics
