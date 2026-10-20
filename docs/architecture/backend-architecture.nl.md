# Backend-architectuur

> **Let op:** de gedetailleerde backend-architectuur is uitvoerig technisch en wordt onderhouden in het Engels. Voor de actuele controller-, service- en background-job-implementatie-details, raadpleeg de [Engelse backend-architectuur](backend-architecture.md).

## Inleiding

De IntroVox-backend is een standaard Nextcloud-PHP-app met:

- **Controllers** voor REST-endpoints (admin, tours, gebruikers, media, license, personal)
- **Services** voor business-logica (tours, stap-validatie, media, telemetrie, licentie-validatie)
- **Repair-steps** die bij een update draaien
- **Background-jobs** voor periodieke taken (telemetrie-verzending, licentie-sync)
- **Settings-integratie** voor Nextcloud-instellingen-pagina's

## Component-categorieën

### Controllers

| Controller | Doel |
|---|---|
| `AdminController` | Stappen van elke tour (parameter `tour`, standaard `welcome`), talen, globale instellingen, export/import, statistieken |
| `ToursController` | De tours zelf (alleen admin): lijst, aanmaken, wijzigen, aan/uit, verwijderen, opnieuw tonen, en de apps voor **Where does it start?** |
| `AssistantController` | Een tour vertalen en stappen laten schrijven met de Nextcloud Assistant (alleen admin): taken inplannen en het resultaat ophalen, alleen van de eigen taken |
| `ApiController` | Endpoints voor gebruikers: `getWizardSteps` (met `?tour=<id>` voor een tour voor een app), `tourEvent`, tracking-events van de welkomsttour |
| `MediaController` / `MediaUploadController` | Media in stappen tonen, en (admin) toevoegen |
| `LicenseController` | Enterprise-subscription-validatie |
| `PersonalController` | Per-gebruiker-voorkeuren `wizard_disabled` en `tours_disabled`, en de tours voor apps die de gebruiker kan krijgen |

Alles wat geweigerd wordt bij de stappen of events van een tour voor een app (onbekende tour, tour uit, gebruiker niet in de groepen of zonder toegang tot de app) krijgt dezelfde 404, zodat niets verraadt welke tours er zijn. `tourEvent` heeft een limiet van 30 verzoeken per uur per gebruiker.

### Services

| Service | Doel |
|---|---|
| `DefaultStepsService` | De acht ingebouwde stappen van de welkomsttour, vertaald via Transifex |
| `TourRepository` | De tour-index (appconfig `tours`, hoogstens 50), de stappen van tours voor apps (`tour_steps_<id>_<lang>`, lazy), wie een tour mag krijgen, opnieuw tonen, verwijderen met back-up |
| `TourStateService` | Per-gebruiker-staat: `tour_<id>_seen`, `_completed`, `_skipped`, `_reached` (hoe ver de laatste automatische run kwam), `tours_disabled`; en of een tour vanzelf start (`due()`) |
| `TourValidator` | Controleert een tour en zijn trigger (app of pagina) voor hij wordt opgeslagen; maakt het id |
| `TourOptOut` | Wie bij de update naar tours per app telt als iemand die de tour bewust had uitgezet |
| `BuiltinTours` | De ingebouwde tours voor Files, Talk, Deck en Calendar: hun stappen via `$l->t()` (Transifex), getest zonder Nextcloud; `TourRepository` toont ze zolang de app er is, bewaart alleen hun staat, en `stepsOrDefaults()` geeft de eigen stappen of de vertaalde standaard |
| `TourSchedule` | Wanneer een tour vanzelf mag starten: pas N dagen na de eerste login, en alleen tussen twee datums (in de tijdzone van de gebruiker) |
| `UserMenuEntry` (listener) | **Tours** in het gebruikersmenu, boven **Help**, naar de persoonlijke instellingen; alleen als tours aan staan en `user_menu` niet `'false'` is |
| `TourStats`, `TourStatistics` | Hoe ver mensen komen: de waarde per gebruiker, de totalen per stap, en de cijfers van één tour voor het paneel Statistics (alleen totalen, niets naar telemetrie) |
| `TourPackage`, `TourTransfer` | Een hele tour als één `.zip`: schrijven, een pakket van buiten streng inlezen (alleen `tour.json` en `media/<id>.<ext>`, grenzen op aantal en grootte), en exporteren/importeren met nieuwe kopieën van de media |
| `Checklist`, `ChecklistService`, `ChecklistWidget` | "Getting started" op het Dashboard (API-v2-widget, alleen zolang `checklist_enabled` aan staat): de gekozen taken, en per gebruiker welke gedaan zijn, afgeleid van wat de gebruiker deed (welkomsttour afgerond, een upload met `upload_time`, een eigen profielfoto, een client in `authtoken`, een eigen chatbericht in Talk, een tweede factor), plus eigen taken van de beheerder (`checklist_custom`): een pagina van deze Nextcloud, afgevinkt zodra hij vanuit de lijst geopend is (`checklist_<id>`). "Put it on every Dashboard" zet de widget in de standaardindeling (`dashboard`/`layout`) |
| `TourAssistant`, `TourPrompts` | Assistant-taken (`core:text2text`) voor een tour: wat het taalmodel gevraagd wordt (alleen ids, titels, teksten en beschrijvingen van afbeeldingen), en het antwoord streng lezen: alleen een JSON-array van stappen telt, gelezen tegen de stappen zoals ze dan zijn, en door `StepValidator` |
| `StepValidator` | Controleert stappen (velden, types, groottes) bij opslaan en importeren |
| `MediaService` | Slaat media van stappen op, controleert en serveert ze |
| `TelemetryService` | Aggregeert anonieme gebruiks-stats van de welkomsttour; verzendt naar `licenses.voxcloud.nl` |
| `LicenseService` | Valideert subscription-keys, HTTP-response-validatie |

