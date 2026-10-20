# Frontend-architectuur

De frontend van IntroVox is een Vue-3-single-page-app gebundeld met webpack, geïntegreerd in Nextcloud als drie entry-points: de tour-runtime, de admin-instellingen-pagina en de persoonlijke-instellingen-pagina.

## Entry-points

| Entry | Output-bundle | Geladen op |
|---|---|---|
| `src/main.js` | `js/main.js` | Elke Nextcloud-pagina (via `LoadScripts`-listener) |
| `src/admin.js` | `js/admin.js` | Admin-instellingen → IntroVox |
| `src/personal.js` | `js/personal.js` | Persoonlijke instellingen → IntroVox |

`main.js` is een kleine bootstrap, omdat elke ingelogde pagina hem laadt. De tour-code zelf (WizardManager, Shepherd.js, Vue en `css/wizard.css`) is een eigen chunk, `src/runtime/tour.js` → `js/tour.<hash>.js` plus gedeelde vendor-chunks, die met een dynamische `import()` alleen geladen wordt op een pagina waar een tour draait. Chunk-namen hebben een content-hash (`chunkFilename: '[name].[contenthash:8].js'`), omdat chunks zonder Nextclouds `?v=`-parameter laden. De bootstrap zet `__webpack_nonce__` op het request-token in base64, zodat Nextclouds CSP de script-tag van de chunk toelaat. Zie [Tour-runtime](#tour-runtime).

## Component-boom

```
Elke pagina (src/main.js, de bootstrap)
└── chooseTour()               ← src/runtime/chooseTour.mjs: welke tour, als er een is
    └── tour-chunk (src/runtime/tour.js, alleen geladen als er een tour draait)
        └── WizardManager.vue  ← Shepherd.js-tour-levenscyclus, welkomsttour en tours voor apps
            ├── (Shepherd-managed step-DOM, geen Vue-componenten)
            └── PWA-installatie-instructies (~50 strings, v1.6.0+)

Admin-instellingen-pagina (src/admin.js)
└── AdminApp.vue               ← de rij panelen, de lijst met tours, een tour openen, de beheerderstour
    ├── SettingsPane.vue       ← Tours for everyone, Show Tours in the user menu
    │   └── ChecklistSettings.vue  ← de checklist op het Dashboard: aan/uit, de taken, eigen taken, op elk Dashboard
    │       └── ChecklistTaskDialog.vue ← "New task" / "Edit task": titel, korte tekst, pagina
    ├── Paneel Tours
    │   ├── ToursList.vue      ← de tours: schakelaar, Edit steps, ⋯ (Preview, Copy link, Export tour, Show again to everyone, Delete), New tour, Import tour
    │   │   (de acties: useTours.js)
    │   ├── NewTourDialog.vue  ← "New tour" en "Tour settings"
    │   └── TourEditor.vue     ← de stappen van één tour: talen, CRUD + drag-drop, reset/import/export per taal
    │       ├── AssistantDialog.vue ← "Translate with AI" / "Write steps with AI" (de taken: useAssistant.js)
    │       ├── StepWizard.vue     ← dialoog "New step" / "Edit step"
    │       │   └── ElementPicker.vue  ← "Pick element" (src/picker/)
    │       └── TourPreview.vue    ← "Preview tour" / "Test this step" (src/preview/)
    │           beide in NextcloudFrame.vue (src/frame/): Nextcloud in een iframe
    ├── StatisticsPane.vue     ← TourStatistics.vue (één tour: gestart, afgerond, overgeslagen, hoe ver mensen komen), instance-informatie, telemetrie (TelemetryLists.vue)
    ├── SupportSettings.vue    ← het paneel Support (src/components/)
    └── TelemetryQuestion.vue  ← de vraag na de beheerderstour (TelemetryLists.vue, telemetry.js)

Persoonlijke-instellingen-pagina (src/personal.js)
└── PersonalApp.vue            ← Start tours by themselves, Restart tour now, de lijst Tours met Start
```

In `AdminApp.vue` heet het paneel Tours intern nog `steps`. `TourEditor` werkt op één tour (AdminApp maakt er één per geopende tour, met het id als key) en geeft het id daarvan als `tour` mee aan elke aanroep voor stappen, overrides, import en export. AdminApp mag twee functies ervan aanroepen: `addStep()`, voor de eerste stap van een nieuwe tour, en `ready()`, waar de beheerderstour op wacht voordat hij naar de editor wijst.

### Picker en voorbeeld

Beide tonen een live Nextcloud-pagina in een iframe van dezelfde origin, zodat de admin-pagina de DOM ervan direct kan lezen en aansturen. De naam van het frame (`src/frame/frameNames.js`) vertelt `main.js` in het frame waarvoor het dient: in de picker start geen tour, in het voorbeeld wacht `WizardManager` in voorbeeldmodus op stappen van de admin-pagina (`window.introVoxPreview.run()`) en registreert niets (geen telemetrie, geen voltooiing, geen localStorage). De selector-logica van de picker staat in `src/picker/selector.mjs`, getest in `tests-js/picker-selector.test.js`.

## Tour-runtime

### `src/main.js` (de bootstrap)

Bij `DOMContentLoaded` doet elke pagina dit:

1. Bepaalt in wat voor frame hij zit (`frameKind()`): een eigen pagina, de element-picker van de beheerder, het voorbeeld van de beheerder, of een same-origin-frame van iemand anders. De frame-namen tellen alleen binnen een same-origin-parent, zodat een andere website geen tabblad met zo'n naam kan openen om de tour tegen te houden. In het voorbeeld-frame zet hij `window.introVoxPreview` klaar en stopt.
2. Definieert `window.introVox` met `start()` (laadt de chunk en start de welkomsttour met de hand), `reset()` (wist de localStorage-markeringen van de welkomsttour) en `isCompleted()`. WizardManager vervangt dit door zijn eigen versie zodra hij draait.
3. Haalt het `?introvox-tour=<id>` van een deellink uit het adres (`history.replaceState()`), en houdt het alleen als het een tour-id is; heeft een app het adres al veranderd (Deck gaat naar Upcoming cards), dan gebruikt hij de `link` die de server bij de pagina las. Net zo `?introvox-check=<id>`, een eigen taak van de checklist op het Dashboard die vanuit de lijst geopend is: een eigen chunk (`src/runtime/checklist.js`) meldt die.
4. Roept `chooseTour()` aan met wat de pagina al heeft: de lazy initial state `introvox/runtime` van `LoadScripts` (zie [Backend Architecture](backend-architecture.md#loadscripts)), de link, sessionStorage, localStorage en het pad. Daar is geen request voor nodig.
5. Haalt een start-verzoek weg zodra het gebruikt is, en laadt de tour-chunk alleen als er een tour gekozen is.

### `src/runtime/chooseTour.mjs`

Gewone data erin, gewone data eruit, getest zonder browser (`tests-js/choose-tour.test.js`). De regels, op volgorde; de eerste die geldt, beslist:

1. In de element-picker of een same-origin-frame van iemand anders: geen tour
2. Een deellink start zijn tour op de pagina die hij opende (niet op de beheerpagina van IntroVox), ook boven een tour die bezig was: wie een link volgt, vraagt om die tour, en wie midden in een tour een pagina verlaat (door de link te typen bijvoorbeeld) laat een resume-entry achter, die de bootstrap dan wist
3. Een tour die bezig is (een resume-entry, jonger dan 10 minuten) gaat verder op de pagina die zijn volgende stap opende; anders een start-verzoek uit de persoonlijke instellingen (jonger dan 2 minuten): de welkomsttour op de eerstvolgende pagina, een tour voor een app op zijn eigen pagina. Een link en een start met de hand werken ook als **Start tours by themselves** uit staat en buiten de datums van een tour; de server controleert nog steeds of de gebruiker de tour mag krijgen
4. Op de eigen beheerpagina van IntroVox: geen tour (daar draait de beheerderstour)
5. Geen runtime-state op de pagina: de tour-code vraagt het de server, zoals vóór deze state bestond
6. **Tours for everyone** uit, of **Start tours by themselves** uit: geen tour
7. De welkomsttour gaat voor: tenzij hij in de lijst met tours uit staat of klaar is voor deze gebruiker (`wizard_disabled`), draait hij als deze browser hem niet als voltooid heeft gemarkeerd, of bij een andere `wizard_version` dan die van de server
8. Er is minder dan 2 minuten geleden een tour geëindigd in dit tabblad: geen tour, zodat er nooit twee tours vlak na elkaar draaien
9. De eerste tour voor een app of pagina die hier aan de beurt is; een tour die overal start is op elke pagina aan de beurt. "Aan de beurt" bepaalt de server (`TourStateService::due()`): beschikbaar, niet gezien bij deze versie, het publiek, en zijn tijd (`TourSchedule`)

Browser-opslag die hij leest:

| Key | Opslag | Betekenis |
|---|---|---|
| `introvox_completed`, `introvox_version` | localStorage | De welkomsttour is in deze browser afgerond, gesloten of overgeslagen, bij die `wizard_version` |
| `introvox_tour_resume` | sessionStorage | Een tour die bezig is en naar een andere pagina ging (`{ tourId, stepId, at }`) |
| `introvox_start_tour` | sessionStorage | Een start met de hand uit de persoonlijke instellingen (`{ tourId, page, at }`; de welkomsttour heeft geen pagina) |
| `introvox_tour_ended` | sessionStorage | Wanneer er in dit tabblad voor het laatst een tour eindigde |
| `introvox_preview_resume` | sessionStorage | De eigen resume-entry van het voorbeeld van de beheerder |

### `src/runtime/tour.js`

De ingang van de chunk: mount `WizardManager` met de keuze van de bootstrap (`startTour()`), voor een start met de hand (`startManually()`) of in voorbeeldmodus (`mountPreview()`). Hij importeert ook de CSS van Shepherd en `css/wizard.css`, zodat die met de chunk mee laden.

## Kern-bestanden

### `src/components/WizardManager.vue`

Beheert de Shepherd.js-tour:

1. Krijgt de keuze van de bootstrap als prop `start`: welke tour, en of hij verdergaat of met de hand gestart is
2. **Welkomsttour:** laadt `GET /api/steps`, hangt gedrag aan de client-kant weer aan de stappen op id (`enrichSteps()`), en start zodra het app-menu klaar is
3. **Tour voor een app of pagina:** laadt `GET /api/steps?tour=<id>` (een 404 of geen stappen: er start niets), wacht tot de app klaar is (het element van de eerste stap of de inhoud van de app, geen dialoog van de app open, het tabblad in beeld; hoogstens 15 seconden), en stuurt dan `POST /api/tours/{id}/event` met `start`. Hij toont de tour alleen als dit de eerste start bij deze versie was, of als de tour met de hand gestart is. De knop in de eerste stap is **Skip** in plaats van **Skip and don't show again**
4. Instantiëert `new Shepherd.Tour({...})` en registreert Next/Back/Done/Skip-handlers
5. Welkomsttour: vuurt telemetrie-events via `axios.post('/api/wizard/...')`, updatet localStorage bij close/complete/skip, en roept `POST /personal/settings` aan met `wizardDisabled: true` bij Skip en Done
6. Tour voor een app: stuurt `complete` of `skip` naar `POST /api/tours/{id}/event`; niets in localStorage
7. Elke tour, tijdens een run die vanzelf startte: elke stap verder dan deze run al kwam, gaat naar `POST /api/tours/{id}/reached` (id van de stap en plek in de run), voor **How far people get**. Een start met de hand (`window.introVox.start()`, **Start** in de persoonlijke instellingen) en een voorbeeld tellen nooit; een app-tour telt alleen als zijn `start` de eerste was. Of een run telt, gaat mee in de resume-entry als de tour van pagina wisselt

### `src/components/wizardSteps.js`

Definities aan de client-kant van de ingebouwde stappen van de welkomsttour, gewrapped in `t('introvox', ...)`, met wat de server niet kan opslaan: lazy `attachTo`, menu's die eerst open moeten, `beforeShowPromise`. Gebruikt:

- Door `enrichSteps()`, die dat gedrag op id weer aanhangt aan de stappen die `GET /api/steps` teruggeeft
- Als volledige terugval (`getWizardSteps()`) als de server geen stappen stuurt of niet bereikbaar is

Tours voor een app of pagina gebruiken het niet.

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

- **Of er een tour draait** — per paginalading beslist door `chooseTour()` uit de initial state `introvox/runtime` en browser-opslag, voordat er tour-code laadt
- **Stap-lijst** — eenmalig per pagina geladen via `GET /api/steps` (met `?tour=<id>` voor een tour voor een app), gehouden in de reactive state van `WizardManager.vue`
- **Admin-tours** — `GET /admin/tours` in `useTours.js`, gebruikt door `AdminApp.vue`; aan/uit, opnieuw tonen, verwijderen, exporteren en importeren gaan naar `/admin/tours/…`
- **Admin-stap-bewerking** — lokale component-state in `TourEditor.vue`, voor de tour die daarin open is; elke wijziging (opslaan in de editor, verwijderen, herordenen, aan/uit) wordt direct via `POST /admin/steps` met het id van die tour opgeslagen, na elkaar in een wachtrij zodat snelle wijzigingen nooit in de verkeerde volgorde aankomen
- **Gebruikers-voltooiings-staat** — welkomsttour: browser-localStorage plus de server-voorkeur `wizard_disabled`; tours voor een app: alleen op de server (`tour_<id>_seen`, `_completed`, `_skipped`); hoe ver een tour kwam: `tour_<id>_reached`; **Start tours by themselves**: de server-voorkeur `tours_disabled`
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
