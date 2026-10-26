# Frontend Architecture

IntroVox's frontend is a Vue 3 single-page app bundled with webpack, integrated into Nextcloud as four entry points: the tour runtime, the admin settings page, the personal settings page, and the tour list other apps can show.

## Entry Points

| Entry | Output bundle | Loaded on |
|---|---|---|
| `src/main.js` | `js/main.js` | Every Nextcloud page (via `LoadScripts` listener) |
| `src/admin.js` | `js/admin.js` | Admin settings → IntroVox |
| `src/personal.js` | `js/personal.js` | Personal settings → IntroVox |
| `src/embed/embed.js` | `js/introvox-embed.js` | A page of another app that shows `<introvox-tour-list>` (see [Embedding the tour list](#embedding-the-tour-list)) |

`main.js` is a small bootstrap, because every logged-in page loads it. The tour code itself (WizardManager, Shepherd.js, Vue and `css/wizard.css`) is a chunk of its own, `src/runtime/tour.js` → `js/tour.<hash>.js` plus shared vendor chunks, loaded with a dynamic `import()` only on a page where a tour runs. Chunk names carry a content hash (`chunkFilename: '[name].[contenthash:8].js'`), because chunks load without Nextcloud's `?v=` parameter. The bootstrap sets `__webpack_nonce__` to the request token in base64, so Nextcloud's CSP admits the chunk's script tag. See [Tour Runtime](#tour-runtime).

## Component Tree

```
Every page (src/main.js, the bootstrap)
└── chooseTour()               ← src/runtime/chooseTour.mjs: which tour, if any
    └── tour chunk (src/runtime/tour.js, loaded only when a tour runs)
        └── WizardManager.vue  ← Shepherd.js tour lifecycle, welcome tour and tours for apps
            ├── (Shepherd-managed step DOM, not Vue components)
            └── PWA install instructions (~50 strings, v1.6.0+)

Admin settings page (src/admin.js)
└── AdminApp.vue               ← the pane row, the tour list, opening a tour, the admin intro
    ├── SettingsPane.vue       ← Tours for everyone, Show Tours in the user menu, the checklist
    │   └── ChecklistSettings.vue  ← the checklist on the Dashboard: on/off, its tasks, own tasks, on every Dashboard
    │       └── ChecklistTaskDialog.vue ← "New task" / "Edit task": title, short text, page
    ├── Tours pane
    │   ├── ToursList.vue      ← the tours: switch, Edit steps, ⋯ (Preview, Copy link, Export tour, Show again to everyone, Delete), New tour, Import tour
    │   │   (its actions: useTours.js)
    │   ├── NewTourDialog.vue  ← "New tour" and "Tour settings"
    │   └── TourEditor.vue     ← the steps of one tour: languages, add, edit, delete, reorder (drag-drop or Move step up / Move step down), per-language reset/import/export
    │       ├── AssistantDialog.vue ← "Translate with AI" / "Write steps with AI" (its tasks: useAssistant.js)
    │       ├── StepWizard.vue     ← "New step" / "Edit step" dialog
    │       │   ├── StepTextEditor.vue ← the Text field: formatting toolbar, emoji, Edit as HTML (rules in stepTextHtml.mjs)
    │       │   ├── StepMediaBlock.vue ← Image or video: upload, choose from Files, paste a screenshot; description, size, captions
    │       │   └── ElementPicker.vue  ← "Pick element" (src/picker/)
    │       └── TourPreview.vue    ← "Preview tour" / "Test this step" (src/preview/)
    │           both inside NextcloudFrame.vue (src/frame/): Nextcloud in an iframe
    ├── StatisticsPane.vue     ← TourStatistics.vue (one tour: started, completed, skipped, how far people get), instance information, telemetry (TelemetryLists.vue)
    ├── SupportSettings.vue    ← the Support pane (src/components/)
    └── TelemetryQuestion.vue  ← the question after the admin intro (TelemetryLists.vue, telemetry.js)

Personal settings page (src/personal.js)
└── PersonalApp.vue            ← Start tours by themselves
    └── TourList.vue           ← Restart tour now, the Tours list with Start (src/components/)

Another app's page (src/embed/embed.js)
└── <introvox-tour-list>       ← custom element
    └── EmbeddedTourList.vue   ← loads the list (GET /personal/settings)
        └── TourLinks.vue      ← a link per tour, without styles: the host styles it
```

Inside `AdminApp.vue` the Tours pane's id is still `steps`. `TourEditor` works on one tour (AdminApp mounts one per open tour, keyed by its id) and passes its id as `tour` to every step, override, import and export call. AdminApp may call two of its functions: `addStep()`, for a new tour's first step, and `ready()`, which the admin intro awaits before it points at the editor.

### Picker and Preview

Both show a live Nextcloud page in a same-origin iframe, so the admin page reads and drives its DOM directly. The frame's name (`src/frame/frameNames.js`) tells `main.js` inside it what the frame is for: in the picker no tour starts, in the preview `WizardManager` runs in preview mode, waits for steps from the admin page (`window.introVoxPreview.run()`) and records nothing (no telemetry, no completion, no localStorage). The picker's selector logic lives in `src/picker/selector.mjs`, tested in `tests-js/picker-selector.test.js`.

## Embedding the tour list

Another app can show the tours a user can start, as the custom element `<introvox-tour-list>`: a link for the welcome tour, then a link for each tour this user may get, with its app's icon and name. IntroVox decides per user which tours are in it, by the same rules as everywhere else (on/off, groups, the user's access to the tour's app), so the list is always current. The look is the host's: the element brings plain markup without styles, and the host styles it by the class names below. A custom element rather than a Vue component, as MetaVox's `<metavox-metadata-form>`: the host does not depend on IntroVox's Vue version, or on Vue at all.

Load the bundle while rendering the page. IntroVox is optional to the host, so guard the call:

```php
if (class_exists(\OCA\IntroVox\Embed\TourListEmbed::class)) {
    \OCP\Server::get(\OCA\IntroVox\Embed\TourListEmbed::class)->load();
}
```

`isAvailable($userId)` tells whether IntroVox is enabled for a user.

Then place the element:

```js
container.appendChild(document.createElement('introvox-tour-list'))
```

It takes no attributes. Each link is the tour's share link (`/apps/introvox/tour/<id>`, `/apps/introvox/tour/welcome` for the welcome tour), which opens the tour's page and starts the tour there by hand. With **Tours for everyone** off, the element stays empty; otherwise it always has the welcome tour's link.

The markup, inside the element:

| Class | On |
|---|---|
| `introvox-tour-list__items` | the list (`ul`) |
| `introvox-tour-list__item` | each entry (`li`) |
| `introvox-tour-list__link` | the link (`a`); `--welcome` for the welcome tour, `--seen` once the user has seen the tour |
| `introvox-tour-list__icon` | the icon (a 20 px SVG); `--app` for an app's icon (an `img`, light like the apps menu's, so a light page inverts it, for example with `filter: var(--background-invert-if-bright)`) |
| `introvox-tour-list__name` | the tour's name; "Welcome tour" for the welcome tour, translated by IntroVox |

Events bubble from the element:

| Event | Detail |
|---|---|
| `introvox:loaded` | `{ tours, welcome }`: the listed tours, and whether the welcome tour's link is there. `tours` empty and `welcome` false: tours are off for everyone, nothing to start, so a host can hide its own frame |
| `introvox:error` | `{ message }`: IntroVox is not enabled for this user, or did not answer |

The tag name, `TourListEmbed` with `load()` and `isAvailable()`, the class names and the two events are a fixed interface; `tests-js/embed-contract.test.js` fails when one of them changes.

## Tour Runtime

### `src/main.js` (the bootstrap)

On `DOMContentLoaded`, every page:

1. Works out what kind of frame it is in (`frameKind()`): a page of its own, the admin's element picker, the admin's preview, or someone else's same-origin frame. The frame names only count inside a same-origin parent, so another website cannot open a tab with one of those names to stop the tour. In the preview frame it sets up `window.introVoxPreview` and stops there.
2. Defines `window.introVox` with `start()` (loads the chunk and starts the welcome tour by hand), `reset()` (clears the welcome tour's localStorage marks) and `isCompleted()`. WizardManager replaces it with its own once it runs.
3. Takes a share link's `?introvox-tour=<id>` out of the address (`history.replaceState()`), keeping it only when it is a tour id; if an app already changed the address (Deck goes to Upcoming cards), it uses the `link` the server read with the page. Likewise `?introvox-check=<id>`, an own task of the checklist on the Dashboard opened from there: a chunk of its own (`src/runtime/checklist.js`) reports it.
4. Calls `chooseTour()` with what the page already has: the lazy initial state `introvox/runtime` from `LoadScripts` (see [Backend Architecture](backend-architecture.md#loadscripts)), the link, sessionStorage, localStorage and the path. No request is made for this.
5. Removes a start request once it has been used, and loads the tour chunk only if a tour was chosen.

### `src/runtime/chooseTour.mjs`

Plain data in, plain data out, tested without a browser (`tests-js/choose-tour.test.js`). The rules, in order; the first that applies decides:

1. In the element picker or someone else's same-origin frame: no tour
2. A share link starts its tour on the page it opened (not on IntroVox's admin page), also over a tour that was underway: following a link asks for that tour, and leaving a page mid-tour (by typing the link, say) leaves a resume entry, which the bootstrap then clears
3. A tour that is underway (a resume entry, less than 10 minutes old) carries on on the page its next step opened, or after a reload on the page it was on (an entry with `stay` resumes only on that page, `resumesHere()`, so the tour does not follow someone who went elsewhere); else a start request from the personal settings (less than 2 minutes old): the welcome tour on whatever page comes next, a tour for an app on its own page. A link and a start by hand also work with **Start tours by themselves** off and outside a tour's dates; the server still checks that the user may get the tour
4. On IntroVox's own admin page: no tour (the admin tour runs there)
5. No runtime state on the page: the tour code asks the server, as before this state existed
6. **Tours for everyone** off, or **Start tours by themselves** off: no tour
7. The welcome tour comes first: unless it is switched off in the Tours list or done for this user (`wizard_disabled`), it runs when this browser has not marked it completed, or has marked it at another `wizard_version` than the server's
8. A tour ended in this tab less than 2 minutes ago: no tour, so two tours never run back to back
9. The first tour for an app or page that is due here; a tour that starts anywhere is due on every page. "Due" is the server's (`TourStateService::due()`): available, not seen at this version, the audience, and its time (`TourSchedule`)

Browser storage it reads:

| Key | Storage | Meaning |
|---|---|---|
| `introvox_completed`, `introvox_version` | localStorage | The welcome tour was finished, closed or skipped in this browser, at that `wizard_version` |
| `introvox_tour_resume` | sessionStorage | A tour underway that navigated to another page, or whose page was left otherwise, such as by a reload (`{ tourId, stepId, at }`, plus `stay`: the page it was on) |
| `introvox_start_tour` | sessionStorage | A start by hand from the personal settings (`{ tourId, page, at }`; the welcome tour has no page) |
| `introvox_tour_ended` | sessionStorage | When a tour last ended in this tab |
| `introvox_preview_resume` | sessionStorage | The admin preview's own resume entry |

### `src/runtime/tour.js`

The chunk's entry: mounts `WizardManager` with the bootstrap's choice (`startTour()`), for a start by hand (`startManually()`) or in preview mode (`mountPreview()`). It also imports Shepherd's CSS and `css/wizard.css`, so those load with the chunk.

## Key Files

### `src/components/WizardManager.vue`

Manages the Shepherd.js tour:

1. Gets the bootstrap's choice as its `start` prop: which tour, and whether it resumes or was started by hand
2. **Welcome tour:** loads `GET /api/steps`, re-attaches client-side behaviour by step id (`enrichSteps()`), while it waits for the app menu (and for Nextcloud's first-run wizard to close), and starts once no dialog is open
3. **Tour for an app or page:** loads `GET /api/steps?tour=<id>` (a 404 or no steps: nothing starts), waits for the app to be ready (the first step's element or the app's content, no dialog of the app open, the tab visible; at most 15 seconds), then sends `POST /api/tours/{id}/event` with `start`. It shows the tour only if that was the first start at this version, or the tour was started by hand. Its first step's button is **Skip** instead of **Skip and don't show again**
4. Instantiates `new Shepherd.Tour({...})` and registers Next/Back/Done/Skip handlers
5. Welcome tour: fires telemetry events via `axios.post('/api/wizard/...')`, updates localStorage on close/complete/skip, and calls `POST /personal/settings` with `wizardDisabled: true` on Skip and Done
6. Tour for an app: sends `complete` or `skip` to `POST /api/tours/{id}/event`; nothing in localStorage
7. Any tour, during a run that started by itself: each step further than this run got before goes to `POST /api/tours/{id}/reached` (step id and place in the run), for **How far people get**. A start by hand (`window.introVox.start()`, **Start** in the personal settings) and a preview never count; an app tour counts only when its `start` was the first. Whether a run counts travels in the resume entry when the tour changes page

### `src/components/wizardSteps.js`

Client-side definitions of the welcome tour's built-in steps, wrapped in `t('introvox', ...)`, with what the server cannot store: lazy `attachTo`, menus to open first, `beforeShowPromise`. Used:

- By `enrichSteps()`, which re-attaches that behaviour by id to the steps `GET /api/steps` returns
- As the full fallback (`getWizardSteps()`) when the server sends no steps or can't be reached

Tours for an app or page don't use it.

Since v1.6.0, all 16 default step titles and texts use English source strings as Transifex msgids rather than opaque `step_welcome_title`-style keys.

### Step media and text

`StepMediaBlock.vue` adds a step's image, GIF or video through `POST /admin/media` or `/admin/media/from-files` and edits the step's `media` block. In the tour, `src/utils/stepMedia.js` (`buildStepMedia()`) builds the image or video with DOM APIs from that block, never through HTML, checks the file id again, and loads the file from `GET /media/{file}`; anything that moves gets a pause button and stays still with reduced motion. See [Media in tour steps](../security/media.md).

`StepTextEditor.vue` edits the step text with a TipTap editor limited to the tags the tour shows (`EDITOR_TAGS` in `src/admin/stepTextHtml.mjs`, the same allowlist as `src/utils/stepHtml.js`). Texts are still stored as HTML.

### `src/components/SupportSettings.vue`

The **Support** pane: that IntroVox is free and open source with no limits, links to the other apps, to report an issue and to the source code, and **Show the admin tour again**. The subscription key and the per-language step counters it had before 1.7.7 are gone.

### `src/utils/deviceDetection.js` (v1.6.0+)

OS/browser detection used by the PWA install step. All ~40 user-facing strings are wrapped in `t()` (fixed in v1.6.0 — they were previously hardcoded Dutch).

## State Management

IntroVox does **not** use Vuex or Pinia. State is kept local to components:

- **Whether a tour runs** — decided per page load by `chooseTour()` from the `introvox/runtime` initial state and browser storage, before any tour code loads
- **Step list** — loaded once per page via `GET /api/steps` (with `?tour=<id>` for a tour for an app), kept in `WizardManager.vue`'s reactive state
- **Admin tours** — `GET /admin/tours` in `useTours.js`, used by `AdminApp.vue`; switching, show again, delete, export and import go to `/admin/tours/…`
- **Admin step editing** — local component state in `TourEditor.vue`, for the tour open in it; every change (saving in the editor, delete, reorder, enable/disable) is written straight away via `POST /admin/steps` with that tour's id, queued one after another so quick changes never land out of order
- **User completion state** — welcome tour: browser localStorage plus the server preference `wizard_disabled`; tours for an app: on the server only (`tour_<id>_seen`, `_completed`, `_skipped`); how far any tour got: `tour_<id>_reached`; **Start tours by themselves**: the server preference `tours_disabled`
- **Language selection** (admin) — local state; switching with unsaved changes triggers a confirm dialog

## Tour Engine: Shepherd.js

IntroVox wraps [Shepherd.js](https://shepherdjs.dev/) for tour rendering:

- Each step is registered as `tour.addStep({...})`
- Element highlighting (`.shepherd-target-click-disabled`) is overridden so users can still click highlighted elements
- Custom styling overrides Shepherd's default classes to match Nextcloud's theme variables (see [Theme Support](../features/theme-support.md))

### Bug Fixes Tied to Shepherd Integration

- **v1.6.1** — added `.nextcloud-wizard-step[hidden] { display: none }` to prevent Shepherd-hidden steps from stacking visibly behind the active step (was caused by `.nextcloud-wizard-step { display: flex }` overriding the browser default)
- **v1.5.0** — added `max-height` and internal body scrolling so long mobile steps remain navigable
- **v1.4.2** — added fallback CSS selectors and 10s timeout to the app-menu readiness check
- **2.0.0** — a step whose element is not there yet waits aside in a corner, leaves the page usable, and moves to the element once it appears; it replaced the centered display of v1.4.1
- **v1.4.1** — steps with missing target elements fell back to centered display instead of being silently skipped

## Build Configuration

- `npm run build` — production build (minified, no source maps)
- `npm run watch` — watch mode for active development

Bundle outputs go to `js/`. The `src/` directory is **not** included in App Store tarballs — only compiled assets.

## Translation Flow

- Vue components and JS use `t('introvox', '<English source>')` from `@nextcloud/l10n`
- `python3 scripts/po2l10n.py` converts `translationfiles/<lang>/introvox.po` (from `tx pull`) into `l10n/<lang>.js` and `l10n/<lang>.json`, as the Nextcloud Transifex bot does: Nextcloud loads the `.js` in the browser (`OC.L10N.register`) and the `.json` on the server
- `OCP\L10N\IFactory::getLanguages()` provides display names for the language picker (v1.6.0+)

See [Transifex Integration](transifex-integration.md) for the full translation workflow.

## See Also

- [Architecture Overview](overview.md)
- [Backend Architecture](backend-architecture.md)
- [Guided Tours](../features/guided-tours.md) — Shepherd lifecycle
- [Theme Support](../features/theme-support.md) — CSS variable inheritance
