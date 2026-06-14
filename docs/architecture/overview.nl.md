# Architectuur-overzicht

Dit document geeft een technisch overzicht van IntroVox' architectuur voor architecten, ontwikkelaars en IT-besluitvormers.

## Systeem-overzicht

IntroVox is een Nextcloud-app die de standaard Nextcloud-app-architectuur volgt: een PHP-backend die REST-endpoints exposed, een Vue-3-frontend gebundeld met webpack, en staat opgeslagen in Nextcloud's `appconfig`- en `preferences`-tabellen.

```
┌──────────────────────────────────────────────────────────────┐
│                       Nextcloud-server                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  Files / Apps   │  │     IL10N · IGroupManager       │  │
│  │     -menu       │  │     IUserSession · IConfig      │  │
│  └────────┬────────┘  └──────────────┬───────────────────┘  │
│           │                          │                       │
│  ┌────────┴──────────────────────────┴────────────────────┐ │
│  │                     IntroVox-app                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ Vue-frontend │──│ PHP-REST-API │──│ Background-  │ │ │
│  │  │ Shepherd.js  │  │ controllers  │  │ jobs         │ │ │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘ │ │
│  │                           │                            │ │
│  │  ┌────────────────────────┴──────────────────────┐    │ │
│  │  │              Services                          │    │ │
│  │  │  TelemetryService · LicenseService            │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│  ┌───────────────────────────┴───────────────────────────┐   │
│  │                  Nextcloud-database                    │   │
│  │  ┌────────────┐  ┌───────────────────────────────┐   │   │
│  │  │ appconfig  │  │ preferences (per gebruiker)   │   │   │
│  │  │ (wizard_*) │  │ (introvox/permanent_disable)  │   │   │
│  │  └────────────┘  └───────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  licenses.voxcloud.nl
              (telemetrie + subscription-validatie)
```

## Kerncomponenten

### Frontend (Vue 3 + Shepherd.js)

| Component | Verantwoordelijkheid |
|---|---|
| `src/App.vue` | Root-Vue-component gemount op elke Nextcloud-pagina |
| `src/main.js` | App-entry-point; bootstrap de wizard en registreert globale handlers |
| `src/admin.js` | Admin-instellingen-UI-entry-point |
| `src/personal.js` | Persoonlijke-instellingen-UI-entry-point |
| `src/components/WizardManager.vue` | Beheert Shepherd.js-tour-levenscyclus en stap-rendering |
| `src/components/SupportSettings.vue` | Enterprise-subscription-UI in admin-Support-tabblad |
| `src/components/wizardSteps.js` | Default-stap-definities gewrapped in `t('introvox', ...)` |

