# De tour doorlopen

Deze gids legt uit hoe je door de IntroVox-tour navigeert, wat het tour-venster bevat, wat het verschil is tussen gecentreerde en gekoppelde stappen, en hoe stappen werken die je iets laten doen.

## Het tour-venster

Elke stap toont:

**Header**

- **Titel** — waar deze stap over gaat (bv. `📁 Bestanden & apps`)
- **Sluit-knop (✕)** — verlaat de tour zonder hem permanent uit te schakelen

**Inhoud**

- **Beschrijving** — informatie over de feature
- **Nuttige tips** — best practices en sneltoetsen
- **Afbeelding of video** — sommige stappen tonen er een boven de tekst
- **Visuele markeringen** — belangrijke UI-elementen worden omlijnd

**Footer**

- **Terug** — naar de vorige stap
- **Volgende** / **Klaar** — doorgaan, of afronden bij de laatste stap

## Navigeren door stappen

### Vooruit gaan

- Klik op **Volgende**, of druk op de pijltjestoets naar rechts (`→`)

### Terug gaan

- Klik op **Terug**, of druk op de pijltjestoets naar links (`←`)

### Verlaten

- Klik op **✕** rechtsboven
- Of druk op `Escape`
- Zo afsluiten **zet** tours **niet uit**. Deze browser onthoudt het, dus de welkomsttour start hier niet meer vanzelf; in een andere browser of op een ander apparaat wel
- De pagina verversen beëindigt de tour niet: hij gaat verder bij dezelfde stap

## Gemarkeerde elementen

Wanneer een stap een specifiek onderdeel van de Nextcloud-interface markeert:

- Het element heeft een **rand** in de kleur van je thema
- Een **knipperend pijltje** wijst vanaf de stap naar het element
- De rest van het scherm wordt licht **gedimd**

Voorbeeld: wanneer de tour de app Bestanden toont, is het menu-item Bestanden gemarkeerd zodat je het later makkelijk kunt vinden.

## Gecentreerde vs. gekoppelde stappen

Je ziet twee soorten stappen:

### Gecentreerde stappen

- Verschijnen in het midden van je scherm
- Worden gebruikt voor algemene informatie, welkom en afsluiting
- Er wordt geen specifiek element gemarkeerd

### Gekoppelde stappen

- Verschijnen naast een specifiek UI-element
- Wijzen naar features waar je vanaf moet weten
- Tonen precies waar je dingen kunt vinden

### Stappen die wachten

Soms staat het element waar een stap over gaat nog niet op de pagina, bijvoorbeeld omdat je eerst nog iets moet openen of aanmaken. De stap wacht dan met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is, zodat hij de knoppen van het venster vrijlaat). De pagina blijft bruikbaar, en de stap schuift naar het element zodra het verschijnt, hoe lang je er ook over doet. **Volgende** gaat ook zonder het element verder.

Op een telefoon wacht een stap over de navigatie van de app zolang die navigatie dicht is, tot je haar opent.

## Stappen die je iets laten doen

![Een stap die je laat klikken, met de rand en het pijltje](../screenshots/tour-step.png)

Sommige stappen laten je dingen uitproberen in plaats van erover te lezen. Tours voor apps doen dat vaak. Wat je erin maakt is echt: de map, het gesprek of de kaart blijft van jou.

- **Klikken:** de stap zegt "Klik op het gemarkeerde element om verder te gaan." en heeft geen knop **Volgende**. Klik op het element, en de tour gaat vanzelf verder, ook als de klik een andere app opent.
- **Invullen:** de stap zegt "Vul het gemarkeerde veld in om verder te gaan." **Volgende** werkt zodra het veld tekst heeft, zoals de naam van een nieuw gesprek. Terwijl je typt, blijft de focus in het veld.

Staat het element niet op de pagina, dan werkt **Volgende** gewoon, zodat je nooit vastloopt.

## Afbeeldingen en video's

Een stap kan boven zijn tekst een afbeelding, GIF of video tonen. Alles wat beweegt heeft een pauzeknop, en staat stil als je systeem op minder beweging staat. Een video met een afspeelknop start pas als je op afspelen klikt.

## Voltooien vs. sluiten

Er zijn drie manieren om de tour te verlaten, met verschillende gevolgen:

| Actie | Effect |
|---|---|
| **✕ Sluiten** | Tour sluit; deze browser onthoudt het, dus hij start hier niet meer vanzelf, maar in een andere browser wel |
| **Klaar** (laatste stap) | Tour gemarkeerd als voltooid; start niet meer automatisch, maar je kunt hem herstarten via persoonlijke instellingen |
| **Overslaan en niet meer tonen** (eerste stap) | Schakelt auto-start direct uit; zelfde effect als voltooien |

Deze tabel gaat over de welkomsttour. **Klaar** en **Overslaan en niet meer tonen** beëindigen alleen de welkomsttour; tours voor apps starten nog steeds de eerste keer dat je die app opent.

Een tour voor een app start maar één keer vanzelf, dus hoe je hem ook verlaat, hij start daarna niet meer vanzelf. De eerste stap heeft daar **Overslaan** in plaats van **Overslaan en niet meer tonen**.

Om een tour later opnieuw te doen, zie [Persoonlijke instellingen](personal-settings.nl.md).

## Zie ook

- [Overzicht](overview.nl.md) — wat IntroVox is
- [Persoonlijke instellingen](personal-settings.nl.md) — herstarten en uitschakelen
- [Toetsenbord-navigatie](keyboard-navigation.nl.md) — sneltoetsen
- [Mobiel](mobile.nl.md) — op telefoons en tablets
