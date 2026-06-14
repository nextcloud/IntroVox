# Aan de slag met IntroVox

IntroVox is een Nextcloud-app die nieuwe gebruikers bij de eerste login een geleide, stapsgewijze tour door de hoofdfeatures van Nextcloud geeft. De inhoud van de tour is volledig aanpasbaar per taal, en stappen kunnen worden beperkt tot specifieke gebruikersgroepen voor rol-gebaseerde onboarding.

Deze gids helpt je snel op gang afhankelijk van je rol.

## Wat is IntroVox?

IntroVox toont nieuwe gebruikers de eerste keer dat ze inloggen een interactieve onboarding-tour. De tour:

- Markeert belangrijke Nextcloud-UI-elementen (Files, Agenda, Zoeken, Instellingen, etc.)
- Ondersteunt standaard 6 talen (EN, NL, DE, DA, FR, SV) met Transifex-klare vertaalinfrastructuur
- Laat iedere gebruiker overslaan, herstarten of permanent uitschakelen
- Laat beheerders stappen per taal én per gebruikersgroep configureren

Onder de motorkap is de tour-engine [Shepherd.js](https://shepherdjs.dev/), verpakt in een Vue 3-frontend met een PHP-backend die configuratie opslaat in Nextclouds `appconfig`-tabel.

## Snel starten per rol

### Gebruikers

1. Log in op Nextcloud — de tour start automatisch na een korte vertraging (als je beheerder hem voor jouw taal heeft ingeschakeld)
2. Klik op **Volgende** / **Vorige** of gebruik `Enter` / `Backspace` om door de stappen te navigeren
3. Druk op `Escape` of klik op **✕** om de tour te sluiten (hij verschijnt weer bij de volgende login)
4. Klik op **Klaar** op de laatste stap of op **Skip and don't show again** om automatisch starten permanent uit te schakelen
5. Herstart op elk moment via **Persoonlijke instellingen → IntroVox → Tour nu herstarten**

Zie [Gebruikersoverzicht](user/overview.md) en [De tour doorlopen](user/taking-the-tour.md) voor de volledige uitleg.

### Beheerders

1. Installeer IntroVox vanuit de Nextcloud App Store (of via `occ app:install introvox`)
2. Ga naar **Instellingen → Beheer → IntroVox**
3. Vink **Wizard ingeschakeld voor alle gebruikers** aan
4. Vink onder **Beschikbare talen** de talen aan die je wilt ondersteunen
5. Pas per taal wizard-stappen aan of importeer ze via de taal-dropdown
6. Beperk eventueel stappen tot specifieke groepen voor [rol-gebaseerde onboarding](admin/group-visibility.md)

Zie de [Beheergids](admin/guide.md) en [Wizard-stappen beheren](admin/managing-steps.md) voor detailconfiguratie.

### Architecten

Voor je IntroVox op grotere schaal evalueert, lees:

- [Architectuuroverzicht](architecture/overview.md) — Vue 3-frontend, Shepherd.js-tour-engine, PHP-backend, appconfig-opslag
- [API-referentie](architecture/api-reference.md) — publieke en admin-endpoints
- [Meertalige ondersteuning](features/multi-language.md) — Transifex-integratie en auto-discovery van taalbestanden

## Kernconcepten

| Concept | Beschrijving |
|---|---|
| **Wizard-stap** | Eén tour-stap met een titel, HTML-inhoud, optionele CSS-selector om een element te markeren, en een positie (links/rechts/boven/onder). |
| **Centered step** | Een stap zonder CSS-selector — verschijnt als gecentreerde modal. Gebruikt voor welkomst- en eind-stappen. |
| **Attached step** | Een stap met CSS-selector — verschijnt naast het gemarkeerde element met een gloeiende rand. |
| **Taalconfiguratie** | Elke taal heeft een eigen onafhankelijke set wizard-stappen, opgeslagen in appconfig onder `wizard_steps_<lang>`. |
| **Groepszichtbaarheid** | Stappen kunnen worden beperkt tot specifieke Nextcloud-groepen via het `visibleToGroups`-veld. Leeg = zichtbaar voor alle gebruikers. |
| **Standaardstappen** | Ingebouwde stapdefinities die automatisch worden vertaald via Transifex; geladen als er geen aangepaste configuratie bestaat voor een taal. |
| **Wizard-versie** | Een teller (`wizard_version`) die wordt opgehoogd door admin-acties zoals "Toon wizard aan alle gebruikers" — de frontend gebruikt hem om te beslissen of opnieuw getoond moet worden. |

## Architectuurhighlights

- **Native Nextcloud-integratie** — gebruikt NC's `IConfig` voor opslag, `IL10N` voor taal-detectie, `IGroupManager` voor groep-filtering en `IUserSession` voor per-gebruiker-status.
- **Server-side groep-filtering** — `visibleToGroups`-handhaving gebeurt in de PHP-backend ([ApiController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)), dus gebruikers kunnen verborgen stappen niet zien via browser-tools.
- **Transifex-klare vertalingen** — nieuwe taalbestanden (`l10n/<lang>.json`) worden automatisch opgepakt; geen code-wijzigingen nodig.

## Volgende stappen

- [Gebruikersoverzicht](user/overview.md) — De tour volgen
- [Beheergids](admin/guide.md) — Installatie en configuratie
- [Wizard-stappen beheren](admin/managing-steps.md) — Stappen CRUD
- [Architectuuroverzicht](architecture/overview.md) — Systeemontwerp

## Zie ook

- [Meertalige ondersteuning](features/multi-language.md) — Nieuwe talen toevoegen via Transifex
- [Groep-gebaseerde zichtbaarheid](admin/group-visibility.md) — Rol-gebaseerde onboarding
- [Installatie](deployment/installation.md) — App Store en handmatige installatie
