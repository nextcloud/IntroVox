# Telemetrie

IntroVox bevat optionele, anonieme gebruiks-rapportage om de applicatie te helpen verbeteren. De eerste keer dat een beheerder de instellingen van IntroVox opent, eindigt de [beheerderstour](settings.nl.md#beheerderstour) met de vraag of die gedeeld mag worden, met de lijst hieronder. Voordat een beheerder het gevraagd is, wordt er niets verstuurd. Daarna staat het aan, tenzij een beheerder **Niet delen** koos, en het is op elk moment uit te zetten.

![Het paneel Statistieken, met tour-gebruik, instantie-informatie en de telemetrie-schakelaar](../screenshots/statistics.png)

De volledige lijst van wat er wel en niet wordt verstuurd zit achter
**Precies wat wel en niet wordt verzonden** onderaan het paneel.

## Wat wordt verzameld?

IntroVox verstuurt periodiek de volgende anonieme data, precies deze velden (`TelemetryService::collectData()`):

| Data | Veld | Beschrijving |
|------|------|--------------|
| Instance-hash | `instanceHash` | SHA-256-hash van de URL van de instantie (`overwrite.cli.url`, anders het eerste trusted domain). De URL zelf wordt niet verstuurd |
| Totaal gebruikers | `totalUsers` | Aantal accounts |
| Actieve gebruikers (30d) | `activeUsers30d` | Accounts die in de laatste 30 dagen inlogden |
| Uitgeschakelde gebruikers | `disabledUsers` | Aantal accounts die bestaan maar uitgeschakeld zijn; leeg als ze niet te tellen waren |
| IntroVox-versie | `introvoxVersion` | Geïnstalleerde IntroVox-versie |
| Nextcloud-versie | `nextcloudVersion` | Server-versie voor compatibility-tracking |
| PHP-versie | `phpVersion` | Server-PHP-versie |
| Stappen per taal | `totalSteps` | Voor elke taal in `languagesWithOverrides`: het aantal stappen van de override van de welkomsttour (alleen aantallen; 0 voor Engels zonder override) |
| Talen met overrides | `languagesWithOverrides` | Talen met een override van de welkomsttour, plus altijd `en` (bv. `["en", "nl"]`) |
| Tours for everyone | `wizardEnabled` | Of **Tours for everyone** aan staat |
| Welkomsttour gestart | `wizardStartedCount` | Hoeveel mensen de welkomsttour startten; ieder telt één keer |
| Welkomsttour voltooid | `wizardCompletedCount` | Hoeveel mensen op **Klaar** klikten in de laatste stap; ieder telt één keer |
| Welkomsttour overgeslagen | `wizardSkippedCount` | Hoeveel mensen op **Overslaan en niet meer tonen** klikten; ieder telt één keer |
| Gebruikers die startten | `usersStartedWizard` | Aantal verschillende accounts die ooit de welkomsttour startten |
| Gebruikers die voltooiden | `usersCompletedWizard` | Aantal verschillende accounts die hem ooit voltooiden met **Klaar** (overslaan telt niet mee) |
| Server-regio | `serverRegion` | Uit de Nextcloud-instelling `default_phone_region` |
| Default-taal | `defaultLanguage` | Nextcloud-default-taalcode |
| Default-timezone | `defaultTimezone` | `default_timezone` van Nextcloud, anders de tijdzone van PHP, anders UTC |
| Database-type | `databaseType` | `dbtype` van Nextcloud, zoals `mysql`, `pgsql` of `sqlite` |
| Totaal groepen | `totalGroups` | Aantal Nextcloud-groepen op de instantie |
| Groep-zichtbaarheid in gebruik | `groupVisibilityUsed` | Of een stap in de overrides van de welkomsttour tot groepen beperkt is (boolean) |
| OS-familie | `osFamily` | `PHP_OS_FAMILY` van PHP, zoals Linux |
| Web-server | `webServer` | Apache, nginx, of de naam die de serversoftware opgeeft |
| Docker | `isDocker` | Of de server in een Docker-container draait (boolean) |
| Licentiesleutel | `licenseKey` | De licentiesleutel van IntroVox, als die is opgeslagen; anders leeg (de app heeft er sinds 1.7.7 geen veld meer voor). Wordt meegestuurd zodat de licentie-server de Enterprise-claim hieronder kan verifiëren — de booleans alleen zouden anders gespooft kunnen worden |
| Enterprise-subscription | `hasValidSubscription` | Of deze Nextcloud een geldige Enterprise-subscription heeft (`IRegistry::delegateHasValidSubscription()`). `false` voor Community en bij elke fout |
| Extended Support | `hasExtendedSupport` | Of die subscription ook de add-on Extended Support heeft (`IRegistry::delegateHasExtendedSupport()`). `false` voor Community en bij elke fout |

## Wat wordt NIET verzameld?

- Geen gebruikersnamen, e-mailadressen of persoonsgegevens
- Geen stap-content, titels of beschrijvingen
- Geen IP-adressen of hostnamen
- Geen URLs of domeinnamen (alleen de instance-hash)
- Geen wachtwoorden of API-tokens
- Geen per-gebruiker-gedrag — alleen geaggregeerde aantallen
- Niets over tours voor apps of pagina's, en niets van de statistieken per tour (**Hoe ver mensen komen**): die blijven op je eigen server, in het paneel [Statistieken](tours.nl.md#statistieken)

## Waar wordt data naartoe gestuurd?

Telemetrie wordt verzonden naar `https://licenses.voxcloud.nl/api/telemetry/introvox`.

Het endpoint is door beheerders configureerbaar via de `telemetry_url`-app-config-key, voor het geval je naar een self-hosted collector wilt pointen of transmissie wilt blokkeren via een fake URL.

## Telemetrie uitschakelen

### Via admin-paneel

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Open het tabblad **Statistieken**
3. Zet **Anonieme gebruiksstatistieken delen** uit

### Via command-line

```bash
sudo -u www-data php occ config:app:set introvox telemetry_enabled --value false
```

### Blokkeren op netwerk-niveau

Als je firewall outbound-connecties naar `licenses.voxcloud.nl` blokkeert, faalt IntroVox' dagelijkse rapport stilletjes — telemetrie bereikt de collector niet en er ontstaan geen gebruikers-zichtbare errors.

## Handmatig rapport

Je kunt direct een telemetrie-rapport versturen via het paneel Statistieken:

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Open het tabblad **Statistieken**
3. Klik op **Rapport nu versturen**, in de melding onder **Anonieme gebruiksstatistieken delen**

De knop staat er alleen zolang **Anonieme gebruiksstatistieken delen** aan staat.

De knop toont duidelijke feedback:

- **Succes**: "Statistieken verzonden", en **Laatste rapport verzonden** toont het nieuwe tijdstip
- **Fout**: "Fout bij het verzenden van de statistieken: …" met de reden van de server (bv. rate-limit, verbindingsprobleem)

## Wizard-tracking-events

Naast het periodieke aggregate-rapport rapporteert de wizard drie real-time levenscyclus-events naar de lokale `TelemetryService` (niet direct naar de externe server):

| Event | Endpoint | Wanneer |
|---|---|---|
| `start` | `POST /apps/introvox/api/wizard/start` | Gebruiker begint de tour |
| `complete` | `POST /apps/introvox/api/wizard/complete` | Gebruiker klikt op **Klaar** in de laatste stap |
| `skip` | `POST /apps/introvox/api/wizard/skip` | Gebruiker klikt op **Overslaan en niet meer tonen** |

Deze updaten de per-gebruiker `markUserStarted/Completed/Skipped`-timestamps in `oc_preferences` en voeden de aggregate-counts in het volgende telemetrie-rapport. Er wordt geen content uit de tour meegestuurd.

## Technische details

- Telemetrie draait als Nextcloud-background-job (`TelemetryJob`)
- Rapporten worden dagelijks verstuurd; failures worden stilletjes opnieuw geprobeerd in het volgende interval
- Timeout: 15 seconden per request
- De instance-hash is de SHA-256 van de URL van de instantie, in kleine letters en zonder slash aan het eind, dezelfde hash waaronder de licentie-server de instantie kent; de URL zelf verlaat de server nooit
- Wanneer telemetrie uit staat wordt er geen data verstuurd en geen externe connecties gemaakt

## Zie ook

- [Instellingen](settings.nl.md) — admin-paneel-overzicht
- [FAQ](faq.nl.md) — verzamelt de app telemetrie?
- [Backend-architectuur](../architecture/backend-architecture.nl.md) — TelemetryService-internals
