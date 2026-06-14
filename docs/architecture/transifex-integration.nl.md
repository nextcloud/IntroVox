# Transifex-integratie

> **Let op:** de complete Transifex-integratie-documentatie is uitvoerig technisch en wordt onderhouden in het Engels. Voor de actuele bestand-conventies, sync-bot-details en code-voorbeelden, raadpleeg de [Engelse Transifex-integratie](transifex-integration.en.md).

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
    │ (5) IntroVox auto-detecteert de taal
    ▼
"Beschikbare talen"-checklist
    │
    │ (6) beheerder schakelt de taal in
    ▼
Gebruikers met die NC-taal-instelling zien de wizard in hun taal
```

## Vereiste bestanden

Deze bestanden zijn aanwezig in de IntroVox-repository en configureren Transifex-sync:

| Bestand | Doel |
|---|---|
| `.tx/config` | Transifex-resource-configuratie (PO-formaat) |
| `l10n/.gitkeep` | Houdt `l10n/`-directory getrackt in git ook voordat vertalingen landen |
| `.l10nignore` | Uitsluitingen voor de Nextcloud-l10n-sync-bot |

## Auto-discovery

- **Taal-code-discovery**: `scandir('l10n/')` matched `<lang>.json`-bestanden
- **Taal-display-namen**: via `OCP\L10N\IFactory::getLanguages()` (v1.6.0+)

## Voor de complete referentie

Zie [transifex-integration.en.md](transifex-integration.en.md) voor:

- Volledige `.tx/config`-syntax en resource-mapping
- Python regenerate-script (`regenerate_js_translations.py`)
- Sync-bot-PR-conventies
- l10n-bestand-formaat (JSON/JS-key-conventies)
- Default-stap-vertaal-flow (msgid-conventies sinds v1.6.0)
- Edge-cases bij regio-varianten (`en_US`, `pt_BR`)

## Zie ook

- [Meertaligheid](../features/multi-language.md) — admin-perspectief
- [Talenbeheer](../admin/language-management.md) — talen in-/uitschakelen
- [Architectuur-overzicht](overview.md) — systeem-design
