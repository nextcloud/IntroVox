# Best practices

Aanbevelingen voor het ontwerpen, onderhouden en operationeel houden van IntroVox-tours.

## Content-ontwerp

### Houd stappen kort en gefocust

- **5–8 stappen is ideaal** voor de meeste tours; meer dan 10 begint te voelen als een klus
- **Maximum 3–5 regels** tekst per stap
- **Eén concept per stap** — combineer geen ongerelateerde features
- **Gebruik bullet-lijsten** voor meerdere items in plaats van lange paragrafen

### Schrijf voor beginners

- ✅ Welkome, vriendelijke toon
- ✅ Praktische voorbeelden ("Klik op het **Bestanden**-icoon om te beginnen met uploaden")
- ✅ Highlight tijdbesparende features (drag-and-drop, sneltoetsen)
- ❌ Vermijd jargon ("federated sharing", "OCS-API")
- ❌ Refereer niet aan features die mogelijk niet zijn geïnstalleerd (bv. Agenda als je die niet bundelt)

### Gebruik duidelijke titels

- Beschrijvend en herkenbaar: `📁 Bestanden uploaden`, `📅 Beheer je agenda`
- 1–5 woorden is ideaal
- Emoji worden volledig ondersteund en helpen gebruikers scannen

## Technische betrouwbaarheid

### Gebruik meerdere CSS-selectors als fallbacks

Sinds v1.0.6 gebruiken default-stappen komma-gescheiden selectors:

```css
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]
```

Dit voorkomt dat stappen worden overgeslagen wanneer één selector breekt na een Nextcloud-upgrade.

### Vermijd taal-specifieke selectors

Gebruik niet:

```css
button[aria-label="Unified search"]   /* breekt in niet-Engelse omgevingen */
```

Gebruik CSS-classes die over talen heen werken:

```css
.unified-search__trigger, .header-menu__trigger
```

### Bekijk het voordat gebruikers het zien

Wijzigingen worden opgeslagen zodra je ze maakt, dus gebruikers krijgen ze bij hun volgende tour. Gebruik **Preview tour** na het herordenen of het wijzigen van elementen, en **Test this step** tijdens het bewerken van een stap, om een verkeerd geplaatst kader te zien voordat je gebruikers het zien. Zie [Bekijken](managing-steps.nl.md#bekijken).

### Test op verschillende browsers

CSS-selector-gedrag kan licht variëren. Verifieer in Chrome, Firefox, Safari en Edge voor je naar gebruikers uitrolt.

## Taal-strategie

### Schrijf eerst de hoofdtaal

Maak de tour eerst goed in zijn hoofdtaal: de stappen, hun elementen en hun volgorde. Bij een tour voor een app krijgt wie een taal heeft zonder eigen stappen die hoofdtaal. Voeg daarna de andere talen toe, met **Translate with AI** als er een provider voor de Nextcloud Assistant is ingesteld: die vertaalt de woorden en laat de elementen, pagina's en media zoals ze zijn. Zie [Stappen schrijven of vertalen met AI](tours.nl.md#stappen-schrijven-of-vertalen-met-ai).

### Behoud structurele consistentie

Houd dezelfde stap-telling en onderwerp-volgorde over talen heen — maakt import/export-round-trips en vertaler-handoffs voorspelbaar.

### Gebruik native speakers

Laat de vertaling van elke taal nakijken door een native speaker, ook die van **Translate with AI**. Je kunt elke stap in de dialoog aanpassen voordat hij wordt opgeslagen. Een stijve vertaling leest slecht in onboarding en ondermijnt de welkomende toon.

### Voeg alleen overrides toe waar het nodig is

De welkomsttour en de ingebouwde tours zijn vertaald in elke taal die Transifex heeft. Elke override is een lijst met stappen die je zelf bijhoudt, en hij krijgt geen nieuwe vertalingen van de standaardstappen meer. Voeg er alleen een toe waar de standaardstappen niet passen, zoals tekst die je eigen cloud noemt, en gebruik **Reset** zodra je hem niet meer nodig hebt. Zie [Talenbeheer](language-management.nl.md).

## Operationeel onderhoud

### Back-up vóór grote wijzigingen

Gebruik de **Export**-feature voor:

- Resetten naar defaults
- Bulk-bewerken van veel stappen
- Wisselen naar een nieuwe stap-structuur

Commit exports naar git zodat je terug kunt rollen.

### Kwartaal-review

Plan een driemaandelijkse check:

- Zijn de stappen nog accuraat na Nextcloud-upgrades?
- Matchen CSS-selectors nog?
- Heeft je team nieuwe apps geïnstalleerd die in de tour zouden moeten?
- Voltooien gebruikers de tour of breken ze vroeg af?

### Update na Nextcloud-upgrades

Na elke grote Nextcloud-versie:

- Verifieer dat CSS-selectors nog de juiste elementen raken
- Test de tour met een vers gebruikers-account
- Voeg stappen toe voor grote nieuwe Nextcloud-features (bv. nieuwe app, nieuwe dashboard-widget)

### Communiceer met gebruikers

- Vermeld IntroVox in je interne onboarding-documentatie
- Verwijs nieuwe medewerkers er expliciet naar
- Na een grote content-update, overweeg **Show again to everyone** bij de tour te gebruiken, met een heads-up in je bedrijfs-communicatiekanaal

## Content-kwaliteit

### DOE

- ✅ Welkome, vriendelijke toon
- ✅ Concrete voorbeelden en use-cases
- ✅ Highlight tijdbesparende features
- ✅ Korte paragrafen (2–3 zinnen)
- ✅ Lijsten voor meerdere items
- ✅ Emoji voor visueel scannen

### DOE NIET

- ❌ Overweldigen met te veel informatie
- ❌ Complexe technische termen ongeexplained gebruiken
- ❌ Refereren aan apps die mogelijk niet zijn geïnstalleerd
- ❌ Stappen langer dan 150 woorden maken
- ❌ Vertrouwen op één CSS-selector als een fallback-keten goedkoop is
- ❌ Absolute positionering gebruiken die mogelijk niet bestaat op elke scherm-grootte

## Zie ook

- [Tourstappen beheren](managing-steps.md) — stap-CRUD
- [Customization](../features/customization.md) — HTML, CSS-selectors, positionering
- [Problemen oplossen](troubleshooting.md) — wanneer er iets mis gaat
