# Guided Tours

IntroVox's tour engine is built on [Shepherd.js](https://shepherdjs.dev/), wrapped in a Vue 3 frontend. This document describes how steps are rendered, what types exist, and how they're sequenced.

## Tour Lifecycle

1. **App initialization** — `main.js` mounts the IntroVox Vue app on every Nextcloud page
2. **Server request** — frontend calls `GET /apps/introvox/api/steps` to fetch the configured step list for the current user's language and group memberships
3. **App-menu readiness check** — waits for Nextcloud's app menu to render (since v1.4.1, with multiple fallback selectors and a 10-second timeout)
4. **Shepherd instantiation** — creates a Shepherd `Tour` with the loaded steps
5. **Auto-start** — if the user hasn't completed/disabled the tour, it starts after a short delay
6. **User navigation** — Next/Back/Close/Done buttons fire Shepherd actions and telemetry events
7. **Completion** — sets localStorage and (on Done/Skip) the permanent-disable preference

## Step Types

### Centered Steps

- `attachTo: ""` (empty)
- Appear as a centered modal in the middle of the screen
- Used for welcome, transitions, and conclusion messages

### Attached Steps

- `attachTo: "<css-selector>"` with `position` set to `right`, `left`, `top`, or `bottom`
- The target element gets a glowing border via Shepherd's overlay
- The step tooltip is positioned next to the element

### Fallback Behavior (v1.4.1+)

If an attached step's target element is not found at tour start (e.g., Vue hasn't rendered it yet, or the app isn't installed), the step **falls back to a centered display** instead of being silently skipped. This was changed in v1.4.1 to avoid losing important content when timing or DOM availability varies.

Pre-v1.4.1, missing elements caused the step to be skipped entirely with a console warning:

```
⚠️ Wizard: Skipping step 'X' - element not found
```

## Step Filtering

Steps are filtered server-side before reaching the frontend:

1. **Global enable check** — if `wizard_enabled` is `false`, the API returns an empty step list
2. **Language resolution** — `IFactory::findLanguage(null)` resolves the user's base language; the API serves either the admin override `wizard_steps_<lang>` or the Transifex-translated default set (with explicit English fallback when no translation exists for that language)
3. **Group check** — steps with non-empty `visibleToGroups` must intersect with the user's groups (via `IGroupManager::getUserGroupIds()`)

Disabled steps (`enabled: false`) are also filtered out before being sent to the frontend.

See [API Reference](../architecture/api-reference.md) for the request/response format.

## Auto-Start Conditions

The tour auto-starts when **all** of these are true:

- `wizard_enabled` is `true` (admin setting)
- The user has not set the `permanent_disable` preference
- The user has not completed the wizard (per localStorage)
- The current `wizard_version` is newer than what the user last saw (used by **Show wizard to all users**)
- The current page is the dashboard

## Telemetry Events

The frontend reports three lifecycle events:

| Event | Endpoint | When |
|---|---|---|
| `start` | `POST /apps/introvox/api/track/start` | Tour begins for a user |
| `complete` | `POST /apps/introvox/api/track/complete` | User clicks **Done** on last step |
| `skip` | `POST /apps/introvox/api/track/skip` | User clicks **Skip and don't show again** |

These are stored anonymously via `TelemetryService` and contribute to aggregate admin statistics.

See [Backend Architecture](../architecture/backend-architecture.md) for the telemetry service details.

## Theming

The tour inherits Nextcloud's CSS variables, so light/dark/high-contrast modes work automatically. See [Theme Support](theme-support.md).

## Closing Behavior

| Action | localStorage | Server preference | Re-shown? |
|---|---|---|---|
| **✕ Close** | `seen` | unchanged | Yes |
| **Done** | `completed` | `permanent_disable: true` | No, unless admin force-shows |
| **Skip and don't show again** | `completed` | `permanent_disable: true` | No, unless admin force-shows |

## Customization Surface

Administrators can configure:

- Step title (plain text + emoji)
- Step content (HTML, sanitized server-side since v1.5.0)
- CSS selector for element highlighting
- Position relative to the highlighted element
- Enable/disable per step
- Group visibility per step (v1.2.0+)
- Step order via drag-and-drop

See [Customization](customization.md) and [Managing Wizard Steps](../admin/managing-steps.md).

## See Also

- [Customization](customization.md) — HTML, CSS selectors, positioning
- [Step Visibility](step-visibility.md) — group filters and user preferences
- [Multi-Language Support](multi-language.md) — per-language step content
- [Theme Support](theme-support.md) — light/dark/high contrast
- [Architecture Overview](../architecture/overview.md) — system design
