# Talenbeheer

IntroVox ondersteunt volledig gescheiden wizard-stappen per taal. Je kunt verschillende content configureren per taal, specifieke talen in-/uitschakelen, en nieuwe talen toevoegen via Transifex-vertalingen.

## Ondersteunde talen

Out-of-the-box bevat IntroVox:

- 🇬🇧 Engels (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Duits (`de`)
- 🇫🇷 Frans (`fr`)
- 🇩🇰 Deens (`da`)
- 🇸🇪 Zweeds (`sv`)

Extra talen kunnen zonder code-wijzigingen worden toegevoegd — zie [Nieuwe talen toevoegen](#nieuwe-talen-toevoegen) en [Meertaligheid](../features/multi-language.md).

## Talen in- en uitschakelen

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Vink in de sectie **Beschikbare talen** talen aan of uit
3. De instelling wordt automatisch opgeslagen bij elke wijziging

**Beperkingen:**

- Er moet minstens één taal ingeschakeld blijven (de laatste ingeschakelde taal kan niet worden uitgeschakeld)
- Default bij eerste installatie: alleen Engels is ingeschakeld

**Effect van een taal uitschakelen:**

- Gebruikers met die taal als Nextcloud-taal-instelling kunnen de wizard niet zien
- In persoonlijke instellingen zien ze: *"De introductie-tour is niet beschikbaar in je taal."*

## Hoe taal-detectie werkt

Wanneer een gebruiker inlogt, doet IntroVox:

1. Leest de Nextcloud-taalcode van de gebruiker via `IL10N::getLanguageCode()`
2. Extraheert de base-taal (`en_US` → `en`)
3. Scant `l10n/` om alle talen te ontdekken die een `<lang>.json`-bestand hebben
4. Checkt of de base-taal in de **Beschikbare talen**-allowlist staat
5. Laadt `wizard_steps_<lang>` uit appconfig, valt terug op defaults als niet geconfigureerd
6. Valt terug op Engels als de taal van de gebruiker niet beschikbaar is

Zie [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) voor de implementatie.

## Per-taal-stap-configuratie

Elke taal heeft zijn eigen onafhankelijke set wizard-stappen. Om stappen voor een specifieke taal te bewerken:

1. Klik onder **Taal-instellingen** op de taal-dropdown
2. Kies een taal (alleen ingeschakelde talen verschijnen)
3. De stap-lijst herlaadt met de configuratie van die taal
4. Maak je wijzigingen
5. Klik op **💾 Wijzigingen opslaan** om te persisteren

> **Waarschuwing:** van taal wisselen met niet-opgeslagen wijzigingen verliest deze — je krijgt een bevestigings-dialoog.

**Voorbeeld use-cases:**

- **Regio-specifieke tips**: Nederlandse gebruikers krijgen stappen die Nederlandse Nextcloud-cloudproviders noemen; internationale gebruikers zien generieke stappen.
- **Culturele adaptatie**: pas toon, voorbeelden of emoji-gebruik aan per taal.
- **Vertaal-controle**: geef de JSON van elke taal aan een vertaler; her-importeer als klaar.

## Eén taal resetten

Om alleen één taal naar defaults te resetten:

1. Selecteer de taal uit de dropdown
2. Klik op **🔄 Reset naar default**
3. Bevestig

Alleen `wizard_steps_<lang>` van die taal wordt gereset; andere talen blijven onveranderd.

## Nieuwe talen toevoegen

IntroVox detecteert talen automatisch vanuit de `l10n/`-directory — geen code-wijzigingen nodig.

1. Bezoek het [Nextcloud-Transifex-project](https://www.transifex.com/nextcloud/nextcloud/) en draag bij of download vertalingen voor IntroVox
2. Plaats het resulterende `l10n/<lang>.json`-bestand in de app-directory
3. De nieuwe taal verschijnt automatisch in de **Beschikbare talen**-checkboxes
4. Schakel hem in en pas optioneel zijn wizard-stappen aan

Voor de volledige Transifex-flow zie [Transifex-integratie](../architecture/transifex-integration.md).

## Default-stap-content per taal

Wanneer een taal geen custom-configuratie heeft, gebruikt IntroVox ingebouwde default-stappen gewrapped in `t('introvox', '<English source>')`. Vanaf v1.6.0 dienen deze source-strings als Transifex-msgids, zodat vertalers de daadwerkelijke Engelse content zien in plaats van opaque keys zoals `step_welcome_title`.

De defaults dekken:

- Welkom bij Nextcloud
- Bestand-beheer
- Agenda
- Zoek-functionaliteit
- Belangrijke features
- Nuttige tips
- Afsluiting

## Zie ook

- [Meertaligheid](../features/multi-language.md) — Transifex-integratie-details
- [Transifex-integratie](../architecture/transifex-integration.md) — l10n-workflow
- [Wizard-stappen beheren](managing-steps.md) — stappen bewerken per taal
- [Instellingen](settings.md) — beschikbare-talen-referentie
