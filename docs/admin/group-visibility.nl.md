# Groep-gebaseerde stap-zichtbaarheid

*Geïntroduceerd in v1.2.0.*

Groep-gebaseerde stap-zichtbaarheid laat je individuele wizard-stappen beperken tot specifieke Nextcloud-groepen, wat **rol-gebaseerde onboarding** mogelijk maakt — verschillende tours voor verschillende rollen, zonder aparte configuraties bij te houden.

## Hoe het werkt

Elke stap heeft een **Zichtbaar voor groepen**-veld (multi-select-dropdown van alle Nextcloud-groepen):

- **Lege selectie (default)** — stap is zichtbaar voor **alle gebruikers**
- **Eén of meer groepen geselecteerd** — stap is alleen zichtbaar voor gebruikers die lid zijn van **minstens één** van die groepen

Filtering gebeurt **server-side** in [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php), zodat gebruikers verborgen stappen ook niet via browser-developer-tools kunnen zien.

## Groep-zichtbaarheid configureren

1. Klik op **✏️ Bewerken** op een stap
2. Vind de **Zichtbaar voor groepen**-dropdown onder de Positie-selector
3. Selecteer één of meer Nextcloud-groepen
4. Klik op **💾 Opslaan** in het formulier
5. Klik op **💾 Wijzigingen opslaan** bovenaan de stap-lijst om te persisteren

## Use-cases

### Rol-gebaseerde onboarding

| Stap | Zichtbaar voor groepen | Doelgroep |
|---|---|---|
| Welkom | *(leeg)* | Alle gebruikers |
| Bestanden-overzicht | *(leeg)* | Alle gebruikers |
| Admin-paneel | `Administrators` | Alleen admins |
| Geavanceerd zoeken | `Power Users`, `Administrators` | Power users en admins |
| HR-self-service | `HR` | HR-team |
| Dev-tools | `Developers` | Developer-team |

### Afdeling-specifieke tours

Maak één tour met sectie-specifieke stappen:

- Algemene stappen zichtbaar voor iedereen
- HR-specifieke stappen beperkt tot de `HR`-groep
- IT-specifieke stappen beperkt tot de `IT`-groep
- Marketing-specifieke stappen beperkt tot de `Marketing`-groep

### Pilot-groep-uitrol

Bij het testen van nieuwe wizard-content:

1. Maak de nieuwe stappen
2. Beperk ze tot een `Pilot`-groep tijdens het verzamelen van feedback
3. Eenmaal gevalideerd, verwijder de groep-beperking om naar iedereen uit te rollen

### Trainings-niveaus

- **Basis-stappen** (lege groepen) — iedereen ziet ze
- **Geavanceerde stappen** (beperkt tot `Power Users`) — alleen ervaren gebruikers

## Hoe filtering intern werkt

Wanneer de frontend `GET /apps/introvox/api/steps` opvraagt:

1. Backend laadt de stap-configuratie uit `wizard_steps_<lang>`
2. Backend leest de groepen van de huidige gebruiker via `IGroupManager::getUserGroupIds()`
3. Voor elke stap checkt hij of `visibleToGroups` leeg is (zichtbaar voor iedereen) of overlapt met de groepen van de gebruiker
4. Geeft alleen de matchende stappen terug

Dit betekent:

- Gebruikers **ontvangen nooit** verborgen stap-content over de draad — bescherming zit op de API-laag
- Als een gebruiker later aan een groep wordt toegevoegd, zien ze de relevante stappen bij hun volgende wizard-weergave (geen caching van stap-lijsten per gebruiker)

## Opmerkingen en edge-cases

- **Export/Import behoudt groep-instellingen** — `visibleToGroups` wordt opgenomen in de JSON-payload
- **Groep-wijzigingen zijn direct van kracht** — geen cache om te legen, geen admin-actie nodig
- **Lege `visibleToGroups: []`** in geïmporteerde JSON betekent zichtbaar voor iedereen (zelfde als het veld afwezig zijn)
- **Groep-IDs vs. display-namen** — IntroVox gebruikt groep-**IDs**, geen display-namen. De meeste installaties hebben deze gelijk, maar verifieer in **Instellingen → Gebruikers**.

## Best practices

1. **Begin permissief, beperk later** — laat nieuwe stappen aanvankelijk zichtbaar voor iedereen, en voeg groep-beperkingen toe zodra je weet wie wat nodig heeft. Makkelijker dan andersom.
2. **Documenteer je groep-gebruik** — houd notities bij van welke groepen welke stappen gateen zodat toekomstige beheerders de structuur begrijpen.
3. **Test met een niet-admin-account** — groep-filtering werkt server-side, maar alleen door in te loggen als niet-lid kun je de gebruikers-ervaring bevestigen.
4. **Combineer met taal-scheiding** — groep-gebaseerde filtering geldt *binnen* een taal. Om zowel taal als groep te targeten, configureer de stappen van die taal met de relevante groep-beperkingen.

## Alternatieven voor stap-niveau-groep-beperking

| Doel | Aanpak |
|---|---|
| Verberg de hele app voor bepaalde gebruikers | **Instellingen → Apps → IntroVox → Beperken tot groepen** (Nextcloud-niveau) |
| De wizard uitschakelen voor alle gebruikers in een taal | Vink de taal uit in **Beschikbare talen** |
| De wizard globaal uitschakelen | Vink **Wizard inschakelen voor alle gebruikers** uit |
| Verschillende stappen per gebruikers-rol tonen | **Groep-gebaseerde zichtbaarheid** (deze pagina) |

## Zie ook

- [Wizard-stappen beheren](managing-steps.md) — stap-CRUD
- [Stap-zichtbaarheid](../features/step-visibility.md) — groep-filters + gebruikers-voorkeuren
- [API-referentie](../architecture/api-reference.md) — `getWizardSteps`-endpoint met filtering