### Repair-steps

| Stap | Doel |
|---|---|
| `IntroduceTours` | Zet eenmalig `tours_disabled` op `'true'` voor gebruikers die de tour bewust hadden uitgezet (regel in `TourOptOut`), daarna de vlag `tours_introduced` |
| `RemoveStaleDefaultWizardSteps`, `UnescapeLegacyWizardStepHtml` | Opruimwerk uit eerdere versies |

### Background-jobs

| Job | Cadans | Doel |
|---|---|---|
| `TelemetryJob` | Dagelijks | Verzendt geaggregeerde stats naar licentie-server |
| `LicenseUsageJob` | Dagelijks (met stabiele jitter) | Synct licentie-staat en stap-limieten |

### Settings-integratie

- `AdminSettings` — Nextcloud-admin-instellingen-pagina
- `PersonalSettings` — per-gebruiker-instellingen-pagina
- `AdminSection` / `HelpSection` — sidebar-navigatie (beheer / persoonlijk)

### Event-listeners

- `LoadScripts` — laadt op elke pagina de kleine bootstrap `js/main.js` en levert de lazy initial state `introvox/runtime`: of tours aan staan, de eigen schakelaar van de gebruiker, de staat van de welkomsttour, en de tours voor apps die voor deze gebruiker vanzelf zouden starten (alleen id, pagina en versie). De bootstrap beslist daarmee of er een tour draait, en laadt pas dan de tour-code.

## Opslag-conventies

- **Globale config**: `oc_appconfig` (`wizard_enabled` = **Tours for everyone**, `wizard_version`, `wizard_steps_<lang>` voor de welkomsttour, `tours`, `tour_steps_<id>_<lang>`, `tours_introduced`, `checklist_enabled`, `checklist_tasks`, `checklist_custom`)
- **Per-gebruiker**: `oc_preferences` (`introvox/wizard_disabled`, `tours_disabled`, `tour_<id>_seen`, `tour_<id>_completed`, `tour_<id>_skipped`, telemetrie-timestamps `wizard_started`, `wizard_completed`, `wizard_skipped`, `checklist_uploaded`, `checklist_<id>`)
- Media en back-ups van verwijderde tours in de app-data-map
- Geen custom database-tabellen

## Veiligheids-patronen

- CSRF-bescherming op elke route, ook `GET`, behalve `GET /media/{file}` (een `<img>` kan geen token meesturen; die route leest alleen en vraagt strict cookies) en `GET /tour/{id}` (een deellink uit een mail; stuurt alleen door)
- Defensieve `IGroupManager::isAdmin()`-checks naast annotation-based authorization
- `StepValidator` op stappen bij opslaan/importeren; HTML in de stap-tekst wordt opgeschoond waar hij getoond wordt (`src/utils/stepHtml.js`)
- Server-side groep-filtering — verborgen stappen verlaten nooit de server; bij een tour voor een app ook per tour
- Eén 404 voor alles wat geweigerd wordt bij tours voor apps en media
- Defensieve `is_array()`-guard tegen corrupte appconfig-blobs (v1.4.3+)

## Voor de complete referentie

Zie [backend-architecture.md](backend-architecture.md) voor:

- Per-controller-method-details
- Service-methode-details en HTTP-call-patterns
- Background-job-scheduling en jitter-strategie
- Authorization-pipeline (annotations + defensive checks)
- Alle opslag-keys met hun types

## Zie ook

- [Architectuur-overzicht](overview.md) — systeem-design
- [Frontend-architectuur](frontend-architecture.md) — Vue-client
- [API-referentie](api-reference.md) — REST-endpoints
- [Transifex-integratie](transifex-integration.md) — l10n-workflow
