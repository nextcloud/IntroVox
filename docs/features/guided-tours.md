# Guided Tours

IntroVox's tour engine is built on [Shepherd.js](https://shepherdjs.dev/), wrapped in a Vue 3 frontend. This document describes how a tour is chosen and started, how steps are rendered, what types exist, and how they're sequenced.

## Tour Lifecycle

1. **Bootstrap** — every Nextcloud page loads `main.js`, a small bootstrap (about 20 KB). It reads the `introvox/runtime` initial state that the `LoadScripts` listener adds to the page, plus browser storage, and decides with `src/runtime/chooseTour.mjs` whether a tour starts on this page, and which (see [Which Tour Starts](#which-tour-starts)). That takes no request. On a page without a tour nothing else loads
2. **Tour code** — only when a tour starts does the bootstrap load the tour chunk (`src/runtime/tour.js`: WizardManager, Shepherd.js, Vue and `css/wizard.css`)
3. **Steps** — WizardManager fetches the steps for the user's language and groups: `GET /apps/introvox/api/steps` for the welcome tour, `GET /apps/introvox/api/steps?tour=<id>` for another tour
4. **Readiness check** — waits for Nextcloud's header and app menu: the apps "waffle" on Nextcloud 34+, the inline app bar on older versions (10-second timeout), then one more second. A tour for an app also waits for the app itself: its first step's element or the app's content, no dialog of the app open, and the tab in view (15-second timeout)
5. **Start** — creates a Shepherd `Tour` with the steps and shows the first one. A tour for an app first tells the server it started; the server answers whether this is the first start at this version, and only then does it show (or when it was started by hand), so two open tabs never both run it
6. **User navigation** — Next/Back/Close/Done buttons, the arrow keys, or the step's own way to continue (see [How a Step Continues](#how-a-step-continues)). In a run that started by itself, each step further than the run got before is reported for **How far people get**
7. **Completion** — the welcome tour sets localStorage and (on Done/Skip) its done mark (`wizard_disabled`); another tour reports `complete` or `skip`. A tour that went to other apps then returns to the configured homepage (see [Tours Across Apps](#tours-across-apps))

## Step Types

### Centered Steps

- `attachTo: ""` (empty)
- Appear as a centered modal in the middle of the screen
- Used for welcome, transitions, and conclusion messages

### Attached Steps

- `attachTo: "<css-selector>"` with `position` set to `right`, `left`, `top`, or `bottom`
- The target element gets an outline in the theme's colour, and a blinking arrow points from the step to it, also inside dialogs. Both keep still for people who prefer reduced motion
- The step tooltip is positioned next to the element

### Steps That Wait for Their Element

If an attached step's element is not on the page when the step shows, the step waits for it. It stands aside in the bottom right corner with its text, or in the bottom left corner while a dialog is open, clear of the dialog's buttons. The tour's dark overlay goes, so the page stays usable. As soon as the element appears, however long the user takes, the step moves to it. **Next** still goes on without it.

This is what lets a tour lead someone through work of their own: the step about a new conversation's participants waits until the user has created the conversation. See [Steps that wait for the user](../admin/managing-steps.md#steps-that-wait-for-the-user).

Older versions skipped such a step (before 1.4.1) or showed it centered.

### Steps Inside a Menu

A step with **Open first** set clicks that button (usually a menu trigger) before it shows, so a target inside the menu exists, and closes the menu again afterwards. The highlighted item is not clickable during the step, so the menu stays put.

While a step points into a menu, the tour keeps that menu open. Nextcloud 35's apps menu otherwise closes 180 ms after the pointer leaves it or its button, which happened as soon as the user moved the mouse to the tour's tooltip.

### How a Step Continues

**Continue with** in the step editor sets the step's `advance`:

| `advance` | Continue with | What the user does |
|---|---|---|
| `button` (default) | **Next button** | Clicks **Next** |
| `click` | **Click on the element** | Clicks the step's element. The step says "Click the highlighted element to continue." and has no Next button while the element is there |
| `input` | **Filling in the field** | Types in the field the step points at. **Next** stays off until the field has text; the step says "Fill in the highlighted field to continue." |

With `click`, the click first does its own work: a menu or dialog opens and the next step follows; a link to another app loads that app and the tour resumes there at the next step (see [Tours Across Apps](#tours-across-apps)). On the last step the click completes the tour. If the element is missing, or goes away without the click (its dialog closed with ✕ or Escape), the step shows a Next button and waits aside instead.

With `input`, a step on a block around a field looks at the field inside it. Without a field, or once the field is gone, Next works as usual.

## Tours Across Apps

A step with a **page** (for example `/apps/spreed/` for Talk) belongs to that app. When the tour reaches it on another page, it opens that app and carries on there:

- **Navigation** — before showing the step the tour stores its progress in `sessionStorage` (per browser tab, valid for 10 minutes) and loads the app. The new page picks the tour up at that step, in the same direction (Next or Back).
- **Waiting for the target** — apps like Talk render after the page load, so the step waits up to 5 seconds for its element before it shows. If the element is still not there, the step waits aside for it (see [Steps That Wait for Their Element](#steps-that-wait-for-their-element)).
- **Unreachable apps** — if the user ends up elsewhere (the app is not enabled for them and Nextcloud redirects), the step is skipped, never retried.
- **Talk and Files routes** — an open Talk conversation (`/call/…`) counts as Talk, a file link (`/f/…`) as Files.
- **Steps without a page** show wherever the tour is at that moment. Give a step a page to bring the tour back to, say, the dashboard.
- **End of the tour** — on **Done**, a tour that is no longer on the page it started on goes to the configured homepage (the default app `/` redirects to), after the completion is recorded. Closing with **✕** leaves the user where they are.
- **Telemetry** — a tour spanning several pages still counts as one start.

## Step Filtering

Steps are filtered server-side before reaching the frontend:

1. **Enable check** — for the welcome tour, if **Tours for everyone** (`wizard_enabled`) or the welcome tour itself is off, the API returns an empty step list. For another tour, anyone who may not get it (tours or the tour are off, the tour is unknown, they are outside its groups, or cannot open its app) gets a 404, the same answer for each case
2. **Language resolution** — `IFactory::findLanguage(null)` resolves the user's language. The welcome tour serves the admin override for the user's full language, else for its base language (`wizard_steps_pt_BR`, then `wizard_steps_pt`; an admin makes overrides per base language, so one for `pt` serves `pt_BR` too). Without an override it serves the Transifex-translated default set in the full language, else the base language, else English. See [Multi-Language Support](multi-language.md#fallback-table). Another tour serves the steps of the user's language, else its base language, else the tour's main language; a built-in tour without steps of the admin's own serves its translated default steps
3. **Group check** — steps with non-empty `visibleToGroups` must intersect with the user's groups (via `IGroupManager::getUserGroupIds()`)

Disabled steps (`enabled: false`) are also filtered out before being sent to the frontend.

See [API Reference](../architecture/api-reference.md) for the request/response format.

## Which Tour Starts

The bootstrap asks `chooseTour()`; the first rule that applies decides:

1. In the admin's element picker, or in someone else's same-origin frame: no tour
2. A share link (**Copy link**) starts its tour on the page it opened
3. A tour underway (a step that opened another page) carries on; a start by hand from the personal settings starts that tour
4. On IntroVox's own admin page: no tour (the admin tour runs there)
5. **Tours for everyone** off (`wizard_enabled`), or **Start tours by themselves** off for this user (`tours_disabled`): no tour
6. The welcome tour comes first, on whichever page the user opens: unless it is switched off, or the user finished or skipped it (`wizard_disabled`), it starts when this browser has not marked it completed, or marked it at another `wizard_version` (raised by **Show again to everyone**)
7. A tour ended in this tab less than 2 minutes ago: no tour, so two tours never run back to back
8. The first tour for an app or page that is due on this page; a tour that starts anywhere is due on every page. Due means: the user may get it, has not seen this version (`tour_<id>_seen`), fits **Who gets it**, and it is its time (days after the first login, dates)

A start by hand and a share link also work with **Start tours by themselves** off and outside a tour's dates; the server still checks that the user may get the tour. See [Tours](../admin/tours.md#when-a-tour-starts) and [Frontend Architecture](../architecture/frontend-architecture.md#tour-runtime).

## Telemetry Events

The frontend reports these events:

| Event | Endpoint | When |
|---|---|---|
| Welcome tour `start` | `POST /apps/introvox/api/wizard/start` | The welcome tour begins for a user |
| Welcome tour `complete` | `POST /apps/introvox/api/wizard/complete` | User clicks **Done** on the last step, or the element of a last step that continues on click |
| Welcome tour `skip` | `POST /apps/introvox/api/wizard/skip` | User clicks **Skip and don't show again** |
| Other tours | `POST /apps/introvox/api/tours/{id}/event` with `start`, `complete` or `skip` | The same moments; `start` also marks the tour seen |
| Step reached | `POST /apps/introvox/api/tours/{id}/reached` | A step further than this run got before, for any tour, in a run that started by itself |

The server keeps a time per user (`wizard_started`, `wizard_completed`, `wizard_skipped`; `tour_<id>_completed`, `tour_<id>_skipped`) and how far their last run got (`tour_<id>_reached`). The **Statistics** pane shows these as totals per tour, counting people, not clicks. A start by hand and a preview do not count for **How far people get**.

See [Backend Architecture](../architecture/backend-architecture.md) for the telemetry service details, and [Telemetry](../admin/telemetry.md) for what the anonymous usage statistics send.

## Theming

The tour inherits Nextcloud's CSS variables, so light/dark/high-contrast modes work automatically. See [Theme Support](theme-support.md).

## Closing Behavior

| Action | localStorage | Server preference | Starts by itself again? |
|---|---|---|---|
| **✕ Close** or Esc | `introvox_completed`: `true` | unchanged | Not in this browser; in another browser, yes |
| **Done** | `introvox_completed`: `true` | `wizard_disabled: true` | No, until **Show again to everyone** |
| **Skip and don't show again** | `introvox_completed`: `true` | `wizard_disabled: true` | No, until **Show again to everyone** |

This is the welcome tour. A tour for an app counts as seen as soon as it starts, so it doesn't start by itself again, however it ends; its first step has **Skip** instead of **Skip and don't show again**.

## Customization Surface

Administrators can configure, per step:

- Step title (plain text + emoji)
- Step content (HTML: stored as written, and cleaned in the browser with DOMPurify wherever it is shown; see [HTML in Step Content](customization.md#html-in-step-content))
- An image, GIF or video above the text, with a description and captions
- CSS selector for element highlighting, picked with **Pick element**
- A menu button to open first, for elements inside a menu
- The page (app) a step belongs to
- Position relative to the highlighted element
- How it continues: **Next button**, **Click on the element** or **Filling in the field**
- Enable/disable per step
- Group visibility per step (v1.2.0+)
- Step order, by dragging or with the **Move step up** and **Move step down** buttons

And per tour: where it starts (an app, a page, or anywhere), its name and main language, its groups, **Who gets it**, and when it starts by itself (days after the first login, dates).

See [Customization](customization.md) and [Managing Tour Steps](../admin/managing-steps.md).

## See Also

- [Customization](customization.md) — HTML, CSS selectors, positioning
- [Step Visibility](step-visibility.md) — group filters and user preferences
- [Multi-Language Support](multi-language.md) — per-language step content
- [Tours](../admin/tours.md) — preview, [share links](../admin/tours.md#share-a-tour-with-a-link), [statistics](../admin/tours.md#statistics), [export and import](../admin/tours.md#move-a-tour-to-another-nextcloud) and [AI](../admin/tours.md#write-or-translate-steps-with-ai)
- [Theme Support](theme-support.md) — light/dark/high contrast
- [Architecture Overview](../architecture/overview.md) — system design
