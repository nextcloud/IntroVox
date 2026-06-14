# FAQ (beheerders)

Veelgestelde vragen van IntroVox-beheerders. Voor gebruikers-vragen, zie de [Gebruikers-FAQ](../user/faq.md).

## Configuratie

### Hoe weet ik welke CSS-selector ik moet gebruiken?

1. Open Nextcloud in je browser
2. Druk op **F12** om Developer Tools te openen
3. Klik op het **"Inspect element"**-icoon (cursor met vierkant)
4. Klik op het element dat je wilt highlighten
5. Gebruik de zichtbare class/ID/attribuut in je selector:
   - Class: `.classname`
   - ID: `#id-name`
   - Link met URL: `a[href*="/apps/files/"]`

Voor betrouwbaarheid, gebruik meerdere selectors gescheiden door komma's — zie [Best practices](best-practices.md#gebruik-meerdere-css-selectors-als-fallbacks).

### Kan ik HTML gebruiken in stap-tekst?

Ja. Ondersteunde tags zijn `<p>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<br>`, `<a href="...">`.

> **Beveiligings-notitie:** stap-`title` en `text` worden server-side gesanitized via `OCP\Util::sanitizeHTML` bij opslaan/importeren (sinds v1.5.0) om stored XSS te voorkomen.

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
window.nextcloudWizard.reset();
window.nextcloudWizard.start();
```

**Methode 2 — persoonlijke instellingen:** **Persoonlijke instellingen → IntroVox → Tour nu herstarten**, dan de pagina vernieuwen.

### Kan ik emoji's in stap-titels en -teksten gebruiken?

Ja, volledig ondersteund. Zorg dat je Nextcloud-server UTF-8 gebruikt (default).

### Kan ik stappen maken die conditioneel verschijnen?

Er is geen ingebouwde conditionele logica, maar:

- **In-/uitschakelen-toggle** laat je stappen verbergen zonder ze te verwijderen
- **Groep-gebaseerde zichtbaarheid** beperkt stappen tot specifieke gebruikersgroepen ([Groep-zichtbaarheid](group-visibility.md))
- **Niet-matchende CSS-selectors** worden netjes afgehandeld (v1.4.1+ valt terug op gecentreerde weergave)

### Hoeveel stappen moet ik maken?

5–8 is ideaal. Meer dan 10 brengt tour-moeheid mee. Zie [Best practices](best-practices.md#houd-stappen-kort-en-gefocust).

## Taal-vragen

### Hoe voeg ik een nieuwe taal toe?

IntroVox detecteert talen automatisch vanuit `l10n/<lang>.json` — geen code-wijzigingen nodig.

1. Draag vertalingen bij of download ze via [Nextcloud-Transifex](https://www.transifex.com/nextcloud/nextcloud/)
2. Plaats het `.json`-bestand in de `l10n/`-directory van de app
3. De nieuwe taal verschijnt automatisch in de **Beschikbare talen**-checkboxes
4. Schakel hem in en pas stappen aan indien gewenst

Zie [Meertaligheid](../features/multi-language.md) voor de volledige Transifex-flow.

### Kan ik verschillende stappen hebben voor verschillende talen?

Ja — dat is een van de kern-features. Elke taal heeft zijn eigen onafhankelijke `wizard_steps_<lang>`-configuratie.

### Hoe reset ik één taal zonder de andere te raken?

Selecteer de taal in de dropdown → klik op **🔄 Reset naar default** → bevestig. Alleen die taal wordt gereset.

### Wat als de taal van een gebruiker niet is ingeschakeld?

Ze zien "*De introductie-tour is niet beschikbaar in je taal*" in persoonlijke instellingen en kunnen de wizard niet starten. De tour valt niet automatisch terug op Engels — dit is bewust, zodat gebruikers niet verrast worden door een onbekende taal.

### Kan ik talen mixen in stap-tekst?

Niet aanbevolen. Elke taal moet zijn eigen complete vertaling hebben via de taal-dropdown.

## Doelgroep-controle

### Kan ik de wizard uitschakelen voor specifieke gebruikers?

Meerdere opties:

1. **App beperken tot groepen** (Nextcloud-niveau, aanbevolen voor volledige uitsluiting) — **Instellingen → Apps → IntroVox → Beperken tot groepen**
2. **Groep-gebaseerde stap-zichtbaarheid** (v1.2.0+) — beperk individuele stappen tot groepen ([Groep-zichtbaarheid](group-visibility.md))
3. **Per taal** — schakel de taal van de gebruiker uit in **Beschikbare talen**
4. **Globaal** — vink **Wizard inschakelen voor alle gebruikers** uit

### Kunnen gebruikers zelf de wizard uitschakelen?

Ja (sinds v1.1.0):

- **"Overslaan en niet meer tonen"**-knop in de eerste stap
- **"Introductie-tour permanent uitschakelen"**-checkbox in persoonlijke instellingen
- De tour voltooien (klikken op **Klaar** in de laatste stap)

Beheerders kunnen dit overrulen met **Wizard tonen aan alle gebruikers**.

## Versioning & compatibiliteit

### Welke Nextcloud-versies worden ondersteund?

Vanaf v1.5.0 verklaart IntroVox compatibiliteit met **Nextcloud 32–34** en vereist **PHP 8.1+**. Check `appinfo/info.xml` voor de gezaghebbende lijst.

### Wat is het verschil tussen sluiten (✕) en voltooien?

| Actie | localStorage | Server-voorkeur | Auto-start volgende login? |
|---|---|---|---|
| **✕ Sluiten** | Gemarkeerd als "gezien" | Niet gewijzigd | Ja |
| **Klaar**-knop | Gemarkeerd als voltooid | Permanent-uitschakelen ingesteld | Nee (tenzij admin forceer-toont) |
| **Overslaan en niet meer tonen** | Gemarkeerd als voltooid | Permanent-uitschakelen ingesteld | Nee (tenzij admin forceer-toont) |

### Wat is nieuw in versie X?

Zie [CHANGELOG.md](https://github.com/nextcloud/IntroVox/blob/main/CHANGELOG.md) voor de volledige versie-historie. Highlights:

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

- **Globale instellingen**: `oc_appconfig` (`wizard_enabled`, `enabled_languages`, `wizard_version`)
- **Per-taal stappen**: `oc_appconfig` (`wizard_steps_en`, `wizard_steps_nl`, ...)
- **Gebruikers-voorkeuren** (permanent uitschakelen): `oc_preferences` (user-scoped)

Zie [Backend-architectuur](../architecture/backend-architecture.md).

### Kan ik stappen direct in de database bewerken?

Technisch ja, maar **niet aanbevolen**. Gebruik de admin-interface of de Import/Export-feature om corruptie te vermijden. Sinds v1.4.3, als `wizard_steps_<lang>` niet decodeert naar een geldige array, valt de backend terug op defaults in plaats van crashen.

### Werkt IntroVox met reverse-proxies?

Ja. Standaard Nextcloud-reverse-proxy-setups werken; zorg alleen dat JavaScript- en CSS-bestanden correct door je proxy worden geserveerd.

### Verzamelt de app telemetrie?

Telemetrie is toegevoegd in v1.4.x en rapporteert anonieme gebruiks-stats (gebruikers-aantallen, tour-voltooiings-events) naar `licenses.voxcloud.nl`. Sinds v1.5.0 bevat de payload de geconfigureerde subscription-key en een `hasExtendedSupport`-flag, gebruikt door de licentie-server om Enterprise-claims te verifiëren. Admins kunnen telemetrie uitschakelen in het Support-tabblad.

## Best-practice-vragen

### Hoe vaak moet ik wizard-content updaten?

Na elke grote Nextcloud-upgrade, bij het toevoegen van nieuwe essentiële apps, en op basis van gebruikers-feedback (drie maanden is een redelijke cadans). Zie [Best practices → Kwartaal-review](best-practices.md#kwartaal-review).

### Moet ik elke stap aan een element koppelen?

Nee — mix ze:

- **Gecentreerde stappen** voor welkom, overgangen en afsluiting
- **Gekoppelde stappen** voor specifieke UI-elementen die je wilt highlighten

### Kan ik verschillende wizard-configuraties A/B-testen?

Niet ingebouwd. Je kunt exports handmatig wisselen voor verschillende periodes en gebruikers-feedback verzamelen, maar er is geen ingebouwde cohorting.

## Zie ook

- [Beheerdersgids](guide.md)
- [Wizard-stappen beheren](managing-steps.md)
- [Problemen oplossen](troubleshooting.md)
- [Best practices](best-practices.md)
- [Gebruikers-FAQ](../user/faq.md)
