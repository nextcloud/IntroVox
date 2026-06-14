# Problemen oplossen (beheerders)

Veelvoorkomende problemen en oplossingen voor IntroVox-beheerders. Voor gebruikers-issues, zie [Gebruikers-troubleshooting](../user/troubleshooting.md).

## Wizard verschijnt niet

**Symptoom:** gebruikers zien de wizard niet bij eerste login.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Wizard globaal uitgeschakeld | Inschakelen in **Instellingen → Beheer → IntroVox** |
| Taal van gebruiker niet ingeschakeld | Schakel de taal in onder **Beschikbare talen** |
| Gebruiker heeft wizard eerder uitgeschakeld | Gebruik **Wizard tonen aan alle gebruikers** om voorkeuren te resetten |
| JavaScript-errors | Check de browser-console (F12); verifieer dat IntroVox-versie compatibel is met je Nextcloud-versie |
| App-menu-readiness-timeout | Versies vóór v1.4.2 konden vastlopen op sommige NC-versies; upgrade naar v1.4.2+ die fallback-selectors en een 10s-timeout toevoegt |

## Stappen worden overgeslagen

**Symptoom:** sommige stappen verschijnen niet tijdens de tour.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Stap uitgeschakeld in admin-paneel | Toggle de stap naar **✅** ingeschakeld |
| Element bestaat niet | Console toont `Wizard: Skipping step 'X' - element not found`. Update de CSS-selector of verwijder `attachTo` om hem gecentreerd te maken |
| App niet geïnstalleerd | Als een Agenda-stap een element target dat alleen bestaat met Agenda ingeschakeld, voeg een fallback-selector toe of schakel de stap alleen in wanneer Agenda is geïnstalleerd |
| Selector kapot na Nextcloud-upgrade | Inspecteer de nieuwe DOM en update de selector. Gebruik meerdere komma-gescheiden fallbacks |
| Pre-v1.4.1-timing-issue | Stappen konden worden overgeslagen als Vue nog niet had gerenderd; v1.4.1+ valt terug op gecentreerde weergave |
| Gebruiker niet in vereiste groepen | Check de **Zichtbaar voor groepen** van de stap — leeg betekent zichtbaar voor iedereen |

## Vertalingen werken niet

**Symptoom:** tekst verschijnt in verkeerde taal of toont vertaling-keys.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Browser-cache | Hard-refresh: `Cmd+Shift+R` / `Ctrl+Shift+R` |
| Taal niet geselecteerd in Nextcloud | Verifieer in **Persoonlijke instellingen → Taal** van de gebruiker |
| Vertaling-bestand ontbreekt | Verifieer dat `l10n/<lang>.json` bestaat in de IntroVox-app-directory |
| App niet herbuild na `l10n`-wijziging | Bij ontwikkelen, draai `python3 regenerate_js_translations.py` daarna `npm run build` |
| Verborgen stappen gestapeld onder huidige stap (v1.4.0–v1.6.0) | Upgrade naar v1.6.1+, die `.nextcloud-wizard-step[hidden] { display: none }` toevoegt |

## Import-/export-issues

**Symptoom:** import faalt of exports zien er leeg uit.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Ongeldig JSON-formaat | Valideer op jsonlint.com; check dat het bestand de verwachte structuur heeft |
| Ontbrekende verplichte velden | Elke stap moet `id`, `title`, `text` hebben. Zie het [Import/Export](import-export.md)-JSON-voorbeeld |
| Verkeerde taalcode | Zorg dat de taalcode in het bestand (bv. `en`, `nl`) overeenkomt met een van je ingeschakelde talen |
| Server-bestand-permissies | Verifieer dat Nextcloud schrijftoegang heeft tot zijn config-directory |

## Verborgen wizard-stappen stapelen achter huidige stap (v1.6.1-fix)

**Symptoom:** eerder getoonde stappen blijven zichtbaar onder de actieve stap.

