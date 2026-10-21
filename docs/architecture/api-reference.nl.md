# API-referentie

> **Let op:** de complete API-referentie wordt onderhouden in het Engels. Voor de actuele endpoint-specificatie, request-/response-schema's en code-voorbeelden, raadpleeg de [Engelse API-referentie](api-reference.md).

## Inleiding

IntroVox biedt een REST-API voor:

- De stappen van een tour ophalen (gefilterd op taal + groepen): de welkomsttour, of met `?tour=<id>` een tour voor een app of pagina
- Tour-start-/voltooiings-/skip-events vastleggen: voor de welkomsttour als telemetrie, voor een tour voor een app per gebruiker (`tour_<id>_seen`, `_completed`, `_skipped`)
- Tours beheren (admin): lijst, aanmaken, wijzigen, aan/uit, verwijderen, opnieuw tonen, statistieken per tour, een hele tour exporteren en importeren
- Bijhouden hoe ver gebruikers in een tour komen (`tour_<id>_reached`), alleen bij een run die vanzelf startte
- Admin-CRUD op stappen, talen en globale instellingen, per tour
- De per-gebruiker-voorkeuren `wizard_disabled` (welkomsttour klaar) en `tours_disabled` (**Start tours by themselves** uit) beheren, en de tours voor apps die een gebruiker kan krijgen opvragen
- Afbeeldingen, video's en ondertitels in stappen uploaden en tonen
- Een optionele abonnementssleutel valideren (beperkt niets)

## Authenticatie

Endpoints vereisen een actieve Nextcloud-sessie of een app-wachtwoord; geen enkele route is zonder inloggen bereikbaar. Admin-endpoints checken aanvullend `IGroupManager::isAdmin()`.

Alle endpoints vereisen een geldig CSRF-token, ook `GET`-verzoeken, op twee na. `GET /media/{file}`, omdat een `<img>` of `<video>` geen token kan meesturen: die route leest alleen, vraagt een ingelogde gebruiker met strict cookies, en geeft op alles wat hij weigert dezelfde 404. `GET /tour/{id}`, een deellink uit een mail, die ook geen token kan meesturen: die vraagt een ingelogde gebruiker, verandert niets en stuurt alleen door naar de pagina van de tour. Gebruik in de frontend `@nextcloud/axios`, dat het token automatisch meestuurt. `tests-js/controller-security.test.js` laat de build falen als een route `#[PublicPage]` krijgt, als een andere route dan die twee `#[NoCSRFRequired]` krijgt, of als de frontend de API met `fetch()` aanroept.

Alles wat geweigerd wordt bij de stappen of events van een tour voor een app (onbekende tour, tour uit, gebruiker niet in de groepen of zonder toegang tot de app) krijgt dezelfde `404 { "success": false }`, zodat het antwoord niets verraadt over welke tours er zijn. `POST /api/tours/{id}/event` heeft een limiet van 30 verzoeken per uur per gebruiker, `POST /api/tours/{id}/reached` (ook voor de welkomsttour) 300.

## Endpoint-categorieën

| Categorie | Doel |
|---|---|
| **Stappen** | `GET /api/steps` (gefilterd; `?tour=<id>` voor een tour voor een app), `GET /admin/steps` (admin) |
| **Tracking** | `/api/wizard/start`, `/complete`, `/skip` voor de welkomsttour; `POST /api/tours/{id}/event` (`start`, `complete`, `skip`) voor een tour voor een app; `POST /api/tours/{id}/reached` (verste stap) voor elke tour |
| **Checklist** | `POST /api/checklist/{id}`: een eigen taak van de checklist op het Dashboard is vanuit de lijst geopend (de pagina draagt `?introvox-check=<id>`) |
| **Deellink** | `GET /tour/{id}` (wat **Copy link** geeft): eerst inloggen als dat nodig is, dan door naar de pagina van de tour met `?introvox-tour=<id>`, dat die tour daar start, als een start met de hand; alleen voor wie de tour mag krijgen |
| **Tours (admin)** | `GET`/`POST /admin/tours`, `PUT`/`DELETE /admin/tours/{id}`, `POST /admin/tours/{id}/reshow`, `GET /admin/tours/{id}/statistics`, `GET /admin/tours/{id}/export` (`.zip`), `POST /admin/tours/import`, `GET /admin/apps` |
| **Assistant (admin)** | `GET /admin/assistant` (is er een provider), `POST /admin/assistant/translate` (`tour`, `from`, `to`), `POST /admin/assistant/draft` (`tour`, `description`, `lang`), `GET /admin/assistant/tasks/{id}` (`running`, `done` met stappen, of `failed` met een reden) |
| **Admin-stap-CRUD** | `saveSteps`, `resetToDefault`, `importSteps`, `exportSteps` — elk met een parameter `tour` (standaard `welcome`) |
| **Admin-instellingen** | `saveSettings` (`enabled` = **Tours for everyone**, `userMenu`, `checklist`; alleen wat meekomt verandert; de welkomsttour opnieuw tonen gaat via `POST /admin/tours/welcome/reshow`), `toggleTelemetry`, `sendTelemetryNow`, `markTelemetryAsked`, `markIntroDone` |
| **Talen** | `getAvailableLanguagesWithMetadata` (alle talen van Nextcloud), `listOverrides` (per tour) |
| **Media** | `POST /admin/media`, `POST /admin/media/from-files`, `GET /media/{file}` |
| **Persoonlijk** | `GET`/`POST /personal/settings` (`wizardDisabled`, `toursDisabled`, lijst met tours) |
| **Licentie** | Een optionele abonnementssleutel valideren en het gebruik rapporteren; niets in IntroVox wordt erdoor beperkt, en de beheerpagina roept deze routes niet aan |

## Voor de complete referentie

Zie [api-reference.md](api-reference.md) voor:

- Volledige request-/response-schema's per endpoint, ook het tour-object
- HTTP-statuscodes en error-formaat
- Het stap-object
- Filtering-implementatie-details

## Zie ook

- [Backend-architectuur](backend-architecture.nl.md) — controllers en services
- [Frontend-architectuur](frontend-architecture.nl.md) — Vue-client
- [Architectuur-overzicht](overview.nl.md) — systeem-design
