# Customization

Beheerders kunnen wizard-stap-uiterlijk en -gedrag aanpassen via drie primaire controls: HTML-content, CSS-selectors en positionering.

## HTML in stap-content

Het veld **Text** is een opmaakeditor (zie [Tourstappen beheren](../admin/managing-steps.nl.md#tekst)); onder **Edit as HTML** neemt het een gecureerde set HTML-tags aan. De tekst wordt opgeslagen zoals geschreven en opgeschoond waar hij getoond wordt: in de tour en de stappenlijst blijven alleen de tags hieronder over, links houden alleen hun doel, en al het andere (scripts, stijlen, formulieren, afbeeldingen, event-handlers) verdwijnt. Titels en knopteksten zijn platte tekst. Dat geldt ook voor geïmporteerde tours en vertalingen van de standaardstappen, die niemand op opmaak controleert.

### Ondersteunde tags

| Tag | Gebruik |
|---|---|
| `<p>` | Paragrafen |
| `<strong>`, `<b>` | Vetgedrukte tekst |
| `<em>`, `<i>` | Cursieve tekst |
| `<ul>`, `<ol>`, `<li>` | Lijsten |
| `<br>` | Regel-einde |
| `<small>`, `<code>`, `<u>` | Kleine letters, code, onderstreept |
| `<h3>`, `<h4>` | Kopjes |
| `<a href="...">` | Links; `target="_blank"` opent een nieuw tabblad |

### Voorbeeld

```html
<p>Welkom bij <strong>Nextcloud</strong>!</p>
<p>Hier kun je:</p>
<ul>
  <li>📁 Bestanden uploaden, delen en samenwerken</li>
  <li>📅 Je agenda beheren</li>
  <li>✉️ E-mails versturen en ontvangen</li>
  <li>👥 Contacten beheren</li>
</ul>
<p>Lees de <a href="https://docs.nextcloud.com">documentatie</a> voor meer.</p>
```

### Inline-styles

Inline-styles (`style="..."`) worden verwijderd als de stap getoond wordt. De tour erft automatisch Nextcloud's thema-variabelen en volgt zo dark-mode en hoog-contrast-thema's zonder ze. Zie [Thema-ondersteuning](theme-support.md).

### Emoji

Volledig ondersteund in titels en content. Zorg dat je Nextcloud-server UTF-8 gebruikt (default).

## CSS-selectors

Het veld **Attach to element (CSS selector)** bepaalt welk UI-element een stap markeert. Laat het leeg voor een gecentreerde stap.

### Betrouwbare selectors

Gebruik selectors die werken over:

- Verschillende Nextcloud-versies
- Verschillende gebruikers-talen
- Light-/dark-thema's
- Verschillende geïnstalleerde apps

### Aanbevolen patronen

```css
/* Gebruik data-attributen en CSS-classes die UI-refactors overleven */
[data-id="files"]

/* Gebruik komma-gescheiden fallbacks */
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]

/* Gebruik taal-onafhankelijke classes */
.unified-search__trigger, .header-menu__trigger
```

### Anti-patronen

```css
/* DOE NIET — gebruik geen taal-specifieke attributen, breekt voor niet-Engelse gebruikers */
button[aria-label="Unified search"]

/* DOE NIET — vertrouw niet op één fragiele selector */
#some-very-specific-id-that-changes-per-NC-version
```

### Multi-fallback-selectors (v1.0.6+)

Default-stappen gebruiken komma-gescheiden selectors zodat als één faalt (bv. na een Nextcloud-upgrade), een andere kan matchen:

```css
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]
```

De tour probeert ze in de volgorde waarin ze staan: de stap wijst naar de eerste selector die een zichtbaar element vindt, waar de andere ook op de pagina staan. Zet de selector die je het liefst hebt vooraan.

Dit vermindert het percentage "element not found"-fouten significant.

### De juiste selector vinden

Het snelst gaat het met **🎯 Pick element** in de stap-editor: wijs het element aan en de selector wordt ingevuld. Zie [Element kiezen](../admin/managing-steps.nl.md#element-kiezen).

Met de hand zoeken, bijvoorbeeld om komma-gescheiden fallbacks toe te voegen:

1. Open Nextcloud in je browser
2. Druk op **F12** om Developer Tools te openen
3. Klik op het "Inspect element"-icoon
4. Klik op het doel-element
5. Lees zijn `class`, `id`, `data-*`-attributen
6. Test elke selector apart in de Console: `document.querySelector('je-selector')` zou het element moeten teruggeven. Test zo geen hele komma-gescheiden lijst: de browser geeft dan de match die het eerst in de pagina staat, en dat hoeft niet de selector te zijn die de tour kiest

## Positie

Het **Positie**-veld bepaalt waar de stap-tooltip verschijnt t.o.v. het gemarkeerde element.

| Positie | Geschikt voor |
|---|---|
| `right` | Linker-sidebar-elementen (Files, Agenda) |
| `left` | Rechter-sidebar-elementen (gebruikers-menu) |
| `top` | Onder-navigatie |
| `bottom` | Boven-navigatie (header, zoek-balk) |

De positie geldt alleen voor **gekoppelde** stappen (waar `attachTo` is ingesteld). Gecentreerde stappen negeren hem.

## Gecentreerd vs. gekoppeld

- **Gecentreerde stap** — laat `attachTo` leeg. Stap verschijnt in het midden van het scherm.
- **Gekoppelde stap** — zet `attachTo` op een CSS-selector en kies een `position`. Stap verschijnt naast het gemarkeerde element.

Is het element van een gekoppelde stap er niet als de stap verschijnt, dan wacht de stap met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is). De pagina blijft bruikbaar, en de stap schuift naar het element zodra het verschijnt; **Next** gaat gewoon verder. Zie [Stappen die op de gebruiker wachten](../admin/managing-steps.nl.md#stappen-die-op-de-gebruiker-wachten).

## Stap-identifier

Het **ID**-veld wordt automatisch gegenereerd voor nieuwe stappen (timestamp-based, bv. `new_1731600000000`) en wordt intern gebruikt voor tracking en ordering. Het is niet bewerkbaar na aanmaak. Stabiele IDs zijn belangrijk omdat:

- Stap-volgorde wordt bijgehouden op ID, niet op positie (sinds v1.0.6) — in-/uitschakelen na herordenen werkt correct
- Import/export refereert stappen op ID
- Telemetrie-events refereren het stap-ID

## Zie ook

- [Tourstappen beheren](../admin/managing-steps.md) — stap-CRUD
- [Geleide tours](guided-tours.md) — hoe stappen renderen
- [Thema-ondersteuning](theme-support.md) — CSS-variabele-overerving
- [Best practices](../admin/best-practices.md) — content-ontwerp-aanbevelingen
