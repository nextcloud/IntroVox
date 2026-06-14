# Telemetrie

IntroVox bevat optionele, anonieme gebruiks-rapportage om de applicatie te helpen verbeteren. Telemetrie is een **opt-out**-feature — standaard ingeschakeld en op elk moment uit te zetten.

## Wat wordt verzameld?

IntroVox verstuurt periodiek de volgende anonieme data:

| Data | Beschrijving |
|------|--------------|
| Instance-hash | SHA-256-hash afgeleid van je Nextcloud-instance-ID (niet de URL zelf) |
| IntroVox-versie | Geïnstalleerde IntroVox-versie |
| Nextcloud-versie | Server-versie voor compatibility-tracking |
| PHP-versie | Server-PHP-versie |
| Totaal gebruikers | Totaal Nextcloud-gebruikers-aantal |
| Actieve gebruikers (30d) | Gebruikers actief in laatste 30 dagen |
| Wizard ingeschakeld | Of de wizard momenteel globaal aan staat |
| Ingeschakelde talen | Welke talen de beheerder heeft ingeschakeld (bv. `["en", "nl"]`) |
| Totaal stappen per taal | Stap-telling per ingeschakelde taal (alleen aantallen) |
| Wizard-start-aantal | Totale keren dat gebruikers de wizard zijn gestart |
| Wizard-complete-aantal | Totale `Klaar`-knop-klikken |
| Wizard-skip-aantal | Totale `Overslaan en niet meer tonen`-klikken |
| Unieke gebruikers gestart | Aantal unieke gebruikers die ooit de tour startten |
| Unieke gebruikers voltooid | Aantal unieke gebruikers die ooit voltooid/skipped hebben |
| Totaal groepen | Aantal Nextcloud-groepen op de instantie |
| Groep-zichtbaarheid in gebruik | Of een stap `visibleToGroups`-beperkingen gebruikt (boolean) |
| Server-regio | Uit Nextcloud's `default_phone_region`-instelling |
| Default-taal | Nextcloud-default-taalcode |
| Default-timezone | Server-timezone |
| Database-type | MySQL, PostgreSQL of SQLite |
| OS-familie | Linux, Windows of macOS |
| Web-server | Apache of nginx |
| Docker | Of de server in een Docker-container draait (boolean) |
| Extended Support / Enterprise | Boolean of de host-Nextcloud een Extended-Support-/Enterprise-subscription heeft. Bron: `OCP\Util::hasExtendedSupport`. Valt terug op `false` voor Community |
| Subscription-key | De IntroVox-subscription-key (indien geconfigureerd). Wordt meegestuurd zodat de licentie-server de Enterprise-claim hierboven kan verifiëren — de boolean alleen zou anders gespooft kunnen worden. Lege string voor community-instanties |

## Wat wordt NIET verzameld?

- Geen gebruikersnamen, e-mailadressen of persoonsgegevens
- Geen stap-content, titels of beschrijvingen
- Geen IP-adressen of hostnamen
- Geen URLs of domeinnamen (alleen de instance-hash)
- Geen wachtwoorden of API-tokens
- Geen per-gebruiker-gedrag — alleen geaggregeerde aantallen

## Waar wordt data naartoe gestuurd?

Telemetrie wordt verzonden naar `https://licenses.voxcloud.nl/api/telemetry/introvox`.

Het endpoint is door beheerders configureerbaar via de `telemetry_url`-app-config-key, voor het geval je naar een self-hosted collector wilt pointen of transmissie wilt blokkeren via een fake URL.

## Telemetrie uitschakelen

### Via admin-paneel

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Open het **Support**-tabblad
3. Zet de toggle **Anonieme gebruiks-statistieken versturen** uit

### Via command-line

```bash
sudo -u www-data php occ config:app:set introvox telemetry_enabled --value false
```

### Blokkeren op netwerk-niveau

Als je firewall outbound-connecties naar `licenses.voxcloud.nl` blokkeert, faalt IntroVox' dagelijkse rapport stilletjes — telemetrie bereikt de collector niet en er ontstaan geen gebruikers-zichtbare errors.

## Handmatig rapport

Je kunt direct een telemetrie-rapport versturen via het Support-tabblad:

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Open het **Support**-tabblad
3. Klik op **Nu rapport versturen**

De knop toont duidelijke feedback:

- **Succes**: bevestigt dat het rapport is verstuurd en updatet het tijdstempel
- **Fout**: toont de specifieke server-foutmelding (bv. rate-limit, connectivity-issue)

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
- De instance-hash wordt afgeleid van je Nextcloud-`instanceid`-config-waarde, dus verschillende Nextcloud-installaties produceren verschillende hashes — ook als gehost op hetzelfde domein
- Wanneer telemetrie uit staat wordt er geen data verstuurd en geen externe connecties gemaakt

## Zie ook

- [Instellingen](settings.md) — admin-paneel-overzicht
- [FAQ](faq.md) — verzamelt de app telemetrie?
- [Backend-architectuur](../architecture/backend-architecture.md) — TelemetryService-internals