Technologie-stack: Vue 3 (Composition API), webpack, [Shepherd.js](https://shepherdjs.dev/), `@nextcloud/vue`.

Zie [Frontend-architectuur](frontend-architecture.md).

### Backend (PHP)

| Component | Verantwoordelijkheid |
|---|---|
| `AdminController` | Admin-CRUD voor stappen, talen, instellingen; export/import |
| `ApiController` | Publieke endpoints: `getWizardSteps`, tracking-events |
| `LicenseController` | Enterprise-subscription-validatie en -stats |
| `PersonalController` | Per-gebruiker permanent-uitschakelen-voorkeur |
| `TelemetryService` | Aggregeert anonieme gebruiks-stats; verzendt naar licentie-server |
| `LicenseService` | Valideert subscription-keys tegen `licenses.voxcloud.nl` |
| `TelemetryJob` | Background-job die telemetrie dagelijks verzendt |
| `LicenseUsageJob` | Background-job die licentie-staat dagelijks synct (met stabiele jitter) |
| `LoadScripts` | Event-listener die IntroVox' frontend op elke pagina laadt |
| `AdminSettings` / `PersonalSettings` | Nextcloud-Settings-pagina-integratie |

Zie [Backend-architectuur](backend-architecture.md).

### Opslag-model

| Opslag | Gebruik |
|---|---|
| `oc_appconfig` | Globale instellingen (`wizard_enabled`, `enabled_languages`, `wizard_version`); per-taal-stap-configuraties (`wizard_steps_<lang>`); telemetrie-voorkeuren |
| `oc_preferences` | Per-gebruiker-staat (`introvox/permanent_disable`, telemetrie-timestamps voor `markUserStarted/Completed/Skipped`) |
| Browser-localStorage | Alleen-frontend voltooiings-staat (`seen` / `completed`); gecheckt tegen `wizard_version` om auto-restart te beslissen |

Geen custom database-tabellen — IntroVox blijft binnen Nextcloud's standaard opslag-abstracties.

## Integratie-punten

### Nextcloud-services

IntroVox is afhankelijk van deze Nextcloud-APIs:

- **`OCP\IConfig`** — globale en per-gebruiker-configuratie
- **`OCP\IL10N`** — gebruikers-taal-detectie en vertaling
- **`OCP\IGroupManager`** — groep-lidmaatschap-checks voor stap-filtering
- **`OCP\IUserSession`** — current-user-lookup
- **`OCP\Util::sanitizeHTML`** — XSS-preventie op stap-content (v1.5.0+)
- **`OCP\Util::hasExtendedSupport`** — Enterprise-tier-detectie (v1.5.0+)
- **`OCP\L10N\IFactory`** — taal-display-naam-auto-discovery (v1.6.0+)
- **Nextcloud-Settings-secties** — admin- en persoonlijke-instellingen-pagina's
- **Background-jobs** — `TimedJob` voor telemetrie en licentie-sync

### Externe services

- **`licenses.voxcloud.nl`** — Enterprise-subscription-validatie en telemetrie-verzameling (v1.4.x+)

## Request-flow: tour-start

```
Browser                  IntroVox-frontend            IntroVox-backend
   │                              │                          │
   │── login bij NC ─────────────▶│                          │
   │                              │── GET /api/steps ───────▶│
   │                              │                          │── laad wizard_enabled
   │                              │                          │── laad enabled_languages
   │                              │                          │── detecteer IL10N->getLanguageCode()
   │                              │                          │── laad wizard_steps_<lang>
   │                              │                          │── filter op visibleToGroups
   │                              │◀─ steps[] ───────────────│
   │                              │                          │
   │                              │── wacht op app-menu ─────│
   │                              │── Shepherd.start() ──────│
   │                              │                          │
   │                              │── POST /api/wizard/start │
   │                              │                          │── TelemetryService->markUserStarted()
   │◀─ wizard verschijnt ─────────│                          │
```

## Beveiligings-model

- **CSRF-bescherming** hersteld in v1.5.0 op alle state-changing admin-endpoints
- **Defensieve admin-checks** via `IGroupManager::isAdmin()` op elk admin-endpoint, naast de framework-annotation-based check
- **HTML-sanitization** via `OCP\Util::sanitizeHTML` op stap-`title`- en `text`-velden bij save/update/import (v1.5.0+)
- **Server-side groep-filtering** — `visibleToGroups` wordt afgedwongen op de API-laag; verborgen stappen worden nooit naar de client gestuurd
- **HTTP-response-validatie** op licentie-server-calls — `LicenseService` checkt statuscodes en JSON-shape voor responses te vertrouwen (v1.5.0+)

## Veerkracht

- **Defensieve `is_array()`-guard** in `ApiController::getWizardSteps` (v1.4.3+) — als `wizard_steps_<lang>` niet decodeert naar een JSON-array, valt de backend terug op defaults in plaats van crashen
- **App-menu-readiness-fallback-selectors + 10s-timeout** (v1.4.2+) — tour blijft niet oneindig hangen als menu-selectors niet matchen
- **Element-not-found-fallback naar gecentreerde weergave** (v1.4.1+) — stappen met ontbrekende doel-elementen renderen als gecentreerde modals in plaats van stil te worden overgeslagen

## Zie ook

- [API-referentie](api-reference.md) — REST-endpoints
- [Frontend-architectuur](frontend-architecture.md) — Vue 3 + Shepherd.js-details
- [Backend-architectuur](backend-architecture.md) — PHP-controllers en -services
- [Transifex-integratie](transifex-integration.md) — l10n-workflow
