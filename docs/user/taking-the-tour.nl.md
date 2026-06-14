# De tour doorlopen

Deze gids legt uit hoe je door de IntroVox-tour navigeert, wat het tour-venster bevat en wat het verschil is tussen gecentreerde en gekoppelde stappen.

## Het tour-venster

Elke stap toont:

**Header**

- **Titel** — waar deze stap over gaat (bv. `📁 Bestanden`)
- **Sluit-knop (✕)** — verlaat de tour zonder hem permanent uit te schakelen

**Inhoud**

- **Beschrijving** — informatie over de feature
- **Nuttige tips** — best practices en sneltoetsen
- **Visuele markeringen** — belangrijke UI-elementen worden omlijnd

**Footer**

- **Terug** — naar de vorige stap
- **Volgende** / **Klaar** — doorgaan, of afronden bij de laatste stap

## Navigeren door stappen

### Vooruit gaan

- Klik op **Volgende**, of druk op `Enter`

### Terug gaan

- Klik op **Terug**, of druk op `Backspace`

### Verlaten

- Klik op **✕** rechtsboven
- Of druk op `Escape`
- Zo afsluiten **schakelt** de tour **niet uit** — hij verschijnt opnieuw bij de volgende login

## Gemarkeerde elementen

Wanneer een stap een specifiek onderdeel van de Nextcloud-interface markeert:

- Het element heeft een **glimmende blauwe rand**
- De rest van het scherm wordt licht **gedimd**
- Je kunt nog steeds op het gemarkeerde element **klikken** als je het wilt uitproberen

Voorbeeld: wanneer de tour de Files-app toont, is het Files-menu-item gemarkeerd zodat je het later makkelijk kunt vinden.

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

Als een doel-element niet bestaat (bv. je Nextcloud heeft die app niet geïnstalleerd), valt de tour automatisch terug op een gecentreerde weergave in plaats van de stap over te slaan (sinds v1.4.1).

## Voltooien vs. sluiten

Er zijn drie manieren om de tour te verlaten, met verschillende gevolgen:

| Actie | Effect |
|---|---|
| **✕ Sluiten** | Tour sluit; verschijnt opnieuw bij volgende login |
| **Klaar** (laatste stap) | Tour gemarkeerd als voltooid; start niet meer automatisch, maar je kunt hem herstarten via persoonlijke instellingen |
| **Overslaan en niet meer tonen** (eerste stap) | Schakelt auto-start direct uit; zelfde effect als voltooien |

Om de tour later opnieuw te doen, zie [Persoonlijke instellingen](personal-settings.md).

## Zie ook

- [Overzicht](overview.md) — wat IntroVox is
- [Persoonlijke instellingen](personal-settings.md) — herstarten en uitschakelen
- [Toetsenbord-navigatie](keyboard-navigation.md) — sneltoetsen
- [Mobiel](mobile.md) — op telefoons en tablets
