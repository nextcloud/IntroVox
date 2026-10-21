# Import & Export

*Geïntroduceerd in v1.1.0.*

Import/Export laat je de stappen van een tour downloaden als JSON en later weer uploaden. **Exporteren** en **Import** zitten in de stappen-editor van elke tour: open **Tours** en klik bij de tour op **Stappen bewerken**. Ze werken alleen op die tour en de geselecteerde taal. Dit maakt mogelijk:

- **Samenwerking** met content-schrijvers, vertalers en andere beheerders
- **Versiebeheer** (JSON committen naar git, wijzigingen volgen in de tijd)
- **Multi-instance-deployment** (één keer configureren, overal uitrollen)
- **Back-ups** voor het maken van grote wijzigingen

## Wizard-stappen exporteren

### Hoe te exporteren

1. Selecteer de taal om te exporteren uit de taal-dropdown
2. Klik op **Exporteren** in de rij knoppen boven de stappenlijst
3. Een JSON-bestand wordt automatisch gedownload

**Bestandsnaam-formaat:** `introvox_steps_{taal}.json` voor de welkomsttour, `introvox_{tour}_steps_{taal}.json` voor een tour voor een app of pagina

**Voorbeeld:** de welkomsttour in het Engels exporteren levert `introvox_steps_en.json` op.

### Wat is inbegrepen

- Alle stappen van de tour voor de geselecteerde taal
- Stap-IDs, titels, HTML-tekst-content
- CSS-selectors (`attachTo`) en posities
- De pagina waar een stap bij hoort (`page`) en de knop waarop de tour eerst klikt om een menu te openen (`openFirst`)
- Hoe de stap verder gaat (`advance`): de knop Volgende, een klik op het element, of het veld invullen
- De afbeelding of video van de stap (`media`): een verwijzing naar het bestand, niet het bestand zelf
- In-/uitgeschakelde status
- Stap-volgorde
- Groep-zichtbaarheid (`visibleToGroups`)

Het JSON-bestand bevat de afbeeldingen en video's zelf niet. Importeer je het op dezelfde Nextcloud, dan houden de stappen ze; op een andere Nextcloud vallen ze weg, met de melding "An image or video in the file is not on this server and was left out." Een tour met zijn afbeeldingen en video's verhuis je met **Tour exporteren** in het ⋯-menu van de tour, zie hieronder.

## Een hele tour

Deze pagina gaat over de stappen van één taal. Een hele tour naar een andere Nextcloud verhuizen, met zijn instellingen, alle talen en zijn afbeeldingen en video's, doe je met **Tour exporteren** en **Tour importeren** in de lijst met tours; zie [Een tour naar een andere Nextcloud verhuizen](tours.nl.md#een-tour-naar-een-andere-nextcloud-verhuizen).

## Wizard-stappen importeren

### Hoe te importeren

1. Open de tour waar de stappen bij horen: **Tours** → **Stappen bewerken**
2. Klik op **Import** in de rij knoppen boven de stappenlijst
3. Kies een JSON-bestand van je computer
4. Je ziet een succesbericht: *"Imported X steps (taal)"*, en de editor schakelt naar die taal

De taal komt uit het bestand (het veld `"language"`), niet uit de taalkeuze. Wil je stappen in een andere taal importeren, pas dat veld dan eerst aan.

### Belangrijke opmerkingen

- ⚠️ **Importeren vervangt alle bestaande stappen** voor die taal
- ✅ Alleen de taal van het bestand wordt geraakt — veilig voor multi-taal-setups
- ✅ De JSON wordt gevalideerd voor toepassen
- 💾 Auto-save — wijzigingen zijn direct actief na succesvolle import

### Validatie

De import valideert, en weigert het hele bestand bij het eerste probleem:

- Het bestand is maximaal 1 MB en de JSON-syntax is correct
- Maximaal 100 stappen, elk met een `id` (letters, cijfers, `_`, `-`, `.`) en een `title`
- Elk veld heeft het juiste type en de juiste lengte (tekst tot 20.000 tekens)
- `page` is een pad op deze Nextcloud, zoals `/apps/spreed/` — nooit een andere site
- `advance` is `button`, `click` of `input`
- Geen dubbele stap-IDs binnen het bestand

Velden die IntroVox niet kent, vallen weg. Opslaan vanuit de stap-editor gaat door dezelfde controles.

### Foutmeldingen

Als import faalt zie je een specifieke fout:

- `Fout bij het importeren van de stappen: Invalid JSON format: Syntax error`
- `Fout bij het importeren van de stappen: Invalid step data: Step 3: id must be letters, digits, "_", "-" or "."`
- `Fout bij het importeren van de stappen: Import file is too large (at most 1 MB)`

## JSON-bestandsstructuur

