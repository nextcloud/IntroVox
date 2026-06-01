# Frontend Architecture

IntroVox's frontend is a Vue 3 single-page app bundled with webpack, integrated into Nextcloud as three entry points: the wizard runtime, the admin settings page, and the personal settings page.

## Entry Points

| Entry | Output bundle | Loaded on |
|---|---|---|
| `src/main.js` | `js/main.js` | Every Nextcloud page (via `LoadScripts` listener) |
| `src/admin.js` | `js/admin.js` | Admin settings → IntroVox |
| `src/personal.js` | `js/personal.js` | Personal settings → IntroVox |

Webpack produces ~210 KB for `main.js`. Other bundles are smaller (admin/personal are scoped to their respective settings pages).

## Component Tree

```
App.vue
└── WizardManager.vue          ← Shepherd.js tour lifecycle
    ├── (Shepherd-managed step DOM, not Vue components)
    └── PWA install instructions (~50 strings, v1.6.0+)

Admin settings page (src/admin.js)
└── AdminSettings.vue
    ├── Steps tab (CRUD + drag-drop + import/export)
    ├── Settings tab (global + languages)
    ├── Statistics tab (telemetry)
    └── Support tab → SupportSettings.vue (v1.5.0+)

Personal settings page (src/personal.js)
└── PersonalSettings.vue
```

## Key Files

### `src/App.vue`

Root component. Decides whether to mount `WizardManager` based on:

- Server response from `GET /api/steps`
- `localStorage['introvox_completed']`
- Current page (only auto-starts on the dashboard)

### `src/components/WizardManager.vue`

Manages the Shepherd.js tour:

1. Receives step list from parent
2. Instantiates `new Shepherd.Tour({...})`
3. Registers Next/Back/Done/Skip handlers
4. Fires telemetry events via `axios.post('/api/wizard/...')`
5. Updates localStorage on close/complete/skip
6. Calls `POST /personal/settings` on Skip and Done to set `permanent_disable`

### `src/components/wizardSteps.js`

Default step definitions wrapped in `t('introvox', ...)`. Used when:

- `GET /api/steps` returns `useDefault: true`
- For new installations before any admin customization

Since v1.6.0, all 16 default step titles and texts use English source strings as Transifex msgids rather than opaque `step_welcome_title`-style keys.

### `src/components/SupportSettings.vue` (v1.5.0+)

Enterprise subscription management UI:

- Subscription key input
- Validation against `licenses.voxcloud.nl`
- Per-language step-count progress bars showing free-tier (10 steps per language) vs. licensed limits

### `src/utils/deviceDetection.js` (v1.6.0+)

OS/browser detection used by the PWA install step. All ~40 user-facing strings are wrapped in `t()` (fixed in v1.6.0 — they were previously hardcoded Dutch).

## State Management

IntroVox does **not** use Vuex or Pinia. State is kept local to components:

- **Step list** — loaded once per page via `GET /api/steps`, kept in `WizardManager.vue`'s reactive state
- **Admin step editing** — local component state in `AdminSettings.vue`; persisted only when **Save changes** is clicked
- **User completion state** — split across browser localStorage (frontend-only) and the server preferences table (`permanent_disable`)
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
- **v1.4.1** — steps with missing target elements now fall back to centered display instead of being silently skipped

## Build Configuration

- `npm run build` — production build (minified, no source maps)
- `npm run build:dev` — development build (readable, source maps)
- `npm run watch` — watch mode for active development

Bundle outputs go to `js/`. The `src/` directory is **not** included in App Store tarballs — only compiled assets.

## Translation Flow

- Vue components and JS use `t('introvox', '<English source>')` from `@nextcloud/l10n`
- `python3 regenerate_js_translations.py` converts `l10n/<lang>.json` files into `l10n/<lang>.js` files that webpack picks up
- `OCP\L10N\IFactory::getLanguages()` provides display names for the language picker (v1.6.0+)

See [Transifex Integration](transifex-integration.md) for the full translation workflow.

## See Also

- [Architecture Overview](overview.md)
- [Backend Architecture](backend-architecture.md)
- [Guided Tours](../features/guided-tours.md) — Shepherd lifecycle
- [Theme Support](../features/theme-support.md) — CSS variable inheritance
