# Customization

Beheerders kunnen wizard-stap-uiterlijk en -gedrag aanpassen via drie primaire controls: HTML-content, CSS-selectors en positionering.

## HTML in stap-content

Het **Tekst (HTML)**-veld ondersteunt een gecureerde set HTML-tags. Stap-content wordt server-side gesanitized via `OCP\Util::sanitizeHTML` bij opslaan en importeren (sinds v1.5.0) om stored XSS te voorkomen.

### Ondersteunde tags

| Tag | Gebruik |
|---|---|
| `<p>` | Paragrafen |
| `<strong>`, `<b>` | Vetgedrukte tekst |
| `<em>`, `<i>` | Cursieve tekst |
| `<ul>`, `<ol>`, `<li>` | Lijsten |
| `<br>` | Regel-einde |
| `<a href="...">` | Links |

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

Inline-styles (`style="..."`) zijn niet aanbevolen — de wizard erft automatisch Nextcloud's thema-variabelen, en custom-styles zullen breken onder dark-mode en hoog-contrast-thema's. Zie [Thema-ondersteuning](theme-support.md).

### Emoji

Volledig ondersteund in titels en content. Zorg dat je Nextcloud-server UTF-8 gebruikt (default).

## CSS-selectors

Het **Element (CSS-selector)**-veld bepaalt welk UI-element een stap markeert. Laat leeg voor een gecentreerde modal.

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

Dit vermindert het percentage "element not found"-fouten significant.

### De juiste selector vinden

1. Open Nextcloud in je browser
2. Druk op **F12** om Developer Tools te openen
3. Klik op het "Inspect element"-icoon
4. Klik op het doel-element
5. Lees zijn `class`, `id`, `data-*`-attributen
6. Test je selector in de Console: `document.querySelector('je-selector')` zou het element moeten teruggeven

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

Als het element van een gekoppelde stap niet bestaat ten tijde van de tour, valt de stap terug op gecentreerde weergave (sinds v1.4.1), zodat gebruikers nog steeds de content zien.

## Stap-identifier

Het **ID**-veld wordt automatisch gegenereerd voor nieuwe stappen (timestamp-based, bv. `new_1731600000000`) en wordt intern gebruikt voor tracking en ordering. Het is niet bewerkbaar na aanmaak. Stabiele IDs zijn belangrijk omdat:

- Stap-volgorde wordt bijgehouden op ID, niet op positie (sinds v1.0.6) — in-/uitschakelen na herordenen werkt correct
- Import/export refereert stappen op ID
- Telemetrie-events refereren het stap-ID

## Zie ook

- [Wizard-stappen beheren](../admin/managing-steps.md) — stap-CRUD
- [Geleide tours](guided-tours.md) — hoe stappen renderen
- [Thema-ondersteuning](theme-support.md) — CSS-variabele-overerving
- [Best practices](../admin/best-practices.md) — content-ontwerp-aanbevelingen