```json
{
  "version": "1.0",
  "language": "nl",
  "exportDate": "2026-10-01 12:00:00",
  "steps": [
    {
      "id": "welcome",
      "title": "👋 Welkom bij Nextcloud",
      "text": "<p>Leuk dat je er bent!</p>",
      "attachTo": "",
      "position": "right",
      "enabled": true,
      "visibleToGroups": []
    },
    {
      "id": "files",
      "title": "📁 Bestanden",
      "text": "<p>Beheer hier je bestanden.</p>",
      "attachTo": "[data-id=\"files\"]",
      "position": "right",
      "enabled": true,
      "visibleToGroups": []
    },
    {
      "id": "admin-panel",
      "title": "⚙️ Admin-paneel",
      "text": "<p>Configureer hier je Nextcloud-instantie.</p>",
      "attachTo": "[data-id=\"settings\"]",
      "position": "right",
      "enabled": true,
      "visibleToGroups": ["admin", "Administrators"]
    }
  ]
}
```

**Veld-opmerkingen:**

- `attachTo: ""` — gecentreerde stap (geen element-markering)
- `page: "/apps/spreed/"` — de app waar de stap bij hoort; de tour opent die eerst. Afwezig of leeg = elke pagina
- `openFirst` — selector van de knop waarop de tour eerst klikt, om het menu te openen waar het element in zit
- `advance` — `button` (of afwezig): een knop Volgende; `click`: de gebruiker klikt op het element om verder te gaan; `input`: Volgende werkt pas als het veld tekst heeft
- `media` — de afbeelding of video van de stap: `file` (een media-id van IntroVox, zoals `<32 hex>.png`), `alt`, `decorative`, `size` (`small`, `full`, `wide`); voor een video ook `playback` (`loop`, `controls`) en `captions`. Alleen een verwijzing naar het bestand: zie [Wat is inbegrepen](#wat-is-inbegrepen)
- `visibleToGroups: []` — zichtbaar voor alle gebruikers
- `visibleToGroups: ["group1", "group2"]` — alleen zichtbaar voor gebruikers in minstens één van deze groepen

## Workflows

### Samenwerking met content-makers

1. **Beheerder** exporteert huidige Engelse stappen
2. **Beheerder** stuurt `introvox_steps_en.json` naar de content-schrijver
3. **Content-schrijver** opent de JSON in een teksteditor, bewerkt titels en teksten, en slaat op
4. **Beheerder** importeert het geüpdatete bestand
5. **Beheerder** test, exporteert daarna opnieuw voor versiebeheer

### Samenwerking met vertalers

Dit patroon is alleen nodig als een beheerder een *eigen override* wil voor een bepaalde taal. De automatisch vertaalde standaardtour komt van Transifex — daarvoor is bijdragen op [Transifex](https://www.transifex.com/nextcloud/nextcloud/) zelf de betere weg, dan hebben alle installaties er iets aan.

Voor eigen tekst op één installatie:

1. **Beheerder** exporteert Engelse stappen als bron
2. **Beheerder** stuurt de JSON naar een vertaler
3. **Vertaler** bewerkt alleen de `title`- en `text`-velden, zet `"language"` op de doeltaal (zoals `"de"`) en retourneert het bestand
4. **Beheerder** importeert het bestand in de stappen-editor van de tour (**Tours** → **Stappen bewerken**); het wordt meteen de override voor die taal

### Multi-instance-deployment

1. **Beheerder** configureert de tours op een development-/staging-instantie
2. **Beheerder** gebruikt **Tour exporteren** in het ⋯-menu van elke tour: één `.zip` per tour, met zijn instellingen, zijn stappen in alle talen, en zijn afbeeldingen en video's
3. **Beheerder** gebruikt **Tour importeren** op de productie-instantie; elke tour komt uitgeschakeld binnen, en de welkomsttour vervangt de stappen van de talen in het bestand. Zie [Een tour naar een andere Nextcloud verhuizen](tours.nl.md#een-tour-naar-een-andere-nextcloud-verhuizen)
4. **Beheerder** zet de tours daar aan

De JSON-bestanden van **Exporteren** werken hier ook voor, één bestand per tour en taal, maar die bevatten geen instellingen en geen afbeeldingen of video's, en een app-tour moet aan de andere kant al bestaan (**Nieuwe tour**).

### Versiebeheer

- Commit geëxporteerde JSON naar een git-repository
- Wijzigingen volgen in de tijd
- Roll back als een configuratie iets breekt
- Configuraties delen als pull requests

## Zie ook

- [Tourstappen beheren](managing-steps.nl.md) — stap-CRUD
- [Tours](tours.nl.md) — de welkomsttour en tours voor apps
- [Groep-gebaseerde zichtbaarheid](group-visibility.nl.md) — `visibleToGroups`-veld
- [Best practices](best-practices.nl.md) — back-up vóór grote wijzigingen
