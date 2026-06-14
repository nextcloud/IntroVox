# Meertaligheid

IntroVox ondersteunt gescheiden wizard-configuraties per taal, automatische detectie van gebruikers-taal-voorkeuren en Transifex-gebaseerde community-vertalingen.

## Out-of-the-box ondersteunde talen

- 🇬🇧 Engels (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Duits (`de`)
- 🇫🇷 Frans (`fr`)
- 🇩🇰 Deens (`da`)
- 🇸🇪 Zweeds (`sv`)

Extra talen kunnen zonder code-wijzigingen worden toegevoegd — zie [Transifex-integratie](#transifex-integratie-v160) hieronder.

## Automatische taal-detectie

Wanneer een gebruiker inlogt, gebruikt IntroVox Nextcloud's `IL10N::getLanguageCode()` om hun taal te detecteren, extraheert de base-code (bv. `en_US` → `en`), en:

- Laadt `wizard_steps_<lang>` uit appconfig (als de taal is ingeschakeld), of
- Geeft `languageDisabled: true` terug zodat de persoonlijke-instellingen-pagina het "niet beschikbaar in je taal"-bericht kan tonen

Zie [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) voor de implementatie.

## Per-taal-configuratie

Elke ingeschakelde taal heeft zijn eigen onafhankelijke `wizard_steps_<lang>`-config-blob, bereikbaar via de taal-dropdown van het admin-paneel. Beheerders kunnen:

- Stap-content per taal aanpassen
- Alleen één taal resetten zonder andere te raken
- Stappen per taal exporteren/importeren

Zie [Talenbeheer](../admin/language-management.md) en [Wizard-stappen beheren](../admin/managing-steps.md).

## Transifex-integratie (v1.6.0+)

Vanaf v1.6.0 doet IntroVox mee in de centrale Transifex-vertaal-pool van Nextcloud.

### Vereiste bestanden (al aanwezig)

- **`.tx/config`** — Transifex-resource-configuratie (PO-formaat)
- **`l10n/.gitkeep`** — houdt de directory getrackt zelfs als hij leeg is
- **`.l10nignore`** — uitsluitingen voor de Nextcloud-l10n-sync-bot

### Hoe nieuwe talen landen

1. Een community-vertaler draagt vertalingen bij op [Transifex](https://www.transifex.com/nextcloud/nextcloud/)
2. De Nextcloud-l10n-sync-bot pikt de nieuwe vertalingen op en commit een `l10n/<lang>.json`- (en `.js`-)bestand
3. Bij de volgende IntroVox-release wordt de nieuwe taal mee-gebundled in de tarball
4. IntroVox' [taal-auto-discovery](../admin/language-management.md#nieuwe-talen-toevoegen) pikt hem automatisch op — geen code-wijzigingen nodig
5. Beheerders kunnen de nieuwe taal inschakelen via **Beschikbare talen** en zijn stappen aanpassen

### Auto-discovery van taal-display-namen (v1.6.0+)

Taal-picker-labels (bv. "Nederlands", "Português") komen uit `OCP\L10N\IFactory::getLanguages()`. Elke nieuwe taal die vanuit Transifex wordt gesynchroniseerd verschijnt automatisch in de admin-dropdown met zijn correcte lokale naam.

De picker toont native namen zonder emoji-vlaggen, in lijn met de Nextcloud-Instellingen-conventie.

### Engels als Transifex-bron

Vóór v1.6.0 ging default-stap-content via opaque keys zoals `step_welcome_title`, wat onbruikbare msgids aan vertalers toonde. Sinds v1.6.0 wordt default-content gewrapped in `t('introvox', '<Engelse bron>')`, zodat vertalers de daadwerkelijke Engelse tekst als msgid zien.

Bestaande custom-stap-content (opgeslagen in `oc_appconfig.wizard_steps_<lang>`) wordt door deze wijziging niet geraakt.

### Per-onderwerp-vertaal-pools (v1.6.0+)

De Transifex-resource bevat:

- Alle admin- en persoonlijke-instellingen-UI-strings
- Default wizard-stap-titels/tekst (16 stappen)
- ~50 PWA-installatie-instructie-strings die alle 9 OS-/browser-combinaties dekken
- Het "Got it"-knop-label op de PWA-stap (voorheen hardcoded Nederlands als "Begrepen")

## Talen handmatig toevoegen

Als je niet op Transifex-sync kunt wachten, kun je een vertaling-bestand direct neerzetten:

1. Maak `l10n/<lang>.json` aan (bv. `pt_BR.json`) volgens het Nextcloud-vertaal-formaat
2. Plaats het in IntroVox' `l10n/`-directory
3. Herstart Nextcloud (of wacht op app-cache-refresh)
4. De nieuwe taal verschijnt in **Beschikbare talen**

Voor custom talen die niet in de default-lijst staan, moet je ook de taalcode toevoegen aan `AdminController::getAvailableLanguages()` en defaults leveren via `AdminController::getDefaultStepsForLanguage()`. De Transifex-flow heeft de voorkeur om deze code-wijziging te vermijden.

## Fallback-strategie

| Gebruikers-taal | IntroVox-response |
|---|---|
| In `enabled_languages` en heeft `l10n/<lang>.json` | Toont stappen in die taal |
| Heeft `l10n/<lang>.json` maar **niet** in `enabled_languages` | Geeft `languageDisabled: true` terug; tour start niet |
| Niet in `enabled_languages` en geen `l10n/<lang>.json` | Valt terug op Engelse stappen |

Dit bewuste ontwerp vermijdt verrassingen door de tour in een onbekende taal te tonen — gebruikers zien in plaats daarvan de duidelijke "niet beschikbaar in je taal"-melding.

## Zie ook

- [Talenbeheer](../admin/language-management.md) — talen in-/uitschakelen
- [Transifex-integratie](../architecture/transifex-integration.md) — vertaal-workflow
- [API-referentie](../architecture/api-reference.md) — taal-bewuste endpoints
