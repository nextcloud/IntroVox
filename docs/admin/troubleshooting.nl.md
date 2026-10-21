# Problemen oplossen (beheerders)

Veelvoorkomende problemen en oplossingen voor IntroVox-beheerders. Voor gebruikers-issues, zie [Gebruikers-troubleshooting](../user/troubleshooting.nl.md).

## Welkomsttour verschijnt niet

**Symptoom:** gebruikers krijgen de welkomsttour niet bij hun eerste login.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Tours staan voor iedereen uit | Zet **Tours for everyone** aan in **Instellingen → Beheer → IntroVox** |
| De welkomsttour staat uit | Zet hem aan in de lijst **Tours** |
| Geen enkele stap van de welkomsttour is voor deze gebruiker | Elke stap staat uit, of is beperkt tot groepen waar de gebruiker niet in zit. Controleer **Zichtbaar voor groepen**, of gebruik **Bekijken als** in **Tour bekijken** |
| Gebruiker heeft de welkomsttour afgemaakt of overgeslagen, of in deze browser gesloten | Gebruik **Show again to everyone** in het ⋯-menu van de welkomsttour onder **Tours** om hem iedereen opnieuw te geven |
| Gebruiker heeft **Start tours by themselves** uitgezet | Alleen de gebruiker kan die weer aanzetten, in **Persoonlijke instellingen → IntroVox**; **Show again to everyone** verandert er niets aan. Zelf tours starten kan daar nog wel |
| JavaScript-errors | Check de browser-console (F12); verifieer dat IntroVox-versie compatibel is met je Nextcloud-versie |
| App-menu-readiness-timeout | Versies vóór v1.4.2 konden vastlopen op sommige NC-versies; upgrade naar v1.4.2+ die fallback-selectors en een 10s-timeout toevoegt |

## Tour voor een app start niet

**Symptoom:** gebruikers openen een app die een tour heeft, maar de tour start niet.

| Mogelijke oorzaak | Oplossing |
|---|---|
| De tour staat uit | Zet hem aan onder **Tours**; dat kan zodra hij een stap in zijn hoofdtaal heeft |
| **Tours for everyone** staat uit | Zet hem aan onder **Instellingen** |
| Gebruiker zit niet in de groepen van de tour, of kan de app niet openen | Controleer **Zichtbaar voor** onder **Tour settings**, en de groepsbeperking van de app zelf |
| Gebruiker heeft de tour al gezien, in welke browser dan ook | Zo hoort het: hij start één keer vanzelf. Gebruik **Show again to everyone** bij de tour, of de gebruiker klikt op **Start again** in **Persoonlijke instellingen → IntroVox** |
| Gebruiker heeft de welkomsttour nog niet gehad | Zo hoort het: de welkomsttour komt eerst, de app-tour bij een later bezoek |
| **Who gets it** staat op **Alleen nieuwe accounts**, en de gebruiker logde voor het eerst in voordat de tour voor het eerst aanging | Zet **Who gets it** op **Iedereen** onder **Tour settings** |
| Gebruiker heeft **Start tours by themselves** uitgezet | De gebruiker kan de tour nog wel starten met **Start** in **Persoonlijke instellingen → IntroVox** |

Zie [Tours](tours.nl.md) voor wanneer een tour start.

## Stappen ontbreken of wachten in de hoek

