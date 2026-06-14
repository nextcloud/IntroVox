# Release-proces

> **Let op:** dit is een ontwikkelaars-document voor het uitbrengen van IntroVox-versies. Het wordt onderhouden in het Engels. Zie het [Engelse release-proces](release-process.en.md) voor de volledige stappen en commando's.

## Inleiding

Een IntroVox-release omvat:

- Bumpen van de versie in `appinfo/info.xml` en `package.json`
- Bijwerken van CHANGELOG.md
- Building production-bundles
- Taggen van de commit
- Pushen naar Gitea (primair) en GitHub (mirror)
- Publiceren van een GitHub-release met tarball + handtekening
- Uploaden naar de Nextcloud-App-Store

## Stappen op hoog niveau

1. **Versie-bump** — synchroniseer `info.xml` en `package.json`
2. **CHANGELOG** — voeg nieuwe versie-entry toe met datum en wijzigingen
3. **Build** — `npm run build` voor production-bundles
4. **Commit & tag** — `git commit` + `git tag vX.Y.Z`
5. **Push** — Gitea + GitHub
6. **Tarball** — assembleer met alleen runtime-bestanden
7. **GitHub-release** — `gh release create vX.Y.Z` met tarball
8. **App-Store-upload** — handtekening genereren en submitten

## Voor de complete gids

Zie [release-process.en.md](release-process.en.md) voor:

- Exacte versie-bump-commando's (sed-scripts)
- CHANGELOG-formaat en Keep-a-Changelog-conventies
- Tarball-bestandsstructuur en `tar`-uitsluitingen
- GitHub-release-creatie-commando en notes-format
- Handtekening-generatie (`openssl dgst -sha512 -sign`)
- Post-release-verificatie-checklist

## Zie ook

- [App-Store-publicatie](app-store-submission.md) — final submission-stap
- [Installatie](installation.md) — eindgebruiker-installatie
