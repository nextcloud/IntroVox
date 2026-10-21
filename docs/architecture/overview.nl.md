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
│  │  │ (wizard_*) │  │ (wizard_*, tours_*, tour_*)   │   │   │
│  │  └────────────┘  └───────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  licenses.voxcloud.nl
              (telemetrie + optionele abonnementssleutel)
```

## Kerncomponenten

### Frontend (Vue 3 + Shepherd.js)

| Component | Verantwoordelijkheid |
|---|---|
| `src/main.js` | Kleine bootstrap op elke Nextcloud-pagina: beslist of er een tour draait (`src/runtime/chooseTour.mjs`) en laadt pas dan de tour-code |
| `src/runtime/tour.js` | De tour-chunk: mount `WizardManager`; alleen geladen op een pagina waar een tour draait |
| `src/admin.js` | Admin-instellingen-UI-entry-point |
| `src/personal.js` | Persoonlijke-instellingen-UI-entry-point |
| `src/components/WizardManager.vue` | Beheert Shepherd.js-tour-levenscyclus en stap-rendering, voor de welkomsttour en tours voor apps |
| `src/admin/ToursList.vue`, `src/admin/NewTourDialog.vue` | Het paneel Tours van de beheerder: de lijst met tours, en een tour voor een app maken of wijzigen |
| `src/admin/TourEditor.vue`, `src/admin/StepWizard.vue` | De stappen van één tour, en de dialoog die een stap bewerkt, met de teksteditor en de media (`StepTextEditor.vue`, `StepMediaBlock.vue`) |
| `src/components/SupportSettings.vue` | Het paneel **Support**: over IntroVox, links, en **Show the admin tour again** |
| `src/components/wizardSteps.js` | Default-stap-definities gewrapped in `t('introvox', ...)`, en de helpers die het element van een stap zoeken en erop wachten |

Technologie-stack: Vue 3 (Composition API), webpack, [Shepherd.js](https://shepherdjs.dev/), `@nextcloud/vue`.

Zie [Frontend-architectuur](frontend-architecture.nl.md).

### Backend (PHP)

| Component | Verantwoordelijkheid |
|---|---|
| `AdminController` | Admin-CRUD voor de stappen van elke tour, talen, instellingen; export/import |
| `ToursController` | Admin: de tours zelf (lijst, aanmaken, wijzigen, verwijderen, opnieuw tonen, statistieken, exporteren en importeren) |
| `AssistantController`, `TourAssistant` | Admin: een tour vertalen en stappen laten schrijven met de Nextcloud Assistant (`OCP\TaskProcessing`) |
| `ApiController` | Endpoints voor elke ingelogde gebruiker: `getWizardSteps`, `tourEvent`, `tourReached`, `checklistOpened`, tracking-events |
| `LinkController` | De deellink van een tour, `GET /tour/{id}`: stuurt door naar de pagina van de tour |
| `MediaController`, `MediaUploadController`, `MediaService` | Afbeeldingen, video's en ondertitels in stappen: gecontroleerd, ontdaan van metadata, opgeslagen in de app-data van IntroVox, alleen geserveerd aan gebruikers die de stap krijgen |
| `LicenseController` | Een optionele abonnementssleutel: validatie en gebruiksrapport. Niets in IntroVox wordt erdoor beperkt |
| `PersonalController` | Per-gebruiker-tour-voorkeuren (`wizard_disabled`, `tours_disabled`) en de lijst met tours voor apps van de gebruiker |
| `TourRepository`, `TourStateService`, `TourValidator` | De tours, per-gebruiker-tour-staat, en een tour controleren voor hij wordt opgeslagen |
| `TelemetryService` | Aggregeert anonieme gebruiks-stats; verzendt naar licentie-server |
| `LicenseService` | Valideert de optionele abonnementssleutel tegen `licenses.voxcloud.nl` |
| `TelemetryJob` | Background-job die telemetrie elke 24 uur verzendt, zodra een beheerder de vraag gezien heeft |
| `LicenseUsageJob` | Background-job die dagelijks (met stabiele jitter) het gebruik rapporteert als er een abonnementssleutel is |
| `LoadScripts` | Event-listener die IntroVox' bootstrap op elke pagina laadt, met de initial state `introvox/runtime` |
| `UserMenuEntry` | Event-listener die **Tours** aan het gebruikersmenu toevoegt |
| `ChecklistWidget` | "Getting started" op het Dashboard (Dashboard-API v2) |
| `AdminSettings` / `PersonalSettings` | Nextcloud-Settings-pagina-integratie |

Zie [Backend-architectuur](backend-architecture.nl.md).

### Opslag-model

| Opslag | Gebruik |
|---|---|
| `oc_appconfig` | Globale instellingen (`wizard_enabled`, `wizard_version`); per-taal-overrides van de welkomsttour (`wizard_steps_<lang>`, alleen als een beheerder er een heeft opgeslagen); de tour-index (`tours`) en de stappen van tours voor apps (`tour_steps_<id>_<lang>`); telemetrie-voorkeuren |
| `oc_preferences` | Per-gebruiker-staat (`introvox/wizard_disabled`, `tours_disabled`, `tour_<id>_seen` / `_completed` / `_skipped` / `_reached`, `checklist_<id>`, `checklist_uploaded`, telemetrie-timestamps voor `markUserStarted/Completed/Skipped`) |
| App-data van IntroVox (`IAppData`) | Afbeeldingen, video's en ondertitels van stappen; JSON-back-ups van de laatste tien verwijderde tours |
| Browser-localStorage | Alleen-frontend voltooiings-staat van de welkomsttour (`introvox_completed`, `introvox_version`); gecheckt tegen `wizard_version` om auto-restart te beslissen |

Geen custom database-tabellen — IntroVox blijft binnen Nextcloud's standaard opslag-abstracties.

## Integratie-punten

### Nextcloud-services

IntroVox is afhankelijk van deze Nextcloud-APIs:

- **`OCP\IConfig`** — globale en per-gebruiker-configuratie
- **`OCP\IL10N`** — gebruikers-taal-detectie en vertaling
- **`OCP\IGroupManager`** — groep-lidmaatschap-checks voor stap-filtering
- **`OCP\IUserSession`** — current-user-lookup
- **DOMPurify** (frontend) — schoont stap-HTML op bij het tonen (`src/utils/stepHtml.js`)
- **`OCP\Support\Subscription\IRegistry`** — `delegateHasValidSubscription()` en `delegateHasExtendedSupport()`, gemeld in de telemetrie
- **`OCP\TaskProcessing\IManager`** — `core:text2text`-taken voor **Translate with AI** en **Write steps with AI**
- **`OCP\Files\IAppData`** — de eigen kopieën van media in stappen, en back-ups van tours
- **`OCP\Dashboard\IAPIWidgetV2`** — de checklist op het Dashboard
- **`LoadAdditionalEntriesEvent`** — **Tours** in het gebruikersmenu
- **`OCP\App\IAppManager`**, **`OCP\INavigationManager`** — of een gebruiker de app van een tour kan openen, en het apps-menu voor **Where does it start?**
- **`OCP\L10N\IFactory`** — taal-display-naam-auto-discovery (v1.6.0+)
- **Nextcloud-Settings-secties** — admin- en persoonlijke-instellingen-pagina's
- **Background-jobs** — `TimedJob` voor telemetrie en het gebruiksrapport

### Externe services

- **`licenses.voxcloud.nl`** — telemetrie-verzameling, en validatie van een optionele abonnementssleutel (niets in IntroVox hangt ervan af)

## Request-flow: tour-start

```
Browser                  IntroVox-frontend            IntroVox-backend
   │                              │                          │
   │── elke pagina ──────────────────────────────────────────▶│
   │                              │                          │── LoadScripts: js/main.js,
   │                              │                          │   luie 'runtime'-initial-state
   │                              │                          │   (schakelaars, welkomstversie,
   │                              │                          │    app-tours die klaarstaan)
   │◀─ pagina + runtime-state ───────────────────────────────│
   │── main.js (klein) ──────────▶│                          │
   │                              │── chooseTour(): geen     │
   │                              │   tour? stop, geen request│
   │                              │── laad 'tour'-chunk      │
   │                              │── GET /api/steps         │
   │                              │   (?tour=<id> voor een   │
   │                              │    app-tour) ───────────▶│
   │                              │                          │── welkomst: wizard_steps_<lang>, of de
   │                              │                          │   vertaalde standaard (DefaultStepsService)
   │                              │                          │── app-tour: tour_steps_<id>_<lang>;
   │                              │                          │   404 als hij niet voor deze gebruiker is
   │                              │                          │── filter op visibleToGroups
   │                              │◀─ steps[] ───────────────│
   │                              │── wacht op de app        │
   │                              │── Shepherd.start()       │
   │                              │── POST /api/wizard/start │
   │                              │   of /api/tours/<id>/event ▶│── tellen / als gezien markeren
   │◀─ tour verschijnt ───────────│                          │
