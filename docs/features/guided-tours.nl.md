# Geleide tours

De tour-engine van IntroVox is gebouwd op [Shepherd.js](https://shepherdjs.dev/), gewrapped in een Vue-3-frontend. Dit document beschrijft hoe stappen worden gerenderd, welke types er zijn en hoe ze worden gesequenced.

## Tour-levenscyclus

1. **App-initialisatie** — `main.js` mount de IntroVox-Vue-app op elke Nextcloud-pagina
2. **Server-request** — frontend roept `GET /apps/introvox/api/steps` aan om de geconfigureerde stap-lijst op te halen voor de huidige gebruikers-taal en groep-lidmaatschappen
3. **App-menu-readiness-check** — wacht tot het Nextcloud-app-menu is gerenderd (sinds v1.4.1, met meerdere fallback-selectors en een 10-seconden-timeout)
4. **Shepherd-instantiatie** — maakt een Shepherd-`Tour` met de geladen stappen
5. **Auto-start** — als de gebruiker de tour niet heeft voltooid/uitgeschakeld, start hij na een korte vertraging
6. **Gebruikers-navigatie** — Volgende-/Terug-/Sluiten-/Klaar-knoppen vuren Shepherd-acties en telemetrie-events
7. **Voltooiing** — zet localStorage en (bij Klaar/Overslaan) de permanent-uitschakelen-voorkeur

## Stap-types

### Gecentreerde stappen

- `attachTo: ""` (leeg)
- Verschijnen als gecentreerde modal in het midden van het scherm
- Gebruikt voor welkom, overgangen en afsluit-berichten

### Gekoppelde stappen

- `attachTo: "<css-selector>"` met `position` ingesteld op `right`, `left`, `top` of `bottom`
- Het doel-element krijgt een glimmende rand via Shepherd's overlay
- De stap-tooltip wordt naast het element geplaatst

### Fallback-gedrag (v1.4.1+)

Als het doel-element van een gekoppelde stap niet wordt gevonden bij tour-start (bv. Vue heeft het nog niet gerenderd, of de app is niet geïnstalleerd), **valt de stap terug op een gecentreerde weergave** in plaats van stil te worden overgeslagen. Dit is gewijzigd in v1.4.1 om geen belangrijke content te verliezen wanneer timing of DOM-beschikbaarheid varieert.

Vóór v1.4.1 zorgden ontbrekende elementen ervoor dat de stap volledig werd overgeslagen met een console-waarschuwing:

```
⚠️ Wizard: Skipping step 'X' - element not found
```

## Stap-filtering

Stappen worden server-side gefilterd voor ze de frontend bereiken:

1. **Globale enable-check** — als `wizard_enabled` `false` is, geeft de API een lege stap-lijst terug
2. **Taal-check** — de base-taal van de gebruiker moet in `enabled_languages` zitten
3. **Groep-check** — stappen met niet-lege `visibleToGroups` moeten overlappen met de groepen van de gebruiker (via `IGroupManager::getUserGroupIds()`)

Uitgeschakelde stappen (`enabled: false`) worden ook uitgefilterd voor ze naar de frontend gaan.

Zie [API-referentie](../architecture/api-reference.md) voor het request-/response-formaat.

## Auto-start-condities

De tour start automatisch wanneer **al** deze waar zijn:

- `wizard_enabled` is `true` (admin-instelling)
- De taal van de gebruiker zit in `enabled_languages`
- De gebruiker heeft de `permanent_disable`-voorkeur niet gezet
- De gebruiker heeft de wizard niet voltooid (volgens localStorage)
- De huidige `wizard_version` is nieuwer dan wat de gebruiker voor het laatst zag (gebruikt door **Wizard tonen aan alle gebruikers**)
- De huidige pagina is het dashboard

## Telemetrie-events

De frontend rapporteert drie levenscyclus-events:

| Event | Endpoint | Wanneer |
|---|---|---|
| `start` | `POST /apps/introvox/api/track/start` | Tour begint voor een gebruiker |
| `complete` | `POST /apps/introvox/api/track/complete` | Gebruiker klikt op **Klaar** in laatste stap |
| `skip` | `POST /apps/introvox/api/track/skip` | Gebruiker klikt op **Overslaan en niet meer tonen** |

Deze worden anoniem opgeslagen via `TelemetryService` en dragen bij aan aggregate admin-statistieken.

Zie [Backend-architectuur](../architecture/backend-architecture.md) voor telemetrie-service-details.

## Theming

De tour erft Nextcloud's CSS-variabelen, zodat light-/dark-/hoog-contrast-modi automatisch werken. Zie [Thema-ondersteuning](theme-support.md).

## Sluit-gedrag

| Actie | localStorage | Server-voorkeur | Opnieuw getoond? |
|---|---|---|---|
| **✕ Sluiten** | `seen` | ongewijzigd | Ja |
| **Klaar** | `completed` | `permanent_disable: true` | Nee, tenzij admin forceer-toont |
| **Overslaan en niet meer tonen** | `completed` | `permanent_disable: true` | Nee, tenzij admin forceer-toont |

## Customization-oppervlak

Beheerders kunnen configureren:

- Stap-titel (platte tekst + emoji)
- Stap-content (HTML, server-side gesanitized sinds v1.5.0)
- CSS-selector voor element-markering
- Positie t.o.v. het gemarkeerde element
- In-/uitschakelen per stap
- Groep-zichtbaarheid per stap (v1.2.0+)
- Stap-volgorde via drag-and-drop

Zie [Customization](customization.md) en [Wizard-stappen beheren](../admin/managing-steps.md).

## Zie ook

- [Customization](customization.md) — HTML, CSS-selectors, positionering
- [Stap-zichtbaarheid](step-visibility.md) — groep-filters en gebruikers-voorkeuren
- [Meertaligheid](multi-language.md) — per-taal stap-content
- [Thema-ondersteuning](theme-support.md) — light-/dark-/hoog-contrast
- [Architectuur-overzicht](../architecture/overview.md) — systeem-design