**Oorzaak:** tussen v1.4.0 en v1.6.0 overschreef `.nextcloud-wizard-step { display: flex }` de browser-default `[hidden] { display: none }`, waardoor door Shepherd verborgen stappen toch boven elkaar werden gerenderd.

**Fix:** upgrade naar v1.6.1+, die de expliciete regel `.nextcloud-wizard-step[hidden] { display: none }` toevoegt.

## `array_filter()`-null-error op `getWizardSteps` (v1.4.3-fix)

**Symptoom:** ingelogde gebruikers krijgen HTTP 500 op `GET /apps/introvox/api/steps`; tour start nooit; onboarding globaal kapot.

**Oorzaak:** vóór v1.4.3, als de `wizard_steps_<lang>`-appconfig-blob bestond maar niet decodede tot een JSON-array (corrupt of legacy niet-array-waarde), crashte `ApiController::getWizardSteps()`.

**Fix:** upgrade naar v1.4.3+. De defensieve `is_array()`-guard zorgt dat de frontend terugvalt op ingebouwde defaults als de config-blob onbruikbaar is.

**Workaround als je niet direct kunt upgraden:** verwijder de problematische `wizard_steps_<lang>`-rij uit de `oc_appconfig`-tabel om fallback naar defaults te forceren.

## Mobiele gebruikers vastgezet in lange stappen (v1.5.0-fix)

**Symptoom:** op telefoons, wanneer stap-content de scherm-hoogte overschrijdt, blokkeert de overlay pagina-scroll maar de stap zelf scrolt ook niet, waardoor de sluit-knop onbereikbaar wordt.

**Oorzaak:** vóór v1.5.0 had de stap-container geen `max-height` en had de body geen interne scroll.

**Fix:** upgrade naar v1.5.0+. De stap heeft nu `max-height: calc(100vh - 32px)` (of `100dvh - 16px` op mobiel), de header/footer zijn vastgezet via `flex-shrink: 0`, en de body scrolt intern.

## Tour blijft oneindig hangen op sommige Nextcloud-versies (v1.4.2-fix)

**Symptoom:** tour start nooit op bepaalde Nextcloud-versies; gebruikers zien helemaal geen wizard.

**Oorzaak:** vóór v1.4.2 gebruikte de app-menu-readiness-check CSS-selectors die niet op elke Nextcloud-versie matchten.

**Fix:** upgrade naar v1.4.2+. Meerdere fallback-selectors plus een 10-seconden-timeout zorgen dat de tour óf start óf netjes faalt.

## CSRF-errors op state-changing admin-endpoints

**Symptoom:** save-/reset-/import-/export-admin-acties falen met CSRF-errors.

**Oorzaak:** v1.5.0 herstelde CSRF-bescherming op 7 POST-endpoints (`saveSteps`, `resetToDefault`, `saveSettings`, `exportSteps`, `importSteps`, `toggleTelemetry`, `sendTelemetryNow`) die voorheen kwetsbaar waren.

**Fix:** zorg dat je admin-paneel-sessie vers is en je de laatste IntroVox-versie gebruikt. Als je custom tooling hebt gebouwd dat deze endpoints direct aanroept, neem het CSRF-token op.

## Debug-logging

Om issues te diagnosticeren:

1. Open de browser-console (F12 → Console-tabblad)
2. Zoek naar:

| Log | Betekenis |
|---|---|
| `🎨 Nextcloud First Use Wizard (Vue 3) initialized` | App succesvol geladen |
| `✅ Wizard initialized with X active steps` | Stappen geladen voor deze gebruiker/taal |
| `⚠️ Wizard: Skipping step 'X' - element not found` | CSS-selector matched niet (pre-v1.4.1) of stap viel terug op gecentreerd (v1.4.1+) |

## Zie ook

- [Gebruikers-troubleshooting](../user/troubleshooting.md) — gebruikers-issues
- [FAQ](faq.md) — veelvoorkomende admin-vragen
- [Best practices](best-practices.md) — preventieve aanbevelingen