**Symptoom:** sommige stappen verschijnen niet tijdens de tour, of een stap staat rechtsonder in plaats van bij zijn element.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Stap uitgeschakeld in admin-paneel | Zet de stap aan met zijn schakelaar in de stappenlijst |
| Element staat niet op de pagina | De stap wacht met zijn tekst rechtsonder opzij (linksonder zolang er een venster open is), en schuift naar het element zodra het verschijnt; **Volgende** gaat gewoon verder. Controleer de selector met **Test this step**, kies hem opnieuw met **Element kiezen**, of gebruik **Remove element** voor een gecentreerde stap |
| Element verschijnt pas als de gebruiker iets doet | Zo hoort het: de stap wacht tot het er is. Wijs de weg met één stap per klik, zie [Stappen die op de gebruiker wachten](managing-steps.nl.md#stappen-die-op-de-gebruiker-wachten) |
| De **Pagina** van de stap is een app die de gebruiker niet kan openen | De stap valt weg voor die gebruiker. Beperk hem met **Zichtbaar voor groepen** tot wie de app heeft |
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
| App niet herbuild na `l10n`-wijziging | Bij ontwikkelen, draai `python3 scripts/po2l10n.py` daarna `npm run build` |
| Verborgen stappen gestapeld onder huidige stap (v1.4.0–v1.6.0) | Upgrade naar v1.6.1+, die `.nextcloud-wizard-step[hidden] { display: none }` toevoegt |

## Import-/export-issues

**Symptoom:** import faalt of exports zien er leeg uit.

| Mogelijke oorzaak | Oplossing |
|---|---|
| Ongeldig JSON-formaat | Valideer op jsonlint.com; check dat het bestand de verwachte structuur heeft |
| Ontbrekende verplichte velden | Het bestand heeft `language` en `steps` nodig, en elke stap een `id` en een `title`. Zie het [Import/Export](import-export.nl.md)-JSON-voorbeeld |
| Verkeerde taalcode | `language` in het bestand moet een Nextcloud-taalcode zijn: twee letters, eventueel met een regio, zoals `en`, `nl` of `pt_BR`. De stappen gaan naar die taal, welke taal de editor ook toont |

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

## CSRF-fouten vanuit scripts of oude tooling

**Symptoom:** een script of eigen tool dat de routes van IntroVox aanroept, krijgt HTTP 412 ("CSRF check failed") of 404.

**Oorzaak:** sinds 2.0.0 vraagt elke route het CSRF-requesttoken, ook de routes die alleen lezen: de `GET`-routes voor beheerders, de persoonlijke instellingen en `POST /api/wizard/{start,complete,skip}`. `GET /api/steps` vraagt bovendien een ingelogde gebruiker; die route was openbaar. Alleen twee routes kunnen zonder token, omdat ze er geen kunnen meesturen: `GET /media/{file}` (geladen door een afbeelding of video in een stap) en `GET /tour/{id}` (de deellink van een tour). `POST /admin/step`, `PUT /admin/step/{id}` en `DELETE /admin/step/{id}` bestaan niet meer.

**Fix:** stuur bij elke aanroep de header `requesttoken` mee, vanuit een ingelogde sessie. Om stappen op te slaan stuur je de hele lijst van een taal naar `POST /admin/steps`. Op de beheerpagina zelf: herlaad de pagina als de sessie verlopen is. Zie de [API-referentie](../architecture/api-reference.nl.md).

## AI-knoppen ontbreken

**Symptoom:** de stappen-editor heeft geen **Translate with AI** of **Write steps with AI**.

**Oorzaak:** die knoppen verschijnen alleen als Nextcloud een provider voor vrije prompts heeft (taaktype `core:text2text`), in te stellen onder **Beheerinstellingen → Artificial intelligence**. Zie [Stappen schrijven of vertalen met AI](tours.nl.md#stappen-schrijven-of-vertalen-met-ai).

**Fix:** installeer en configureer een provider, zoals de integratie OpenAI and LocalAI of een lokaal model, en herlaad de stappen-editor. Komt een antwoord traag, controleer dan of de achtergrondwerkers van Nextcloud voor AI-taken draaien.

## Deellink start niets

**Symptoom:** een link van **Link kopiëren** opent Bestanden, maar er start geen tour. **Link kopiëren** meldde "De tour is uitgeschakeld: de link start hem zodra je hem inschakelt."

| Mogelijke oorzaak | Oplossing |
|---|---|
| De tour staat uit | Zet hem aan onder **Tours**; de gekopieerde link werkt vanaf dan |
| **Tours for everyone** staat uit | Zet hem aan onder **Instellingen** |
| De persoon zit niet in de groepen van de tour, of kan de app niet openen | Zo hoort het: de link start de tour alleen voor wie hem mag krijgen |

Zie [Een tour delen met een link](tours.nl.md#een-tour-delen-met-een-link).

## Afbeelding of video geweigerd

**Symptoom:** een afbeelding of video toevoegen aan een stap mislukt met een melding.

| Melding | Oplossing |
|---|---|
| "This file type is not supported…" | Gebruik PNG, JPEG, GIF, MP4 of WebM (ondertitels: WebVTT). SVG en WebP worden geweigerd; het echte bestandstype telt, niet de naam |
| "The file is too large. The limit is …" / "The image is too large: at most … megapixels." | Maak het bestand kleiner, of verhoog de limiet; zie [Afbeelding of video](managing-steps.nl.md#afbeelding-of-video) |
| "The file is larger than this server accepts for uploads…" | Zet het bestand in je Bestanden en gebruik **Kies uit Bestanden** |
| "IntroVox heeft geen ruimte meer voor media…" | Haal media weg uit stappen die ze niet meer nodig hebben, of verhoog `media_quota_bytes` / `media_max_files` |
| "This video has a track with extra data…" | Exporteer de video opnieuw zonder metadata |
| "This file is shared with you for viewing only…" | Gebruik een kopie die je mag downloaden |

Meldingen die nog niet vertaald zijn, staan hier in het Engels, zoals je ze in beeld ziet. Zie het [dreigingsmodel](../security/media.md) (Engels) voor wat IntroVox controleert en waarom.

## Checklist staat niet op het Dashboard

**Symptoom:** gebruikers zien **Aan de slag** (Getting started) niet op hun Dashboard.

| Mogelijke oorzaak | Oplossing |
|---|---|
| De checklist staat uit | Zet **Show "Getting started" on the Dashboard** aan onder **Instellingen** |
| De gebruiker heeft zijn Dashboard zelf ingedeeld, of het widget verwijderd | Zo hoort het: **Put it on every Dashboard** verandert alleen de standaardindeling. De gebruiker voegt het weer toe via **Aanpassen** op het Dashboard |
| Een taak ontbreekt in de lijst | Sommige taken verschijnen alleen waar ze van toepassing zijn: **Take the welcome tour** zolang de welkomsttour aan staat, **Send a message in Talk** voor wie Talk kan gebruiken, **Secure your account** als er een app voor tweestapsverificatie geïnstalleerd is |

Zie [Checklist op het Dashboard](settings.nl.md#checklist-op-het-dashboard).

## Een stap controleren

IntroVox schrijft niets naar de browser-console. Zo zie je wat een stap doet:

- **Test this step** in de stap-editor toont die ene stap, inclusief niet-opgeslagen wijzigingen. **Tour bekijken** speelt de hele tour af; **Bekijken als** toont wat leden van één groep krijgen.
- Een stap die rechtsonder staat in plaats van bij zijn element, heeft dat element niet gevonden. Hij wacht daar tot het element verschijnt.
- Een selector met de hand controleren: open de browser-console (F12 → Console) en test elke selector van de lijst apart met `document.querySelector('…')`.
- Fouten, zoals een verzoek dat mislukte, staan nog wel in de console en onder F12 → Network.

## Zie ook

- [Gebruikers-troubleshooting](../user/troubleshooting.nl.md) — gebruikers-issues
- [FAQ](faq.nl.md) — veelvoorkomende admin-vragen
- [Best practices](best-practices.nl.md) — preventieve aanbevelingen
