# Wizard-stappen beheren

Deze gids dekt de CRUD-operaties voor wizard-stappen: toevoegen, bewerken, verwijderen, herordenen, in-/uitschakelen, resetten en opslaan.

## Overzicht van de stap-lijst

Na het selecteren van een taal onder **Taal-instellingen** zie je de lijst stappen voor die taal. Elke rij toont:

| Kolom | Beschrijving |
|---|---|
| **☰** | Sleep-handle voor herordenen |
| **#** | Sequentieel stap-nummer |
| **Titel** | De stap-titel die gebruikers zien |
| **ID** | Unieke identifier (niet bewerkbaar na aanmaak) |
| **Zichtbaar voor** | Groepen die deze stap kunnen zien (of "Alle gebruikers") |
| **✅ / ❌** | In-/uitschakelen-toggle |
| **✏️** | Bewerk-knop |
| **🗑️** | Verwijder-knop |

## Nieuwe stap toevoegen

1. Klik op **➕ Nieuwe stap toevoegen** bovenaan de lijst
2. Vul het formulier in

### Formulier-velden

| Veld | Verplicht | Beschrijving | Voorbeeld |
|---|---|---|---|
| **ID** | Ja (auto-gegenereerd) | Unieke stap-identifier, timestamp-based voor nieuwe stappen | `new_1731600000000` |
| **Titel** | Ja | Stap-titel, ondersteunt emoji | `👋 Welkom bij Nextcloud` |
| **Tekst (HTML)** | Ja | Stap-body, ondersteunt HTML | `<p>Leuk dat je er bent!</p>` |
| **Element (CSS-selector)** | Nee | Element om te markeren; leeg = gecentreerde modal | `a[href*="/apps/files/"]` |
| **Positie** | Als Element is ingesteld | Tooltip-positie t.o.v. het element | `right`, `left`, `top`, `bottom` |
| **Zichtbaar voor groepen** | Nee | Groepen die deze stap kunnen zien; leeg = alle gebruikers | `Administrators` |

### CSS-selector-voorbeelden

```css
/* Link naar Files-app — meerdere fallbacks voor betere detectie */
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]

/* Zoek-balk — taal-onafhankelijke selectors (aanbevolen) */
.unified-search__trigger, .header-menu__trigger

/* Agenda-app */
[data-id="calendar"], a[href*="/apps/calendar"]

/* Gebruikers-menu */
#user-menu

/* Gecentreerde stap (laat leeg) */
```

**Tips voor betrouwbare selectors:**

- **Vermijd taal-specifieke attributen** zoals `aria-label="Unified search"` — die breken in andere talen. Gebruik CSS-classes zoals `.unified-search__trigger`.
- **Gebruik meerdere fallbacks** gescheiden door komma's. Default-stappen gebruiken dit patroon (bv. `[data-id="files"], a[href*="/apps/files"]`) om Nextcloud-UI-wijzigingen te overleven.
- **Inspecteer eerst**: open DevTools (F12), klik op "Inspect element", klik dan op het target om classes en attributen te zien.
- **Test in de console**: `document.querySelector('je-selector')` zou het element moeten teruggeven.

### Positie-gids

| Positie | Geschikt voor |
|---|---|
| `right` | Linker-sidebar-elementen (Files, Agenda) |
| `left` | Rechter-sidebar-elementen (gebruikers-menu) |
| `top` | Onder-navigatie |
| `bottom` | Boven-navigatie (header, zoeken) |

### Opslaan

1. Klik op **💾 Opslaan** in het formulier om de stap aan de lijst toe te voegen
2. Klik op de groene **💾 Wijzigingen opslaan**-knop bovenaan de lijst om alle aanpassingen te persisteren

## Stap bewerken

1. Klik op **✏️ Bewerken** naast de stap
2. Wijzig velden naar wens
3. Klik op **💾 Opslaan** om te bevestigen, of **❌ Annuleren** om te verwerpen
4. Klik op **💾 Wijzigingen opslaan** om te persisteren

## Stap verwijderen

1. Klik op **🗑️ Verwijderen**
2. Bevestig in het dialoog
3. De stap wordt direct uit de lijst verwijderd
4. Klik op **💾 Wijzigingen opslaan** om te persisteren

> **Let op:** overweeg om de stap [uit te schakelen](#stap-aanuitschakelen) in plaats van te verwijderen als je hem later misschien terug wilt.

## Stappen herordenen

1. Klik en houd de **☰**-sleep-handle links van een stap vast
2. Sleep naar de nieuwe positie
3. Laat los om te plaatsen
4. Klik op **💾 Wijzigingen opslaan** om te persisteren

**Belangrijk:** sinds v1.0.6 wordt stap-volgorde bijgehouden op stap-**ID** (niet op positie), zodat in-/uitschakelen van stappen na herordenen correct werkt. Je moet **Wijzigingen opslaan** klikken om de nieuwe volgorde te persisteren.

## Stap aan-/uitschakelen

Elke stap heeft een in-/uitschakelen-toggle:

- **✅ Ingeschakeld** — getoond aan gebruikers
- **❌ Uitgeschakeld** — verborgen (grijs gemaakt, met doorstreping)

Uitgeschakelde stappen blijven in je configuratie. Gebruik dit voor:

- Stappen tijdelijk verbergen zonder ze te verwijderen
- Seizoens- of conditionele content
- Verschillende tour-configuraties testen

## Reset naar default

De knop **🔄 Reset naar default** herstelt fabrieks-defaults voor **alleen de geselecteerde taal**.

1. Selecteer de taal om te resetten
2. Klik op **🔄 Reset naar default**
3. Bevestig in het dialoog

**Waarschuwingen:**

- **Kan niet ongedaan worden gemaakt** — exporteer eerst als je een back-up wilt
- **Alleen de geselecteerde taal** wordt gereset; andere talen blijven onveranderd
- Alle custom-stappen voor die taal worden verwijderd

De default-stappen dekken: welkom bij Nextcloud → bestand-beheer → agenda → zoeken → belangrijke features → nuttige tips → afsluiting.

## Wijzigingen opslaan

De groene **💾 Wijzigingen opslaan**-knop bovenaan de stap-lijst persisteert alle aanpassingen: adds, edits, deletes, reorders en aan-/uitschakelen-toggles.

- Alleen actief (niet grijs) bij niet-opgeslagen wijzigingen
- Van taal wisselen met niet-opgeslagen wijzigingen triggert een waarschuwing
- Na opslaan zie je "Stappen succesvol opgeslagen!"

## Groep-gebaseerde zichtbaarheid

Het veld **Zichtbaar voor groepen** in de stap-editor beperkt een stap tot specifieke Nextcloud-groepen. Leeg = zichtbaar voor alle gebruikers. Zie [Groep-gebaseerde zichtbaarheid](group-visibility.md) voor de volledige gids.

## Zie ook

- [Groep-gebaseerde zichtbaarheid](group-visibility.md) — stappen beperken tot gebruikersgroepen
- [Import/Export](import-export.md) — configuraties delen
- [Customization](../features/customization.md) — HTML in stap-content, CSS-selectors
- [Best practices](best-practices.md) — content-richtlijnen
