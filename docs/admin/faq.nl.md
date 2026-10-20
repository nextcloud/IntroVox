# FAQ (beheerders)

Veelgestelde vragen van IntroVox-beheerders. Voor gebruikers-vragen, zie de [Gebruikers-FAQ](../user/faq.md).

## Configuratie

### Hoe weet ik welke CSS-selector ik moet gebruiken?

Klik op **Pick element** naast het Element-veld en klik op het element dat je wilt highlighten; IntroVox vult zelf een selector in. Zie [Element kiezen](managing-steps.nl.md#element-kiezen).

Met de hand zoeken:

1. Open Nextcloud in je browser
2. Druk op **F12** om Developer Tools te openen
3. Klik op het **"Inspect element"**-icoon (cursor met vierkant)
4. Klik op het element dat je wilt highlighten
5. Gebruik de zichtbare class/ID/attribuut in je selector:
   - Class: `.classname`
   - ID: `#id-name`
   - Link met URL: `a[href*="/apps/files/"]`

Voor betrouwbaarheid, gebruik meerdere selectors gescheiden door komma's — zie [Best practices](best-practices.nl.md#gebruik-meerdere-css-selectors-als-fallbacks).

### Kan ik HTML gebruiken in stap-tekst?

Ja. Ondersteunde tags zijn `<p>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<br>`, `<a href="...">`.

> **Beveiligings-notitie:** stap-`title` en `text` worden opgeslagen zoals geschreven. Waar ze getoond worden, houdt de tekst alleen de ondersteunde tags en zijn titels platte tekst, zodat een geïmporteerde tour of een vertaling geen scripts, stijlen, formulieren of afbeeldingen kan toevoegen. Zie [Customization](../features/customization.nl.md#html-in-stap-content).

Voorbeeld:

```html
<p>Welkom bij <strong>Nextcloud</strong>!</p>
<ul>
  <li>📁 Upload bestanden eenvoudig</li>
  <li>📅 Beheer je agenda</li>
</ul>
```

### Wat betekent "gecentreerde stap"?

Een gecentreerde stap heeft geen CSS-selector (`attachTo` leeg gelaten). Hij verschijnt als gecentreerde modal in het midden van het scherm — geschikt voor welkom-/afsluit-stappen.

### Hoe test ik de wizard voordat gebruikers hem zien?

**Methode 1 — browser-console:**

```js
window.introVox.reset();       // wist de markering "welkomsttour klaar" in deze browser
window.introVox.start();       // start de welkomsttour nu, op deze pagina
window.introVox.isCompleted(); // true als deze browser hem als klaar heeft gemarkeerd
```

`start()` werkt ook als de welkomsttour voor jou klaar is of **Start tours by themselves** uit staat; alleen als **Tours for everyone** uit staat, of de **Welcome tour** onder **Tours** uit staat, start hij niet. `reset()` wist alleen de markering in deze browser: of de tour bij de volgende login vanzelf start, hangt ook af van `wizard_disabled` op de server.

**Methode 2 — persoonlijke instellingen:** **Persoonlijke instellingen → IntroVox → Restart tour now**. De tour start op de pagina die dan opent.

Voor een tour voor een app gebruik je **Preview** in het ⋯-menu ervan onder **Tours**, of **Start** ernaast onder **Persoonlijke instellingen → IntroVox → Tours**.

### Kan ik emoji's in stap-titels en -teksten gebruiken?

Ja, volledig ondersteund. Zorg dat je Nextcloud-server UTF-8 gebruikt (default).

### Kan ik stappen maken die conditioneel verschijnen?

Er is geen ingebouwde conditionele logica, maar:

- **In-/uitschakelen-toggle** laat je stappen verbergen zonder ze te verwijderen
- **Groep-gebaseerde zichtbaarheid** beperkt stappen tot specifieke gebruikersgroepen ([Groep-zichtbaarheid](group-visibility.md))
- **Een stap waarvan het element niet op de pagina staat** wacht opzij in een hoek onderin met zijn tekst, en **Next** gaat gewoon verder; verschijnt het element, dan gaat de stap ernaartoe

### Hoeveel stappen moet ik maken?

5–8 is ideaal. Meer dan 10 brengt tour-moeheid mee. Zie [Best practices](best-practices.nl.md#houd-stappen-kort-en-gefocust).

## Taal-vragen

### Hoe voeg ik een nieuwe taal toe?

Daar hoef je niets voor te doen. Elke taal met een vertaling op de [Transifex-resource `nextcloud/introvox` van Nextcloud](https://www.transifex.com/nextcloud/nextcloud/) werkt vanzelf: de sync-bot zet de vertalingen via PR's in `l10n/<lang>.json`, en gebruikers in die taal zien meteen de automatisch vertaalde tour.

Wil je **eigen tekst** voor een bepaalde taal (anders dan de automatisch vertaalde standaardtekst), open dan **Tours**, klik bij de **Welcome tour** op **Edit steps**, klik op **Add language override**, kies de taal, pas aan en sla op.

Zie [Meertaligheid](../features/multi-language.nl.md) voor de hele werkwijze met Transifex.

### Kan ik verschillende stappen hebben voor verschillende talen?

Ja, daar zijn overrides voor. Elke taal met een override heeft zijn eigen `wizard_steps_<lang>`, los van de andere, die de automatisch vertaalde standaardstappen voor die taal vervangt. Talen zonder override krijgen de standaardstappen.

### Hoe gooi ik een override weg en ga ik terug naar de automatisch vertaalde standaardstappen?

Kies de taal in de keuzelijst → klik op **Reset** → bevestig. De override-rij wordt verwijderd; vanaf dan komen updates van Transifex voor die taal vanzelf door.

### Wat als de taal van een gebruiker nog geen vertaling op Transifex heeft?

Dan krijgt die gebruiker de **Engelse** standaardstappen. (De taaldetectie per app van Nextcloud valt terug op de standaardtaal van het systeem; IntroVox kiest in `DefaultStepsService` bewust voor Engels, zodat gebruikers nooit onverwacht een derde taal zien.)

### Kan ik talen mixen in stap-tekst?

Niet aanbevolen. Elke taal met een override hoort zijn eigen samenhangende tekst te hebben. Talen zonder override gebruiken de automatisch vertaalde standaardstappen van Transifex.

## Doelgroep-controle

### Kan ik de wizard uitschakelen voor specifieke gebruikers?

Meerdere opties:

1. **App beperken tot groepen** (Nextcloud-niveau, aanbevolen voor volledige uitsluiting) — **Instellingen → Apps → IntroVox → Beperken tot groepen**
2. **Groep-gebaseerde stap-zichtbaarheid** (v1.2.0+) — beperk individuele stappen tot groepen ([Groep-zichtbaarheid](group-visibility.md))
3. **Globaal** — zet **Tours for everyone** uit (dat stopt elke tour, ook de tours voor apps)

(Uitzetten per taal bestaat sinds v1.7.0 niet meer — dat werkt niet met 80+ talen op Transifex.)

Wil je een tour voor een app alleen aan bepaalde groepen geven, stel dan **Visible to** in bij die tour; zie [Tours](tours.nl.md).

### Kunnen gebruikers zelf de wizard uitschakelen?

Ja. Alleen voor de welkomsttour:

- De knop **Skip and don't show again** in de eerste stap
- De tour voltooien (klikken op **Done** in de laatste stap)

**Show again to everyone** bij de **Welcome tour** geeft deze gebruikers de welkomsttour weer.

Voor alle tours: de schakelaar **Start tours by themselves** in **Persoonlijke instellingen → IntroVox**. Zet een gebruiker die uit, dan start er voor die gebruiker geen tour meer vanzelf, de welkomsttour niet en de tours voor apps ook niet. **Show again to everyone** verandert daar niets aan; gebruikers kunnen tours nog wel zelf starten via hun persoonlijke instellingen.

## Versioning & compatibiliteit

### Welke Nextcloud-versies worden ondersteund?

IntroVox ondersteunt **Nextcloud 32–35** (35 sinds v1.7.7) en vereist **PHP 8.1+**. Check `appinfo/info.xml` voor de gezaghebbende lijst.

### Wat is het verschil tussen sluiten (✕) en voltooien?

Voor de welkomsttour:

| Actie | localStorage | Server-voorkeur | Auto-start volgende login? |
|---|---|---|---|
| **✕ Sluiten** | In deze browser gemarkeerd als klaar | Niet gewijzigd | Alleen in een andere browser |
| **Done**-knop | Gemarkeerd als voltooid | `wizard_disabled` ingesteld | Nee (tenzij admin forceer-toont) |
| **Skip and don't show again** | Gemarkeerd als voltooid | `wizard_disabled` ingesteld | Nee (tenzij admin forceer-toont) |

Een tour voor een app telt als gezien zodra hij start, dus hij start niet meer vanzelf, hoe de gebruiker hem ook verlaat. De eerste stap heeft daar **Skip** in plaats van **Skip and don't show again**.

### Wat is nieuw in versie X?

Zie [CHANGELOG.md](https://github.com/nextcloud/IntroVox/blob/main/CHANGELOG.md) voor de volledige versie-historie. Highlights:

- **v2.0.0** — tours: naast de welkomsttour tours voor apps, pagina's of overal, elk met eigen stappen, talen, groepen en timing; ingebouwde tours voor Files, Talk, Deck en Calendar; statistieken per tour, met hoe ver mensen komen; een hele tour exporteren en importeren; een tour delen met een link; stappen vertalen of schrijven met AI; afbeeldingen en video's in stappen; stappen die op de gebruiker wachten; een checklist "Getting started" op het Dashboard; **Pick element**, **Preview tour**, en stappen bewerken in een dialoog
- **v1.7.9** — de beheer- en persoonlijke instellingen zijn vertaald (ze bleven in het Engels); Indonesisch en Slowaaks
- **v1.7.8** — standaardstappen die een beheerder verwijderde, komen niet meer terug in de tour; de stap over je account wijst op Nextcloud 32 en 33 naar de avatar
- **v1.7.7** — ondersteuning voor Nextcloud 35; IntroVox is gratis, en het tabblad Support zegt dat ook
- **v1.7.6** — herstel van verminkte accenten in geïmporteerde stappen en van geëscapete HTML uit 1.6.x; een upgrade verwijdert geen aangepaste tour meer
- **v1.7.4** — stappen wijzen op Nextcloud 34 naar de goede onderdelen van de kopbalk; Files en Calendar samengevoegd tot één stap Files & apps
- **v1.7.1–1.7.3** — compatibel met Nextcloud 34, vertalingen voor 89 talen van Transifex, een fix voor de handtekening in de App Store, Enterprise herkennen in de telemetrie
- **v1.7.0** — talen via Transifex: elke vertaalde taal werkt vanzelf, de beheerder beheert overrides in plaats van talen aan te zetten, `enabled_languages` vervalt; fixes voor geëscapete HTML, een tour in de verkeerde taal en het opnieuw vertalen in de browser; #17 en #18 gesloten
- **v1.6.1** — fix voor eerder getoonde stappen die achter de huidige stap stapelen
- **v1.6.0** — Transifex-vertaal-infrastructuur, auto-detectie van taal-display-namen, ~50 nieuwe vertaalbare strings voor PWA-installatie-instructies
- **v1.5.0** — Enterprise-subscription-ondersteuning, NC 34-ondersteuning, CSRF- + XSS-hardening
- **v1.4.3** — defensieve `is_array()`-guard die HTTP-500 op corrupte config voorkomt
- **v1.4.2** — fallback-selectors en 10s-timeout voor app-menu-readiness
- **v1.4.1** — stappen met ontbrekende target-elementen vallen nu terug op gecentreerde weergave
- **v1.2.0** — groep-gebaseerde stap-zichtbaarheid
- **v1.1.0** — gebruikers-controle (permanent uitschakelen), Import/Export, dynamische taal-detectie
- **v1.0.6** — multi-taal-autostart, multi-selector-fallbacks, ID-gebaseerde stap-ordering

## Technische vragen

### Waar worden wizard-configuraties opgeslagen?

- **Globale instellingen**: `oc_appconfig` (`wizard_enabled`, `wizard_version`)
- **Overrides per taal**: `oc_appconfig` (`wizard_steps_<lang>` — alleen als een beheerder een override heeft opgeslagen)
- **Tours voor apps**: `oc_appconfig` (`tours`, en `tour_steps_<tour>_<lang>` voor hun stappen)
- **Afbeeldingen en video's van stappen, en back-ups van de laatste tien verwijderde tours**: de app-datamap (`appdata_<instanceid>/introvox`)
- **Gebruikers-voorkeuren**: `oc_preferences` (user-scoped): `wizard_disabled` (welkomsttour klaar), `tours_disabled` (**Start tours by themselves** uit), `tour_<tour>_seen`

> Installaties van 1.6.x kunnen nog een oude `enabled_languages`-rij hebben. De code van 1.7.0 negeert die; hij kan geen kwaad en blijft staan zodat terugzetten naar een oudere versie veilig is.

Zie [Backend-architectuur](../architecture/backend-architecture.md).

### Kan ik stappen direct in de database bewerken?

Technisch ja, maar **niet aanbevolen**. Gebruik de admin-interface of de Import/Export-feature om corruptie te vermijden. Sinds v1.4.3, als `wizard_steps_<lang>` niet decodeert naar een geldige array, valt de backend terug op defaults in plaats van crashen.

### Werkt IntroVox met reverse-proxies?

Ja. Standaard Nextcloud-reverse-proxy-setups werken; zorg alleen dat JavaScript- en CSS-bestanden correct door je proxy worden geserveerd.

### Verzamelt de app telemetrie?

Telemetrie is toegevoegd in v1.4.x en rapporteert anonieme gebruiks-stats (gebruikers-aantallen, tour-voltooiings-events) naar `licenses.voxcloud.nl`. Sinds v1.5.0 bevat de payload de geconfigureerde subscription-key en of deze Nextcloud een Enterprise-subscription heeft (`hasValidSubscription`, en `hasExtendedSupport` voor de add-on), gebruikt door de licentie-server om Enterprise-claims te verifiëren. Sinds 2.0.0 wordt er niets verstuurd voordat een beheerder het gevraagd is: de beheerderstour eindigt met die vraag. Beheerders kunnen telemetrie op elk moment uitzetten in het tabblad Statistics; zie [Telemetrie](telemetry.nl.md).

## Best-practice-vragen

### Hoe vaak moet ik wizard-content updaten?

Na elke grote Nextcloud-upgrade, bij het toevoegen van nieuwe essentiële apps, en op basis van gebruikers-feedback (drie maanden is een redelijke cadans). Zie [Best practices → Kwartaal-review](best-practices.nl.md#kwartaal-review).

### Moet ik elke stap aan een element koppelen?

Nee — mix ze:

- **Gecentreerde stappen** voor welkom, overgangen en afsluiting
- **Gekoppelde stappen** voor specifieke UI-elementen die je wilt highlighten

### Kan ik verschillende wizard-configuraties A/B-testen?

Niet ingebouwd. Je kunt exports handmatig wisselen voor verschillende periodes en gebruikers-feedback verzamelen, maar er is geen ingebouwde cohorting.

## Zie ook

- [Beheerdersgids](guide.md)
- [Tourstappen beheren](managing-steps.md)
- [Problemen oplossen](troubleshooting.md)
- [Best practices](best-practices.md)
- [Gebruikers-FAQ](../user/faq.md)
