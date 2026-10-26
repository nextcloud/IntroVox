# Geleide tours

De tour-engine van IntroVox is gebouwd op [Shepherd.js](https://shepherdjs.dev/), gewrapped in een Vue-3-frontend. Dit document beschrijft hoe een tour gekozen en gestart wordt, hoe stappen worden gerenderd, welke types er zijn en in welke volgorde ze komen.

## Tour-levenscyclus

1. **Bootstrap** — elke Nextcloud-pagina laadt `main.js`, een kleine bootstrap (ongeveer 20 KB). Die leest de initial state `introvox/runtime` die de listener `LoadScripts` aan de pagina meegeeft, plus de opslag van de browser, en beslist met `src/runtime/chooseTour.mjs` of er op deze pagina een tour start, en welke (zie [Welke tour start](#welke-tour-start)). Daar is geen request voor nodig. Op een pagina zonder tour laadt er verder niets
2. **Tour-code** — pas als er een tour start, laadt de bootstrap het tour-chunk (`src/runtime/tour.js`: WizardManager, Shepherd.js, Vue en `css/wizard.css`)
3. **Stappen** — WizardManager haalt de stappen op voor de taal en de groepen van de gebruiker: `GET /apps/introvox/api/steps` voor de welkomsttour, `GET /apps/introvox/api/steps?tour=<id>` voor een andere tour
4. **Readiness-check** — wacht op de header en het app-menu van Nextcloud: de apps-"wafel" op Nextcloud 34+, de inline app-balk op oudere versies (10-seconden-timeout), en dan nog 0,3 seconde. Intussen laden de stappen. Gaat de eerste-start-wizard van Nextcloud open, dan wacht de tour tot die dicht is. Een tour voor een app wacht ook op de app zelf: het element van de eerste stap of de inhoud van de app, geen dialoog van de app open, en het tabblad in beeld (15-seconden-timeout). Daarna wacht elke tour tot er geen dialoog open is en het tabblad in beeld is (hoogstens 15 seconden)
5. **Start** — maakt een Shepherd-`Tour` met de stappen en toont de eerste. Een tour voor een app meldt eerst aan de server dat hij start; de server antwoordt of dit de eerste start bij deze versie is, en alleen dan verschijnt hij (of als hij met de hand gestart is), zodat twee open tabbladen hem nooit allebei draaien
6. **Gebruikers-navigatie** — de knoppen Volgende/Terug/Sluiten/Klaar, de pijltjestoetsen, of de eigen manier van de stap om verder te gaan (zie [Hoe een stap verdergaat](#hoe-een-stap-verdergaat)). In een run die vanzelf startte, wordt elke stap die verder is dan de run eerder kwam gemeld voor **Hoe ver mensen komen**
7. **Voltooiing** — de welkomsttour zet localStorage en (bij Klaar/Overslaan) de markering dat hij klaar is (`wizard_disabled`); een andere tour meldt `complete` of `skip`. Een tour die naar andere apps ging, keert daarna terug naar de ingestelde startpagina (zie [Tours over meerdere apps](#tours-over-meerdere-apps))

## Stap-types

### Gecentreerde stappen

- `attachTo: ""` (leeg)
- Verschijnen als gecentreerde modal in het midden van het scherm
- Gebruikt voor welkom, overgangen en afsluit-berichten

### Gekoppelde stappen

- `attachTo: "<css-selector>"` met `position` ingesteld op `right`, `left`, `top` of `bottom`
- Het doel-element krijgt een omlijning in de kleur van het thema, en een knipperende pijl wijst vanaf de stap naar het element, ook in dialogen. Beide staan stil voor wie liever minder beweging ziet
- De stap-tooltip wordt naast het element geplaatst

### Stappen die op hun element wachten

Staat het element van een gekoppelde stap niet op de pagina als de stap verschijnt, dan wacht de stap erop. Hij staat opzij in de hoek rechtsonder met zijn tekst, of linksonder zolang er een dialoog open is, uit de buurt van de knoppen van die dialoog en smal genoeg om naast de dialoog te blijven. De donkere laag van de tour verdwijnt, zodat de pagina bruikbaar blijft. Zodra het element verschijnt, hoe lang de gebruiker er ook over doet, gaat de stap ernaartoe. **Volgende** gaat ook zonder het element verder. Een stap pakt nooit de focus van een veld waarin de gebruiker typt.

Zo kan een tour iemand door zijn eigen werk leiden: de stap over de deelnemers van een nieuw gesprek wacht tot de gebruiker het gesprek heeft gemaakt. Zie [Stappen die op de gebruiker wachten](../admin/managing-steps.nl.md#stappen-die-op-de-gebruiker-wachten).

Oudere versies sloegen zo'n stap over (vóór 1.4.1) of toonden hem in het midden.

### Stappen in een menu

Een stap met **Eerst openen** (Open first) klikt eerst op die knop (meestal een menuknop), zodat een doel in het menu bestaat, en sluit het menu daarna weer. Het gemarkeerde item is tijdens de stap niet klikbaar, zodat het menu blijft staan.

Zolang een stap iets in een menu aanwijst, houdt de tour dat menu open. Het apps-menu van Nextcloud 35 sluit anders 180 ms nadat de muis het menu of de knop verlaat, en dat gebeurde zodra de gebruiker de muis naar het tour-venster bewoog.

### Hoe een stap verdergaat

**Doorgaan met** (Continue with) in de stappen-editor zet de `advance` van de stap:

| `advance` | Doorgaan met | Wat de gebruiker doet |
|---|---|---|
| `button` (standaard) | **Volgende knop** | Klikt op **Volgende** |
| `click` | **Klikken op het element** | Klikt op het element van de stap. De stap zegt "Klik op het gemarkeerde element om verder te gaan." en heeft geen knop Volgende zolang het element er is |
| `input` | **Het veld invullen** | Typt in het veld dat de stap aanwijst. **Volgende** blijft uit tot het veld tekst heeft; de stap zegt "Vul het gemarkeerde veld in om verder te gaan." |

Bij `click` doet de klik eerst zijn eigen werk: een menu of dialoog opent en de volgende stap volgt; een link naar een andere app laadt die app en de tour gaat daar verder bij de volgende stap (zie [Tours over meerdere apps](#tours-over-meerdere-apps)). Bij de laatste stap rondt de klik de tour af. Ontbreekt het element, of verdwijnt het zonder de klik (de dialoog ging dicht met ✕ of Escape), dan krijgt de stap een knop Volgende en wacht hij opzij.

Bij `input` kijkt een stap op een blok rond een veld naar het veld daarin. Zonder veld, of zodra het veld weg is, werkt Volgende zoals gewoonlijk.

## Tours over meerdere apps

Een stap met een **pagina** (bijvoorbeeld `/apps/spreed/` voor Talk) hoort bij die app. Komt de tour er op een andere pagina aan, dan opent hij die app en gaat daar verder:

- **Navigatie** — vóór de stap bewaart de tour zijn voortgang in `sessionStorage` (per browsertabblad, 10 minuten geldig) en laadt de app. De nieuwe pagina pakt de tour op bij die stap, in dezelfde richting (Volgende of Terug).
- **Wachten op het doel** — apps als Talk renderen na het laden van de pagina, dus de eerste stap op een pagina wacht tot 5 seconden op zijn element voordat hij verschijnt. Binnen een pagina wacht een stap 1 seconde na een klik (op het menu of de dialoog die opengaat) en 0,4 seconde na **Volgende** of **Terug**. Is het element er dan nog niet, dan wacht de stap er opzij op (zie [Stappen die op hun element wachten](#stappen-die-op-hun-element-wachten)).
- **Herladen** — herladen, of een formulier dat de pagina herlaadt, houdt de tour bij zijn stap op die pagina (10 minuten, zoals hierboven).
- **Onbereikbare apps** — komt de gebruiker ergens anders uit (de app staat niet voor hem aan en Nextcloud stuurt door), dan wordt de stap overgeslagen, nooit opnieuw geprobeerd.
- **Routes van Talk en Files** — een geopend Talk-gesprek (`/call/…`) telt als Talk, een bestandslink (`/f/…`) als Files.
- **Stappen zonder pagina** verschijnen waar de tour op dat moment is. Geef een stap een pagina om de tour terug te brengen naar bijvoorbeeld het dashboard.
- **Einde van de tour** — bij **Klaar** gaat een tour die niet meer op zijn beginpagina is naar de ingestelde startpagina (de standaard-app waar `/` naartoe stuurt), nadat de voltooiing is vastgelegd. Sluiten met **✕** laat de gebruiker waar hij is.
- **Telemetrie** — een tour over meerdere pagina's telt nog steeds als één start.

## Stap-filtering

Stappen worden server-side gefilterd voor ze de frontend bereiken:

1. **Aan-check** — voor de welkomsttour: staat **Tours for everyone** (`wizard_enabled`) of de welkomsttour zelf uit, dan geeft de API een lege stap-lijst terug. Voor een andere tour krijgt iedereen die hem niet mag krijgen (tours of de tour staan uit, de tour bestaat niet, hij zit niet in de groepen of kan de app niet openen) een 404, in elk van die gevallen hetzelfde antwoord
2. **Taal** — `IFactory::findLanguage(null)` bepaalt de taal van de gebruiker. De welkomsttour geeft de override van de beheerder voor de volledige taal van de gebruiker, anders voor de basistaal (`wizard_steps_pt_BR`, dan `wizard_steps_pt`; een beheerder maakt overrides per basistaal, dus een override voor `pt` bedient ook `pt_BR`). Zonder override geeft hij de op Transifex vertaalde standaardstappen in de volledige taal, anders de basistaal, anders Engels. Zie [Meertaligheid](multi-language.nl.md#terugvaltabel). Een andere tour geeft de stappen van de taal van de gebruiker, anders van de basistaal, anders van de hoofdtaal van de tour; een ingebouwde tour zonder eigen stappen van de beheerder geeft zijn vertaalde standaardstappen
3. **Groep-check** — stappen met niet-lege `visibleToGroups` moeten overlappen met de groepen van de gebruiker (via `IGroupManager::getUserGroupIds()`)

Uitgeschakelde stappen (`enabled: false`) worden ook uitgefilterd voor ze naar de frontend gaan.

Zie [API-referentie](../architecture/api-reference.nl.md) voor het request-/response-formaat.

## Welke tour start

De bootstrap vraagt het aan `chooseTour()`; de eerste regel die geldt, beslist:

1. In de element-kiezer van de beheerder, of in een same-origin-frame van iemand anders: geen tour
2. Een deellink (**Link kopiëren**) start zijn tour op de pagina die hij opende
3. Een tour die bezig is (een stap opende een andere pagina, of de pagina waar hij was werd herladen) gaat verder; een start met de hand vanuit de persoonlijke instellingen start die tour
4. Op de beheerpagina van IntroVox zelf: geen tour (daar loopt de beheerderstour)
5. **Tours for everyone** uit (`wizard_enabled`), of **Start tours by themselves** uit voor deze gebruiker (`tours_disabled`): geen tour
6. De welkomsttour gaat voor, op welke pagina de gebruiker ook opent: tenzij hij uit staat, of de gebruiker hem afmaakte of oversloeg (`wizard_disabled`), start hij als deze browser hem niet als voltooid heeft gemarkeerd, of gemarkeerd bij een andere `wizard_version` (die **Show again to everyone** ophoogt)
7. Er eindigde minder dan 2 minuten geleden een tour in dit tabblad: geen tour, zodat er nooit twee tours vlak na elkaar lopen
8. De eerste tour voor een app of pagina die op deze pagina aan de beurt is; een tour die overal start, is op elke pagina aan de beurt. Aan de beurt betekent: de gebruiker mag hem krijgen, heeft deze versie nog niet gezien (`tour_<id>_seen`), past bij **Who gets it**, en het is zijn tijd (dagen na de eerste login, datums)

Een start met de hand en een deellink werken ook als **Start tours by themselves** uit staat en buiten de datums van een tour; de server controleert wel of de gebruiker de tour mag krijgen. Zie [Tours](../admin/tours.nl.md#wanneer-een-tour-start) en [Frontend-architectuur](../architecture/frontend-architecture.nl.md#tour-runtime).

## Telemetrie-events

De frontend meldt deze events:

| Event | Endpoint | Wanneer |
|---|---|---|
| Welkomsttour `start` | `POST /apps/introvox/api/wizard/start` | De welkomsttour begint voor een gebruiker |
| Welkomsttour `complete` | `POST /apps/introvox/api/wizard/complete` | Gebruiker klikt op **Klaar** in de laatste stap, of op het element van een laatste stap die verdergaat met een klik |
| Welkomsttour `skip` | `POST /apps/introvox/api/wizard/skip` | Gebruiker klikt op **Overslaan en niet meer tonen** |
| Andere tours | `POST /apps/introvox/api/tours/{id}/event` met `start`, `complete` of `skip` | Op dezelfde momenten; `start` markeert de tour ook als gezien |
| Stap bereikt | `POST /apps/introvox/api/tours/{id}/reached` | Een stap die verder is dan de run eerder kwam, voor elke tour, in een run die vanzelf startte |

De server bewaart per gebruiker een tijdstip (`wizard_started`, `wizard_completed`, `wizard_skipped`; `tour_<id>_completed`, `tour_<id>_skipped`) en hoe ver hun laatste run kwam (`tour_<id>_reached`). Het paneel **Statistieken** toont dat als totalen per tour, en telt mensen, geen klikken. Een start met de hand en een voorbeeld tellen niet mee voor **Hoe ver mensen komen**.

Zie [Backend-architectuur](../architecture/backend-architecture.nl.md) voor telemetrie-service-details, en [Telemetrie](../admin/telemetry.nl.md) voor wat de anonieme gebruiksstatistieken versturen.

## Theming

De tour erft Nextcloud's CSS-variabelen, zodat light-/dark-/hoog-contrast-modi automatisch werken. Zie [Thema-ondersteuning](theme-support.nl.md).

## Sluit-gedrag

| Actie | localStorage | Server-voorkeur | Start hij weer vanzelf? |
|---|---|---|---|
| **✕ Sluiten** of Esc | `introvox_completed`: `true` | ongewijzigd | Niet in deze browser; in een andere browser wel |
| **Klaar** | `introvox_completed`: `true` | `wizard_disabled: true` | Nee, tot **Show again to everyone** |
| **Overslaan en niet meer tonen** | `introvox_completed`: `true` | `wizard_disabled: true` | Nee, tot **Show again to everyone** |

Dit is de welkomsttour. Een tour voor een app telt als gezien zodra hij start, dus hij start niet meer vanzelf, hoe hij ook eindigt; de eerste stap heeft daar **Overslaan** in plaats van **Overslaan en niet meer tonen**.

## Customization-oppervlak

Beheerders kunnen per stap configureren:

- Stap-titel (platte tekst + emoji)
- Stap-content (HTML: opgeslagen zoals geschreven, en in de browser opgeschoond met DOMPurify overal waar hij getoond wordt; zie [HTML in stap-content](customization.nl.md#html-in-stap-content))
- Een afbeelding, GIF of video boven de tekst, met een beschrijving en ondertitels
- CSS-selector voor element-markering, gekozen met **Element kiezen**
- Een menuknop om eerst te openen, voor elementen in een menu
- De pagina (app) waar een stap bij hoort
- Positie t.o.v. het gemarkeerde element
- Hoe hij verdergaat: **Volgende knop**, **Klikken op het element** of **Het veld invullen**
- In-/uitschakelen per stap
- Groep-zichtbaarheid per stap (v1.2.0+)
- Stap-volgorde, door te slepen of met de knoppen **Stap omhoog verplaatsen** en **Stap omlaag verplaatsen**

En per tour: waar hij start (een app, een pagina of overal), zijn naam en hoofdtaal, zijn groepen, **Who gets it**, en wanneer hij vanzelf start (dagen na de eerste login, datums).

Zie [Customization](customization.nl.md) en [Tourstappen beheren](../admin/managing-steps.nl.md).

## Zie ook

- [Customization](customization.nl.md) — HTML, CSS-selectors, positionering
- [Stap-zichtbaarheid](step-visibility.nl.md) — groep-filters en gebruikers-voorkeuren
- [Meertaligheid](multi-language.nl.md) — per-taal stap-content
- [Tours](../admin/tours.nl.md) — voorbeeld, [deellinks](../admin/tours.nl.md#een-tour-delen-met-een-link), [statistieken](../admin/tours.nl.md#statistieken), [export en import](../admin/tours.nl.md#een-tour-naar-een-andere-nextcloud-verhuizen) en [AI](../admin/tours.nl.md#stappen-schrijven-of-vertalen-met-ai)
- [Thema-ondersteuning](theme-support.nl.md) — light-/dark-/hoog-contrast
- [Architectuur-overzicht](../architecture/overview.nl.md) — systeem-design
