# Transifex-integratie

> **Let op:** de complete Transifex-integratie-documentatie is uitvoerig technisch en wordt onderhouden in het Engels. Voor de actuele bestand-conventies, sync-bot-details en code-voorbeelden, raadpleeg de [Engelse Transifex-integratie](transifex-integration.md).

## Inleiding

IntroVox doet mee in de centrale [Transifex](https://www.transifex.com/nextcloud/nextcloud/)-vertaal-pool van Nextcloud sinds v1.6.0. Dit document beschrijft de vertaal-workflow, de bestand-conventies en de auto-discovery-mechanismen waardoor nieuwe talen verschijnen zonder code-wijzigingen.

## Vertaal-flow

```
Vertaler op Transifex
    │
    │ (1) vertaalt strings
    ▼
Transifex-resource
    │
    │ (2) NC-l10n-sync-bot trekt vertalingen op
    ▼
GitHub-PR / directe commit
    │  l10n/<lang>.json + l10n/<lang>.js
    │
    │ (3) gemerged in IntroVox-repo
    ▼
Volgende IntroVox-release
    │
    │ (4) tarball bevat nieuwe taal-bestanden
    ▼
Nextcloud-instantie van beheerder
    │
    │ (5) Gebruikers met die NC-taal zien de wizard vanzelf vertaald, de beheerder hoeft niets te doen
    ▼
Gebruiker ziet de tour in zijn taal
```

Sinds v1.7.0 zet een beheerder geen talen meer aan: elke vertaling die in `l10n/` meekomt, werkt meteen. Een beheerder doet alleen iets als hij een **override** voor een taal wil: eigen tekst die de automatisch vertaalde standaardtekst voor die ene taal vervangt.

## Vereiste bestanden

Deze bestanden zijn aanwezig in de IntroVox-repository en configureren Transifex-sync:

| Bestand | Doel |
|---|---|
| `.tx/config` | Transifex-resource-configuratie (PO-formaat) |
| `l10n/.gitkeep` | Houdt `l10n/`-directory getrackt in git ook voordat vertalingen landen |
| `.l10nignore` | Uitsluitingen voor de Nextcloud-l10n-sync-bot |

## Auto-discovery

- **Taal-display-namen** (v1.6.0+): de keuzelijst van **Add language override** haalt de namen uit `OCP\L10N\IFactory::getLanguages()`. Elke taal die Nextcloud kent, is te kiezen, ook een taal die IntroVox nog niet vertaald heeft.
- **Welke vertaling**: `ApiController::getWizardSteps()` neemt de taal van de gebruiker met `IFactory::findLanguage(null)` (bewust niet `findLanguage('introvox')`). `DefaultStepsService::getForLanguage()` maakt de acht standaardstappen in die taal, en in het Engels als er geen vertaalbestand voor is, nooit in de standaardtaal van het systeem.
- **Ingebouwde tours** (sinds 2.0.0): de tours voor Files, Talk, Deck en Calendar worden net zo via Transifex vertaald (`BuiltinTours::stepsIn()` met `$l->t()`).

2.0.0 is uitgebracht met een eigen pull van Transifex, gemaakt op de releasedag (21 oktober 2026): elke taal met vertalingen, ook die onder 25%.

## Voor de complete referentie

Zie de [Engelse Transifex-integratie](transifex-integration.md) voor:

- Engelse bronteksten als Transifex-msgids (sinds v1.6.0)
- De vertaalde instructies voor het installeren als app (PWA)
- Vertalingen lokaal bijwerken met `scripts/sync-translations.sh` (`tx pull` en `scripts/po2l10n.py`, dat `l10n/<lang>.js` en `.json` schrijft zoals de bot van Nextcloud)
- Waarom 2.0.0 met een eigen pull van Transifex is uitgebracht
- `DefaultStepsService` (sinds v1.7.0) en waarom de browser de standaardstappen niet meer zelf vertaalt
- Een nieuwe taal toevoegen: via Transifex, of als override van een beheerder

## Zie ook

- [Meertaligheid](../features/multi-language.nl.md): hoe de talen werken
- [Talenbeheer](../admin/language-management.nl.md): overrides beheren
- [Frontend-architectuur](frontend-architecture.nl.md): hoe vertalingen in de browser laden
