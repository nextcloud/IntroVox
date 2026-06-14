# Frontend-architectuur

De frontend van IntroVox is een Vue-3-single-page-app gebundeld met webpack, geïntegreerd in Nextcloud als drie entry-points: de wizard-runtime, de admin-instellingen-pagina en de persoonlijke-instellingen-pagina.

## Entry-points

| Entry | Output-bundle | Geladen op |
|---|---|---|
| `src/main.js` | `js/main.js` | Elke Nextcloud-pagina (via `LoadScripts`-listener) |
| `src/admin.js` | `js/admin.js` | Admin-instellingen → IntroVox |
| `src/personal.js` | `js/personal.js` | Persoonlijke instellingen → IntroVox |

Webpack produceert ~210 KB voor `main.js`. Andere bundles zijn kleiner (admin/personal zijn gescoped tot hun respectievelijke instellingen-pagina's).

## Component-boom

```
App.vue
└── WizardManager.vue          ← Shepherd.js-tour-levenscyclus
    ├── (Shepherd-managed step-DOM, geen Vue-componenten)
    └── PWA-installatie-instructies (~50 strings, v1.6.0+)

Admin-instellingen-pagina (src/admin.js)
└── AdminSettings.vue
    ├── Stappen-tabblad (CRUD + drag-drop + import/export)
    ├── Instellingen-tabblad (globaal + talen)
    ├── Statistieken-tabblad (telemetrie)
    └── Support-tabblad → SupportSettings.vue (v1.5.0+)

Persoonlijke-instellingen-pagina (src/personal.js)
└── PersonalSettings.vue
```

## Kern-bestanden

### `src/App.vue`

Root-component. Beslist of `WizardManager` gemount wordt op basis van:

- Server-response van `GET /api/steps`
- `localStorage['introvox_completed']`
- Huidige pagina (start alleen automatisch op het dashboard)

### `src/components/WizardManager.vue`

Beheert de Shepherd.js-tour:

1. Ontvangt stap-lijst van parent
2. Instantiëert `new Shepherd.Tour({...})`
3. Registreert Next/Back/Done/Skip-handlers
4. Vuurt telemetrie-events via `axios.post('/api/wizard/...')`
5. Updatet localStorage bij close/complete/skip
6. Roept `POST /personal/settings` aan bij Skip en Done om `permanent_disable` te zetten

### `src/components/wizardSteps.js`

Default-stap-definities gewrapped in `t('introvox', ...)`. Gebruikt wanneer:

- `GET /api/steps` `useDefault: true` teruggeeft
- Voor nieuwe installaties vóór enige admin-customization

Sinds v1.6.0 gebruiken alle 16 default-stap-titels en -teksten Engelse source-strings als Transifex-msgids in plaats van opaque `step_welcome_title`-achtige keys.

### `src/components/SupportSettings.vue` (v1.5.0+)

Enterprise-subscription-beheer-UI:

- Subscription-key-input
- Validatie tegen `licenses.voxcloud.nl`
- Per-taal stap-tellings-progress-bars die free-tier (10 stappen per taal) vs. licensed-limieten tonen

### `src/utils/deviceDetection.js` (v1.6.0+)

OS-/browser-detectie gebruikt door de PWA-installatie-stap. Alle ~40 gebruikers-strings zijn gewrapped in `t()` (gefixt in v1.6.0 — voorheen waren ze hardcoded Nederlands).

## State-management

IntroVox gebruikt **geen** Vuex of Pinia. Staat blijft lokaal per component:

- **Stap-lijst** — eenmalig per pagina geladen via `GET /api/steps`, gehouden in de reactive state van `WizardManager.vue`
- **Admin-stap-bewerking** — lokale component-state in `AdminSettings.vue`; alleen gepersisteerd wanneer **Wijzigingen opslaan** wordt geklikt
- **Gebruikers-voltooiings-staat** — gesplitst over browser-localStorage (alleen frontend) en de server-preferences-tabel (`permanent_disable`)
- **Taal-selectie** (admin) — lokale staat; wisselen met niet-opgeslagen wijzigingen triggert een bevestigings-dialoog

## Tour-engine: Shepherd.js

IntroVox wrapt [Shepherd.js](https://shepherdjs.dev/) voor tour-rendering:

- Elke stap wordt geregistreerd als `tour.addStep({...})`
- Element-markering (`.shepherd-target-click-disabled`) wordt overschreven zodat gebruikers nog steeds op gemarkeerde elementen kunnen klikken
- Custom styling overschrijft Shepherd's default-classes om Nextcloud's thema-variabelen te matchen (zie [Thema-ondersteuning](../features/theme-support.md))

### Bug-fixes gerelateerd aan Shepherd-integratie

- **v1.6.1** — `.nextcloud-wizard-step[hidden] { display: none }` toegevoegd om te voorkomen dat Shepherd-verborgen stappen zichtbaar stapelen achter de actieve stap (werd veroorzaakt door `.nextcloud-wizard-step { display: flex }` die de browser-default overschreef)
- **v1.5.0** — `max-height` en interne body-scrolling toegevoegd zodat lange mobiele stappen navigeerbaar blijven
- **v1.4.2** — fallback-CSS-selectors en 10s-timeout toegevoegd aan de app-menu-readiness-check
- **v1.4.1** — stappen met ontbrekende doel-elementen vallen nu terug op gecentreerde weergave in plaats van stil te worden overgeslagen

## Build-configuratie

- `npm run build` — productie-build (geminified, geen source-maps)
- `npm run build:dev` — development-build (leesbaar, source-maps)
- `npm run watch` — watch-modus voor actieve ontwikkeling

Bundle-outputs gaan naar `js/`. De `src/`-directory is **niet** opgenomen in App-Store-tarballs — alleen gecompileerde assets.

## Vertaal-flow

- Vue-componenten en JS gebruiken `t('introvox', '<Engelse bron>')` uit `@nextcloud/l10n`
- `python3 regenerate_js_translations.py` converteert `l10n/<lang>.json`-bestanden naar `l10n/<lang>.js`-bestanden die webpack oppakt
- `OCP\L10N\IFactory::getLanguages()` levert display-namen voor de taal-picker (v1.6.0+)

Zie [Transifex-integratie](transifex-integration.md) voor de volledige vertaal-workflow.

## Zie ook

- [Architectuur-overzicht](overview.md)
- [Backend-architectuur](backend-architecture.md)
- [Geleide tours](../features/guided-tours.md) — Shepherd-levenscyclus
- [Thema-ondersteuning](../features/theme-support.md) — CSS-variabele-overerving
