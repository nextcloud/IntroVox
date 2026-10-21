# Aan de slag met IntroVox

IntroVox is een Nextcloud-app met geleide tours: een welkomsttour na de eerste login van een gebruiker, en korte tours die starten als iemand voor het eerst een app of pagina opent. De inhoud van een tour kun je per taal aanpassen, en stappen en tours kun je beperken tot groepen voor rol-gebaseerde onboarding.

Deze gids helpt je snel op gang afhankelijk van je rol.

## Wat is IntroVox?

IntroVox laat mensen Nextcloud zien met tours:

- De **welkomsttour** start na de eerste login van een gebruiker, op de eerste pagina die hij opent. Zijn 8 standaardstappen (Welkom bij Nextcloud, Bestanden & apps, Zoeken, Je account & instellingen, Aan de slag, Belangrijke functies, Handige tips, Klaar!) worden via Transifex (resource `nextcloud/introvox`) vertaald in elke taal waarin de vertalers van Nextcloud werken. Drie ervan wijzen het apps-menu, het zoeken en het accountmenu aan; de andere staan in het midden
- **Tours voor apps en pagina's** starten als iemand voor het eerst een app opent, zoals Talk, of een andere pagina van Nextcloud; een tour die overal start, komt op de eerstvolgende pagina die iemand opent. Ingebouwde tours voor Files, Talk, Deck en Calendar staan klaar om aan te zetten ([Tours](admin/tours.nl.md))
- Een stap kan verdergaan als de gebruiker op het element klikt of een veld invult, wachten tot wat de gebruiker opende er is, en een afbeelding, GIF of video tonen
- Iedere gebruiker kan een tour overslaan of herstarten, elke tour zelf starten vanuit zijn persoonlijke instellingen (**Tours** in het gebruikersmenu leidt daarheen), of tours niet meer vanzelf laten starten
- Beheerders vervangen de standaardtekst per taal, beperken stappen en tours tot groepen, kiezen wie een tour krijgt en wanneer, delen een tour met een link, zien hoe ver mensen komen, verhuizen een tour naar een andere Nextcloud, en vertalen of schrijven stappen met AI via de Nextcloud Assistant
- Een optionele checklist **Aan de slag** (Getting started) op het Dashboard toont de eerste dingen om te doen en vinkt zichzelf af ([Checklist op het Dashboard](admin/settings.nl.md#checklist-op-het-dashboard))

Onder de motorkap is de tour-engine [Shepherd.js](https://shepherdjs.dev/), verpakt in een Vue 3-frontend met een PHP-backend die configuratie opslaat in Nextclouds `appconfig`-tabel.

## Snel starten per rol

### Gebruikers

1. Log in op Nextcloud — de welkomsttour start na een korte vertraging, op de eerste pagina die je opent (als je beheerder hem aan heeft staan)
2. Klik op **Volgende** / **Terug**, of gebruik de pijltjestoetsen links en rechts
3. Druk op `Esc` of klik op **✕** om de tour te sluiten. Hij start dan niet meer vanzelf in deze browser; in een andere browser wel
4. Klik op **Klaar** op de laatste stap of op **Overslaan en niet meer tonen** op de eerste, dan start de welkomsttour niet meer vanzelf
5. Start hem opnieuw met **Persoonlijke instellingen → IntroVox → Tour nu herstarten**; daar staan onder **Tours** ook de andere tours, elk met **Start**. **Tours** in je gebruikersmenu leidt daarheen
6. Wil je dat er geen enkele tour meer vanzelf start, zet dan **Start tours by themselves** uit in **Persoonlijke instellingen → IntroVox**

Zie [Gebruikersoverzicht](user/overview.nl.md) en [De tour doorlopen](user/taking-the-tour.nl.md) voor de volledige uitleg.

### Beheerders

1. Installeer IntroVox vanuit de Nextcloud App Store (of via `occ app:install introvox`)
2. Ga naar **Instellingen → Beheer → IntroVox**
3. Kijk of **Tours for everyone** aan staat (na installeren is dat zo) — de welkomsttour werkt dan in elke taal die Nextcloud ondersteunt; talen hoef je niet aan te zetten
4. Alleen als je voor een bepaalde taal eigen tekst wilt: open **Tours**, klik bij de **Welcome tour** op **Stappen bewerken**, klik op **Taalspecifieke versie toevoegen**, kies een taal en bewerk de stappen
5. Beperk eventueel stappen tot specifieke groepen voor [rol-gebaseerde onboarding](admin/group-visibility.nl.md)
6. Zet eventueel een ingebouwde tour aan (gemarkeerd **Ingebouwd**), of maak een eigen tour: **Tours** → **Nieuwe tour** ([Tours](admin/tours.nl.md))
7. Bied eventueel de checklist aan: **Show "Getting started" on the Dashboard** onder **Instellingen**

Zie de [Beheergids](admin/guide.nl.md), [Tours](admin/tours.nl.md) en [Tourstappen beheren](admin/managing-steps.nl.md) voor detailconfiguratie.

### Architecten

Voor je IntroVox op grotere schaal evalueert, lees:

- [Architectuuroverzicht](architecture/overview.nl.md) — Vue 3-frontend, Shepherd.js-tour-engine, PHP-backend, appconfig-opslag
- [API-referentie](architecture/api-reference.nl.md) — publieke en admin-endpoints
- [Meertalige ondersteuning](features/multi-language.nl.md) — Transifex-integratie en auto-discovery van taalbestanden

## Kernconcepten

| Concept | Beschrijving |
|---|---|
| **Tour** | Een reeks stappen. De **welkomsttour** start na de eerste login van een gebruiker; een tour voor een app of pagina start de eerste keer dat een gebruiker die opent; een tour die overal start, op de eerstvolgende pagina die hij opent. |
| **Ingebouwde tour** | Een kant-en-klare tour voor Files, Talk, Deck of Calendar, vertaald zoals de welkomsttour. Staat uit tot je hem aanzet. |
| **Wizard-stap** | Eén tour-stap met een titel, HTML-inhoud, een optionele afbeelding of video, een optionele CSS-selector om een element te markeren, een positie (links/rechts/boven/onder), en hoe hij verdergaat: **Volgende knop**, **Klikken op het element** of **Het veld invullen**. |
| **Centered step** | Een stap zonder CSS-selector — verschijnt als gecentreerde modal. Gebruikt voor welkomst- en eind-stappen. |
| **Attached step** | Een stap met CSS-selector — verschijnt naast het gemarkeerde element, dat een omlijning en een knipperende pijl krijgt. Zolang het element er nog niet is, wacht de stap opzij in een hoek en gaat hij ernaartoe zodra het verschijnt. |
| **Taal-override** | Eigen tekst per taal die de automatisch vertaalde standaardstappen vervangt. Gemaakt per basistaal (een override voor `pt` bedient ook `pt_BR`), opgeslagen in appconfig onder `wizard_steps_<lang>`, en alleen aangemaakt als een beheerder wijzigingen opslaat. |
| **Groepszichtbaarheid** | Stappen kunnen worden beperkt tot specifieke Nextcloud-groepen via het `visibleToGroups`-veld. Leeg = zichtbaar voor alle gebruikers. |
| **Standaardstappen** | Ingebouwde stapdefinities die automatisch worden vertaald via Transifex; geladen als er geen aangepaste configuratie bestaat voor een taal. |
| **Wizard-versie** | Een teller (`wizard_version`) die **Show again to everyone** bij de welkomsttour ophoogt — de frontend gebruikt hem om te beslissen of de welkomsttour opnieuw getoond wordt. |

## Architectuurhighlights

- **Native Nextcloud-integratie** — gebruikt NC's `IConfig` voor opslag, `IL10N` voor taal-detectie, `IGroupManager` voor groep-filtering en `IUserSession` voor per-gebruiker-status.
- **Een klein script op elke pagina** — elke pagina laadt een bootstrap van ongeveer 20 KB. Die beslist aan de hand van de initial state van de pagina of er een tour start, zonder request, en laadt pas dan de tour-code ([Frontend-architectuur](architecture/frontend-architecture.nl.md#tour-runtime)).
- **Server-side groep-filtering** — `visibleToGroups`-handhaving gebeurt in de PHP-backend ([ApiController](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php)), dus gebruikers kunnen verborgen stappen niet zien via browser-tools.
- **Vertalingen via Transifex** — de Transifex-resource `nextcloud/introvox` levert elke standaardtekst van de tour. Nieuwe taalbestanden (`l10n/<lang>.json`) komen binnen via de sync-bot van Nextcloud en bereiken gebruikers met de volgende release van IntroVox; geen code-wijzigingen nodig, en beheerders hoeven ze niet aan te zetten. Een gebruiker krijgt zijn volledige taal (`pt_BR`), anders de basistaal, anders Engels.

## Volgende stappen

- [Gebruikersoverzicht](user/overview.nl.md) — De tour volgen
- [Beheergids](admin/guide.nl.md) — Installatie en configuratie
- [Tours](admin/tours.nl.md) — De welkomsttour en tours voor apps
- [Tourstappen beheren](admin/managing-steps.nl.md) — Stappen CRUD
- [Architectuuroverzicht](architecture/overview.nl.md) — Systeemontwerp

## Zie ook

- [Meertalige ondersteuning](features/multi-language.nl.md) — Nieuwe talen toevoegen via Transifex
- [Groep-gebaseerde zichtbaarheid](admin/group-visibility.nl.md) — Rol-gebaseerde onboarding
- [Installatie](deployment/installation.nl.md) — App Store en handmatige installatie
