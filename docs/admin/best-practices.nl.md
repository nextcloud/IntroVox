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

### Sla op na herordenen

Drag-and-drop-herorderingen zijn in-memory totdat je op **💾 Wijzigingen opslaan** klikt. Sla altijd op vóór je van taal wisselt of de beheer-pagina sluit — niet-opgeslagen wijzigingen triggeren een waarschuwing, maar die is makkelijk per ongeluk te dismissen.

### Test op verschillende browsers

CSS-selector-gedrag kan licht variëren. Verifieer in Chrome, Firefox, Safari en Edge voor je naar gebruikers uitrolt.

## Taal-strategie

### Begin met één taal

Maak de Engelse versie eerst perfect; voeg andere talen toe zodra vertalingen klaar zijn. Het is makkelijker om één goed-geteste tour te onderhouden dan vijf middelmatige.

### Behoud structurele consistentie

Houd dezelfde stap-telling en onderwerp-volgorde over talen heen — maakt import/export-round-trips en vertaler-handoffs voorspelbaar.

### Gebruik native speakers

Voor elke taal, laat vertalingen reviewen door een native speaker. Auto-vertaalde stap-content leest slecht in onboarding-contexten en ondermijnt de welkomende toon.

### Schakel alleen benodigde talen in

Elke ingeschakelde taal is een stap-lijst om te onderhouden. Schakel Zweeds niet in als niemand in je org Zweeds spreekt — uitschakelen verbergt de tour netjes voor die gebruikers met een duidelijke melding.

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
- Na een grote content-update, overweeg **Wizard tonen aan alle gebruikers** te gebruiken met een heads-up in je bedrijfs-communicatiekanaal

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

- [Wizard-stappen beheren](managing-steps.md) — stap-CRUD
- [Customization](../features/customization.md) — HTML, CSS-selectors, positionering
- [Problemen oplossen](troubleshooting.md) — wanneer er iets mis gaat
