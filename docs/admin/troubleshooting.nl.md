# Problemen oplossen (beheerders)

Veelvoorkomende problemen en oplossingen voor IntroVox-beheerders. Voor gebruikers-issues, zie [Gebruikers-troubleshooting](../user/troubleshooting.md).

## Welkomsttour verschijnt niet

**Symptoom:** gebruikers krijgen de welkomsttour niet bij hun eerste login.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Tours staan voor iedereen uit | Zet **Tours for everyone** aan in **Instellingen → Beheer → IntroVox** |
| De welkomsttour staat uit | Zet hem aan in de lijst **Tours** |
| Geen enkele stap van de welkomsttour is voor deze gebruiker | Elke stap staat uit, of is beperkt tot groepen waar de gebruiker niet in zit. Controleer **Zichtbaar voor groepen**, of gebruik **Preview as** in **Preview tour** |
| Gebruiker heeft de welkomsttour afgemaakt of overgeslagen, of in deze browser gesloten | Gebruik **Show again to everyone** in het ⋯-menu van de welkomsttour onder **Tours** om hem iedereen opnieuw te geven |
| Gebruiker heeft **Start tours by themselves** uitgezet | Alleen de gebruiker kan die weer aanzetten, in **Persoonlijke instellingen → IntroVox**; **Show again to everyone** verandert er niets aan. Zelf tours starten kan daar nog wel |
| JavaScript-errors | Check de browser-console (F12); verifieer dat IntroVox-versie compatibel is met je Nextcloud-versie |
| App-menu-readiness-timeout | Versies vóór v1.4.2 konden vastlopen op sommige NC-versies; upgrade naar v1.4.2+ die fallback-selectors en een 10s-timeout toevoegt |

## Tour voor een app start niet

**Symptoom:** gebruikers openen een app die een tour heeft, maar de tour start niet.

| Mogelijke oorzaak | Oplossing |
|---|---|
| De tour staat uit | Zet hem aan onder **Tours**; dat kan zodra hij een stap in zijn hoofdtaal heeft |
| **Tours for everyone** staat uit | Zet hem aan onder **Settings** |
| Gebruiker zit niet in de groepen van de tour, of kan de app niet openen | Controleer **Visible to** onder **Tour settings**, en de groepsbeperking van de app zelf |
| Gebruiker heeft de tour al gezien, in welke browser dan ook | Zo hoort het: hij start één keer vanzelf. Gebruik **Show again to everyone** bij de tour, of de gebruiker klikt op **Start again** in **Persoonlijke instellingen → IntroVox** |
| Gebruiker heeft de welkomsttour nog niet gehad | Zo hoort het: de welkomsttour komt eerst, de app-tour bij een later bezoek |
| **Who gets it** staat op **New accounts only**, en de gebruiker logde voor het eerst in voordat de tour voor het eerst aanging | Zet **Who gets it** op **Everyone** onder **Tour settings** |
| Gebruiker heeft **Start tours by themselves** uitgezet | De gebruiker kan de tour nog wel starten met **Start** in **Persoonlijke instellingen → IntroVox** |

Zie [Tours](tours.nl.md) voor wanneer een tour start.

## Stappen ontbreken of wachten in de hoek

**Symptoom:** sommige stappen verschijnen niet tijdens de tour, of een stap staat rechtsonder in plaats van bij zijn element.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Stap uitgeschakeld in admin-paneel | Toggle de stap naar **✅** ingeschakeld |
| Element staat niet op de pagina | De stap wacht met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is), en schuift naar het element zodra het verschijnt; **Next** gaat gewoon verder. Controleer de selector met **Test this step**, kies hem opnieuw met **Pick element**, of gebruik **Remove element** voor een gecentreerde stap |
| Element verschijnt pas als de gebruiker iets doet | Zo hoort het: de stap wacht tot het er is. Wijs de weg met één stap per klik, zie [Stappen die op de gebruiker wachten](managing-steps.nl.md#stappen-die-op-de-gebruiker-wachten) |
| De **Page** van de stap is een app die de gebruiker niet kan openen | De stap valt weg voor die gebruiker. Beperk hem met **Zichtbaar voor groepen** tot wie de app heeft |
| Selector kapot na Nextcloud-upgrade | Inspecteer de nieuwe DOM en update de selector. Gebruik meerdere komma-gescheiden fallbacks; de tour probeert ze in de volgorde waarin ze staan |
| Pre-v1.4.1-timing-issue | Stappen konden worden overgeslagen als Vue nog niet had gerenderd; nu wacht een stap op zijn element |
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

## Een stap controleren

IntroVox schrijft niets naar de browser-console. Zo zie je wat een stap doet:

- **Test this step** in de stap-editor toont die ene stap, inclusief niet-opgeslagen wijzigingen. **Preview tour** speelt de hele tour af; **Preview as** toont wat leden van één groep krijgen.
- Een stap die rechtsonder staat in plaats van bij zijn element, heeft dat element niet gevonden. Hij wacht daar tot het element verschijnt.
- Een selector met de hand controleren: open de browser-console (F12 → Console) en test elke selector van de lijst apart met `document.querySelector('…')`.
- Fouten, zoals een verzoek dat mislukte, staan nog wel in de console en onder F12 → Network.

## Zie ook

- [Gebruikers-troubleshooting](../user/troubleshooting.md) — gebruikers-issues
- [FAQ](faq.md) — veelvoorkomende admin-vragen
- [Best practices](best-practices.md) — preventieve aanbevelingen
