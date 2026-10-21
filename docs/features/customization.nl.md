# Customization

Beheerders kunnen wizard-stap-uiterlijk en -gedrag aanpassen via drie primaire controls: HTML-content, CSS-selectors en positionering.

## HTML in stap-content

Het veld **Tekst** is een opmaakeditor (zie [Tourstappen beheren](../admin/managing-steps.nl.md#tekst)); onder **Bewerken als HTML** neemt het een gecureerde set HTML-tags aan. De tekst wordt opgeslagen zoals geschreven en opgeschoond waar hij getoond wordt: in de tour en de stappenlijst blijven alleen de tags hieronder over, links houden alleen hun doel, en al het andere (scripts, stijlen, formulieren, afbeeldingen, event-handlers) verdwijnt. Titels en knopteksten zijn platte tekst. Dat geldt ook voor geïmporteerde tours en vertalingen van de standaardstappen, die niemand op opmaak controleert.

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

Inline-styles (`style="..."`) worden verwijderd als de stap getoond wordt. De tour erft automatisch Nextcloud's thema-variabelen en volgt zo dark-mode en hoog-contrast-thema's zonder ze. Zie [Thema-ondersteuning](theme-support.nl.md).

### Emoji

Volledig ondersteund in titels en content. Zorg dat je Nextcloud-server UTF-8 gebruikt (default).

## CSS-selectors

Het veld **Koppelen aan element (CSS-selector)** bepaalt welk UI-element een stap markeert. Laat het leeg voor een gecentreerde stap.

### Betrouwbare selectors

Gebruik selectors die werken over:

- Verschillende Nextcloud-versies
- Verschillende gebruikers-talen
- Light-/dark-thema's
- Verschillende geïnstalleerde apps

### Aanbevolen patronen

```css
/* Gebruik taal-onafhankelijke classes en id's die UI-refactors overleven */
.unified-search-input

/* Gebruik komma-gescheiden fallbacks voor andere Nextcloud-versies, de liefste vooraan */
.unified-search-input, #unified-search, .unified-search__trigger

/* Combineer een class met een href als meer items die class delen */
.app-menu-entry a[href*="/apps/files"]
```

### Anti-patronen

```css
/* DOE NIET — gebruik geen taal-specifieke attributen, breekt voor niet-Engelse gebruikers */
button[aria-label="Unified search"]

/* DOE NIET — vertrouw niet op één fragiele selector */
#some-very-specific-id-that-changes-per-NC-version

/* DOE NIET — gebruik geen class die meer elementen delen: op Nextcloud 34 landt deze op de meldingenbel */
.header-menu__trigger
```

### Multi-fallback-selectors (v1.0.6+)

Default-stappen gebruiken komma-gescheiden selectors zodat als één faalt (bv. na een Nextcloud-upgrade), een andere kan matchen. De zoekstap van de welkomsttour:

```css
.unified-search-input, #unified-search, .unified-search__trigger, .header-menu__trigger
```

Nextcloud 34 heeft een zoekveld in de header (`.unified-search-input`), oudere versies een zoekknop (`#unified-search`). `.header-menu__trigger` staat achteraan, alleen als laatste redmiddel: in zijn eentje past hij op elk header-menu, en op Nextcloud 34 is de eerste daarvan de meldingenbel.

De tour probeert ze in de volgorde waarin ze staan: de stap wijst naar de eerste selector die een zichtbaar element vindt, waar de andere ook op de pagina staan. Zet de selector die je het liefst hebt vooraan.

Dit vermindert het percentage "element not found"-fouten significant.

### De juiste selector vinden

Het snelst gaat het met **Element kiezen** (Pick element) in de stap-editor: wijs het element aan en de selector wordt ingevuld. Zie [Element kiezen](../admin/managing-steps.nl.md#element-kiezen).

**Een element in een menu** bestaat alleen zolang het menu open is. Zet **Element kiezen** op **Bladeren** (Browse), open het menu zoals je gewend bent, houd Shift ingedrukt en klik op het item. De kiezer vult dan **Eerst openen** (Open first) in met de knop die het menu opent, zodat de stap het menu zelf opent voordat hij verschijnt.

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

Is het element van een gekoppelde stap er niet als de stap verschijnt, dan wacht de stap met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is). De pagina blijft bruikbaar, en de stap schuift naar het element zodra het verschijnt; **Volgende** gaat gewoon verder. Zie [Stappen die op de gebruiker wachten](../admin/managing-steps.nl.md#stappen-die-op-de-gebruiker-wachten).

## Stap-identifier

Elke stap heeft een ID, gemaakt als de stap wordt aangemaakt (timestamp-based, bv. `new_1731600000000`) en intern gebruikt voor tracking en ordering. Er is geen veld voor in de editor; de stappenlijst toont het naast de titel als "ID: …". Stabiele IDs zijn belangrijk omdat:

- Stap-volgorde wordt bijgehouden op ID, niet op positie (sinds v1.0.6) — in-/uitschakelen na herordenen werkt correct
- Import/export refereert stappen op ID
- **Hoe ver mensen komen** in de statistieken het stap-ID vastlegt

## Zie ook

- [Tourstappen beheren](../admin/managing-steps.nl.md) — stap-CRUD
- [Geleide tours](guided-tours.nl.md) — hoe stappen renderen
- [Thema-ondersteuning](theme-support.nl.md) — CSS-variabele-overerving
- [Best practices](../admin/best-practices.nl.md) — content-ontwerp-aanbevelingen
