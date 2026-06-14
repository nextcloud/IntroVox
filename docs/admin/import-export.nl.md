# Import & Export

*Geïntroduceerd in v1.1.0.*

Import/Export laat je wizard-stappen downloaden als JSON en later weer uploaden. Dit maakt mogelijk:

- **Samenwerking** met content-schrijvers, vertalers en andere beheerders
- **Versiebeheer** (JSON committen naar git, wijzigingen volgen in de tijd)
- **Multi-instance-deployment** (één keer configureren, overal uitrollen)
- **Back-ups** voor het maken van grote wijzigingen

## Wizard-stappen exporteren

### Hoe te exporteren

1. Selecteer de taal om te exporteren uit de taal-dropdown
2. Klik op de **📥 Exporteren**-knop bovenaan de stap-lijst
3. Een JSON-bestand wordt automatisch gedownload

**Bestandsnaam-formaat:** `introvox-steps-{taal}-{timestamp}.json`

**Voorbeeld:** Engels exporteren op 15 jan 2025 levert `introvox-steps-en-2025-01-15-143022.json` op.

### Wat is inbegrepen

- Alle wizard-stappen voor de geselecteerde taal
- Stap-IDs, titels, HTML-tekst-content
- CSS-selectors (`attachTo`) en posities
- In-/uitgeschakelde status
- Stap-volgorde
- Groep-zichtbaarheid (`visibleToGroups`)

## Wizard-stappen importeren

### Hoe te importeren

1. Selecteer de **doel-taal** uit de taal-dropdown
2. Klik op de **📤 Importeren**-knop
3. Kies een JSON-bestand van je computer
4. Je ziet een succesbericht: *"Succesvol X stappen geïmporteerd voor taal Y"*

### Belangrijke opmerkingen

- ⚠️ **Importeren vervangt alle bestaande stappen** voor die taal
- ✅ Alleen de geselecteerde taal wordt geraakt — veilig voor multi-taal-setups
- ✅ De JSON wordt gevalideerd voor toepassen
- 💾 Auto-save — wijzigingen zijn direct actief na succesvolle import

### Validatie

De import valideert:

- JSON-syntax is correct
- Verplichte velden zijn aanwezig (`id`, `title`, `text`)
- Datatypes kloppen
- Geen dubbele stap-IDs binnen het bestand

### Foutmeldingen

Als import faalt zie je een specifieke fout:

- `Fout bij importeren stappen: ongeldig JSON-formaat`
- `Fout bij importeren stappen: ontbrekend verplicht veld 'id' in stap 3`
- `Fout bij importeren stappen: {specifieke fout}`

## JSON-bestandsstructuur

```json
[
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
```

**Veld-opmerkingen:**

- `attachTo: ""` — gecentreerde stap (geen element-markering)
- `visibleToGroups: []` — zichtbaar voor alle gebruikers
- `visibleToGroups: ["group1", "group2"]` — alleen zichtbaar voor gebruikers in minstens één van deze groepen

## Workflows

### Samenwerking met content-makers

1. **Beheerder** exporteert huidige Engelse stappen
2. **Beheerder** stuurt `introvox-steps-en-2025-01-15.json` naar de content-schrijver
3. **Content-schrijver** opent de JSON in een teksteditor, bewerkt titels en beschrijvingen, slaat op als `introvox-steps-en-updated.json`
4. **Beheerder** importeert het geüpdatete bestand
5. **Beheerder** test, exporteert daarna opnieuw voor versiebeheer

### Samenwerking met vertalers

1. **Beheerder** exporteert Engelse stappen als bron
2. **Beheerder** stuurt de JSON naar een vertaler
3. **Vertaler** bewerkt alleen de `title`- en `text`-velden, retourneert het bestand
4. **Beheerder** selecteert de doel-taal, importeert het bestand
5. **Beheerder** schakelt de taal in via **Beschikbare talen**

### Multi-instance-deployment

1. **Beheerder** configureert wizard op een development-/staging-instantie
2. **Beheerder** exporteert alle talen (één bestand per taal)
3. **Beheerder** importeert ze op de productie-instantie
4. Consistente gebruikers-ervaring in alle omgevingen

### Versiebeheer

- Commit geëxporteerde JSON naar een git-repository
- Wijzigingen volgen in de tijd
- Roll back als een configuratie iets breekt
- Configuraties delen als pull requests

## Zie ook

- [Wizard-stappen beheren](managing-steps.md) — stap-CRUD
- [Groep-gebaseerde zichtbaarheid](group-visibility.md) — `visibleToGroups`-veld
- [Best practices](best-practices.md) — back-up vóór grote wijzigingen