```

Zie [Frontend-architectuur](frontend-architecture.nl.md) voor de volgorde van de regels in `chooseTour()`.

## Beveiligings-model

- **CSRF-bescherming** op elke route, ook `GET`, sinds 2.0.0, behalve `GET /media/{file}` (een `<img>` of `<video>` kan geen token meesturen) en `GET /tour/{id}` (een deellink uit een mail; stuurt alleen door). v1.5.0 herstelde haar op de state-changing admin-endpoints
- **Defensieve admin-checks** via `IGroupManager::isAdmin()` op elk admin-endpoint, naast de framework-annotation-based check
- **Stap-HTML** wordt bij opslaan en importeren gecontroleerd (`StepValidator`: bekende velden, types, lengtes) en bij tonen opgeschoond: `sanitizeStepHtml()` (DOMPurify) laat alleen eenvoudige opmaak en links over, zodat geïmporteerde bestanden en Transifex-vertalingen geen markup kunnen toevoegen. Tot en met 1.6.x escapete `OCP\Util::sanitizeHTML` het bij opslaan; `UnescapeLegacyWizardStepHtml` herstelt stappen die zo zijn opgeslagen
- **Server-side groep-filtering** — `visibleToGroups` wordt afgedwongen op de API-laag; verborgen stappen worden nooit naar de client gestuurd
- **HTTP-response-validatie** op licentie-server-calls — `LicenseService` checkt statuscodes en JSON-shape voor responses te vertrouwen (v1.5.0+)

## Veerkracht

- **Defensieve `is_array()`-guard** in `TourRepository::steps()` — als `wizard_steps_<lang>` of `tour_steps_<id>_<lang>` niet decodeert naar een JSON-array, telt het als geen stappen, en valt de backend terug op defaults in plaats van crashen
- **App-menu-readiness-fallback-selectors + 10s-timeout** (v1.4.2+) — tour blijft niet oneindig hangen als menu-selectors niet matchen
- **Stappen wachten op een ontbrekend element** — een stap waarvan het element er nog niet is, wacht met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is), laat de pagina bruikbaar en schuift naar het element zodra het verschijnt; **Next** gaat gewoon verder. Tot en met 1.7.x werd zo'n stap gecentreerd getoond (v1.4.1+), daarvoor overgeslagen

## Zie ook

- [API-referentie](api-reference.nl.md) — REST-endpoints
- [Frontend-architectuur](frontend-architecture.nl.md) — Vue 3 + Shepherd.js-details
- [Backend-architectuur](backend-architecture.nl.md) — PHP-controllers en -services
- [Transifex-integratie](transifex-integration.nl.md) — l10n-workflow
