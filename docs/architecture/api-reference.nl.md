# API-referentie

> **Let op:** de complete API-referentie wordt onderhouden in het Engels. Voor de actuele endpoint-specificatie, request-/response-schema's en code-voorbeelden, raadpleeg de [Engelse API-referentie](api-reference.en.md).

## Inleiding

IntroVox biedt een REST-API voor:

- De wizard-stap-lijst ophalen (gefilterd op taal + groepen)
- Tour-start-/voltooiings-/skip-events tracken voor telemetrie
- Admin-CRUD op stappen, talen en globale instellingen
- Per-gebruiker permanent-uitschakelen-voorkeur beheren
- Enterprise-subscription-status valideren

## Authenticatie

Endpoints vereisen een actieve Nextcloud-sessie of een app-wachtwoord. Admin-endpoints checken aanvullend `IGroupManager::isAdmin()`.

## Endpoint-categorieën

| Categorie | Doel |
|---|---|
| **Wizard-stappen** | `getWizardSteps` (gefilterd), `getStepsForLanguage` (admin) |
| **Tracking** | `start`, `complete`, `skip` — telemetrie-events |
| **Admin-stap-CRUD** | `saveSteps`, `resetToDefault`, `importSteps`, `exportSteps` |
| **Admin-instellingen** | `saveSettings`, `toggleTelemetry`, `sendTelemetryNow` |
| **Talen** | `getAvailableLanguages` (auto-discovered) |
| **Persoonlijk** | `getPersonalSettings`, `savePersonalSettings` |
| **Licentie** | Enterprise-subscription-validatie + statistieken |

## Voor de complete referentie

Zie [api-reference.en.md](api-reference.en.md) voor:

- Volledige request-/response-schema's per endpoint
- HTTP-statuscodes en error-formaat
- CSRF-token-vereisten per endpoint
- Code-voorbeelden in cURL
- Filtering-implementatie-details

## Zie ook

- [Backend-architectuur](backend-architecture.md) — controllers en services
- [Frontend-architectuur](frontend-architecture.md) — Vue-client
- [Architectuur-overzicht](overview.md) — systeem-design
