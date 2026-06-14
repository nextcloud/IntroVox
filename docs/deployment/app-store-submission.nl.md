# App-Store-publicatie

> **Let op:** dit is een ontwikkelaars-document voor het publiceren van IntroVox-releases naar de Nextcloud-App-Store. Het wordt onderhouden in het Engels. Zie de [Engelse App-Store-publicatie-gids](app-store-submission.en.md) voor de volledige checklist en tooling-details.

## Inleiding

De Nextcloud-App-Store distribueert IntroVox naar duizenden Nextcloud-installaties. Releases vereisen:

- Een ondertekende tarball met de juiste structuur
- Een geldige `appinfo/info.xml` met versie en compatibiliteits-declaraties
- Manual-upload of API-submission via apps.nextcloud.com

## Stappen op hoog niveau

1. **Versie-sync** — `appinfo/info.xml`, `package.json`, en CHANGELOG.md hetzelfde
2. **Production build** — `npm run build`
3. **Tarball samenstellen** — alleen runtime-bestanden (geen `src/`, geen `node_modules/`)
4. **Signing** — met de IntroVox-signing-key (gewoon `intravox-style` voor consistentie)
5. **GitHub-release** — upload tarball + handtekening
6. **App-Store-upload** — apps.nextcloud.com/developer/apps/releases/new

## Voor de complete checklist

Zie [app-store-submission.en.md](app-store-submission.en.md) voor:

- Tarball-bestandsstructuur en -uitsluitingen
- `openssl dgst -sha512 -sign`-handtekening-commando
- App-Store-upload-formulier-velden
- GitHub-release-naam-conventies en CHANGELOG-koppeling
- Troubleshooting voor afgewezen submissions

## Zie ook

- [Release-proces](release-process.md) — versie-bump, build, tag-flow
- [Installatie](installation.md) — eindgebruiker-installatie
