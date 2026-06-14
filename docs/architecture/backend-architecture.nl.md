# Backend-architectuur

> **Let op:** de gedetailleerde backend-architectuur is uitvoerig technisch en wordt onderhouden in het Engels. Voor de actuele controller-, service- en background-job-implementatie-details, raadpleeg de [Engelse backend-architectuur](backend-architecture.en.md).

## Inleiding

De IntroVox-backend is een standaard Nextcloud-PHP-app met:

- **Controllers** voor REST-endpoints (admin, public, license, personal)
- **Services** voor business-logica (telemetrie, licentie-validatie)
- **Background-jobs** voor periodieke taken (telemetrie-verzending, licentie-sync)
- **Settings-integratie** voor Nextcloud-instellingen-pagina's

## Component-categorieën

### Controllers

| Controller | Doel |
|---|---|
| `AdminController` | Stappen-CRUD, talen-management, globale instellingen, export/import |
| `ApiController` | Publieke endpoints (`getWizardSteps`, tracking-events) |
| `LicenseController` | Enterprise-subscription-validatie |
| `PersonalController` | Per-gebruiker permanent-uitschakelen-voorkeur |

### Services

| Service | Doel |
|---|---|
| `TelemetryService` | Aggregeert anonieme gebruiks-stats; verzendt naar `licenses.voxcloud.nl` |
| `LicenseService` | Valideert subscription-keys, HTTP-response-validatie |

### Background-jobs

| Job | Cadans | Doel |
|---|---|---|
| `TelemetryJob` | Dagelijks | Verzendt geaggregeerde stats naar licentie-server |
| `LicenseUsageJob` | Dagelijks (met stabiele jitter) | Synct licentie-staat en stap-limieten |

### Settings-integratie

- `AdminSettings` — Nextcloud-admin-instellingen-pagina
- `PersonalSettings` — per-gebruiker-instellingen-pagina
- `AdminSection` / `PersonalSection` — sidebar-navigatie

### Event-listeners

- `LoadScripts` — laadt frontend-bundles op elke Nextcloud-pagina

## Opslag-conventies

- **Globale config**: `oc_appconfig` (`wizard_enabled`, `enabled_languages`, `wizard_version`, `wizard_steps_<lang>`)
- **Per-gebruiker**: `oc_preferences` (`introvox/permanent_disable`, telemetrie-timestamps)
- Geen custom database-tabellen

## Veiligheids-patronen

- CSRF-bescherming op alle state-changing endpoints (v1.5.0+)
- Defensieve `IGroupManager::isAdmin()`-checks naast annotation-based authorization
- `OCP\Util::sanitizeHTML` op stap-`title`/`text` bij save/import (v1.5.0+)
- Server-side groep-filtering — verborgen stappen verlaten nooit de server
- Defensieve `is_array()`-guard tegen corrupte appconfig-blobs (v1.4.3+)

## Voor de complete referentie

Zie [backend-architecture.en.md](backend-architecture.en.md) voor:

- Per-controller-method-handtekeningen
- Service-methode-details en HTTP-call-patterns
- Background-job-scheduling en jitter-strategie
- Authorization-pipeline (annotations + defensive checks)
- Telemetrie-payload-structuur en privacy-grenzen

## Zie ook

- [Architectuur-overzicht](overview.md) — systeem-design
- [Frontend-architectuur](frontend-architecture.md) — Vue-client
- [API-referentie](api-reference.md) — REST-endpoints
- [Transifex-integratie](transifex-integration.md) — l10n-workflow
