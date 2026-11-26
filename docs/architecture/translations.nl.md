# Vertalingen

> Voorheen `transifex-integration.nl.md`.

De eigen teksten van IntroVox (de standaardstappen van de welkomsttour, de ingebouwde tours, de beheer- en persoonlijke instellingen, en de meldingen daaromheen) worden vertaald in de Weblate van VoxCloud. Deze pagina beschrijft hoe een tekst van de code op het scherm van een gebruiker komt, wat een ontwikkelaar doet als hij teksten toevoegt, waarom `l10n/` gegenereerd wordt, en hoe IntroVox tijdens het gebruik een vertaling kiest.

De tours die een beheerder schrijft vallen hier buiten: die staan per taal in de database, en een beheerder vertaalt ze in de stappen-editor, met de hand of met **Translate with AI**. Zie [Talenbeheer](../admin/language-management.nl.md).

## Hoe het werkt

```
Bronteksten in de code
    │  t('introvox', '…') en $l->t('…'), Amerikaans-Engels, met // TRANSLATORS:-hints
    │
    │ (1) de ontwikkelaar draait `npm run pot` en commit de POT met de code
    ▼
translationfiles/templates/introvox.pot op main
    │
    │ (2) Weblate haalt de nieuwe teksten vanzelf op
    ▼
Weblate van VoxCloud
    │
    │ (3) vertalers vertalen; Weblate commit translationfiles/<lang>/introvox.po
    │     op de branch l10n/weblate en opent een pull request
    ▼
Pull request vanaf l10n/weblate
    │
    │ (4) de controle "l10n sync" bouwt l10n/<lang>.js + l10n/<lang>.json uit de .po-bestanden
    │     en commit ze op die branch; de pull request wordt gemerged
    ▼
Volgende IntroVox-release
    │
    │ (5) de tarball bevat l10n/
    ▼
Gebruiker ziet IntroVox in zijn Nextcloud-taal, zonder dat de beheerder iets doet
```

1. **De bronteksten staan in de code**: `t('introvox', '…')` in Vue en JavaScript, `$l->t('…')` in PHP, in Amerikaans-Engels. Een commentaar `// TRANSLATORS:` boven een tekst legt vertalers uit wat er bedoeld wordt.
2. **De POT volgt de code.** Wie teksten toevoegt of wijzigt, draait `npm run pot`. Dat maakt `translationfiles/templates/introvox.pot` opnieuw met de translationtool van Nextcloud zelf, en de POT gaat in dezelfde commit als de code.
3. **Weblate haalt de teksten op** zodra die commit op `main` staat. Niemand uploadt iets met de hand.
4. **Vertalers werken in Weblate.** Weblate schrijft de vertalingen naar `translationfiles/<lang>/introvox.po`, commit ze op de branch `l10n/weblate` en opent een pull request.
5. **CI bouwt wat Nextcloud laadt.** Op die pull request zet de controle **l10n sync** de `.po`-bestanden om in `l10n/<lang>.js` en `l10n/<lang>.json` (met `convert-po-files` van translationtool) en commit ze op dezelfde branch. Teksten die in Weblate nog nagekeken moeten worden ("Needs editing", in gettext *fuzzy*) gaan niet mee. De pull request wordt gemerged, en de vertalingen komen mee met de volgende release.

**Elke taal gaat mee.** Er is geen minimumpercentage: een taal die deels vertaald is, gaat mee met wat er is, en een tekst die nog niet vertaald is, verschijnt in het Engels.

## Bestanden

| Bestand | Doel |
|---|---|
| `translationfiles/templates/introvox.pot` | De bronteksten. Gemaakt door `npm run pot`, gecommit met de code; Weblate leest hem van `main` |
| `translationfiles/<lang>/introvox.po` | De vertalingen van één taal. Alleen Weblate schrijft hierin |
| `l10n/<lang>.js`, `l10n/<lang>.json` | Wat Nextcloud laadt. Door CI gemaakt uit de `.po`-bestanden, nooit met de hand bewerkt |
| `l10n/.source-strings.json`, `l10n/.source-count.json` | De lijst en het aantal bronteksten, geschreven door `npm run pot`. `npm run build` stopt als de teksten in de code niet meer met de lijst kloppen |
| `.l10nignore` | Mappen die translationtool overslaat bij het maken van de POT (`docs/`, `js/`, `node_modules/`, de testmappen, …) |
| `scripts/l10n-sync.mjs` | Draait translationtool: `pot` schrijft de POT, `build` schrijft `l10n/` uit de `.po`-bestanden, `check` faalt als een van beide niet bij is |

## Teksten toevoegen of wijzigen

1. **Schrijf de tekst in de code**, in Amerikaans-Engels, met `'introvox'` als eerste argument:

   ```js
   // TRANSLATORS: Label of a switch in the personal settings
   t('introvox', 'Start tours by themselves')
   n('introvox', '%n person', '%n people', count)
   ```

   ```php
   // TRANSLATORS: Title of the checklist widget on the Dashboard
   $this->l10n->t('Getting started')
   ```

   In een Vue-template is de hint een HTML-commentaar: `<!-- TRANSLATORS: … -->`.

2. **Alleen wat translationtool ziet, komt bij de vertalers.** Hij vindt `t('introvox', '…')` en `n('introvox', '…', '…', …)` met letterlijke teksten, en `->t('…')` en `->n(…)` in PHP. Een hulpfunctie met een andere naam (`trans`, `$t`, `this.t`), een aanroep zonder `'introvox'` als eerste argument, of een tekst die uit variabelen wordt opgebouwd, ziet hij niet: die tekst wordt nooit vertaald. `tests-js/l10n-bot-visibility.test.js` doet translationtool na en faalt als die een tekst over het hoofd zou zien, zoals een tekst achter een hulpfunctie met een andere naam.

3. **Draai `npm run pot`** en commit wat het veranderde, samen met de code:

   ```bash
   npm run pot
   git add translationfiles/templates/introvox.pot l10n/.source-strings.json l10n/.source-count.json
   ```

   Daarvoor zijn nodig: Node 20 of nieuwer, PHP met SimpleXML, en gettext (`xgettext`, `msgattrib`). `npm run l10n:lint` toetst de nieuwe teksten aan de vertaalrichtlijnen van Nextcloud, zoals een vaste spatie vóór een beletselteken.

4. **Commit op tijd.** Vertalers kunnen pas beginnen als de teksten op `main` staan, dus een tekst die vlak voor een release wordt toegevoegd, komt eerst in het Engels uit. Vergeet je de POT, dan stopt `npm run build` met de lijst van teksten die veranderd zijn (`scripts/check-l10n-sync.js`), en faalt CI op `node scripts/l10n-sync.mjs check`.

De hints komen in de POT terecht als `#.`-regels, en Weblate toont ze naast de tekst:

```
#. TRANSLATORS: Error message: only administrators may do this
msgid "Administrator privileges required"
msgstr ""
```

Verander je de Engelse tekst van een bestaande tekst, dan is het voor vertalers een nieuwe tekst. Tot hij opnieuw vertaald is, zien gebruikers de nieuwe Engelse tekst.

## Waarom `l10n/` gegenereerd wordt

Nextcloud laadt vertalingen uit twee bestanden per taal, en uit niets anders:

- `l10n/<lang>.js` meldt de vertalingen aan in de browser via `OC.L10N.register`:

  ```js
  OC.L10N.register(
      "introvox",
      {
      "Got it" : "Verstanden",
      "_%n person_::_%n people_" : ["%n Person","%n Personen"]
  },
  "nplurals=2; plural=(n != 1);");
  ```

- `l10n/<lang>.json` is wat de server leest (`IL10N`, voor `$l->t()`): dezelfde vertalingen onder `"translations"`, met de meervoudsregel als `"pluralForm"`.

Een tekst met enkelvoud en meervoud heeft de sleutel `_<enkelvoud>_::_<meervoud>_` en een lijst met vormen, zoveel als de meervoudsregel van de taal heeft. Geen van beide bestanden gaat door webpack; ze zitten allebei in de tarball voor de App Store. Engels heeft geen bestand: Engels is de brontekst in de code.

De `.po`-bestanden zijn de bron van de vertalingen, en alleen Weblate schrijft erin. `l10n/` wordt eruit gebouwd met translationtool, hetzelfde gereedschap dat Nextcloud voor zijn eigen apps gebruikt, zodat de bestanden precies de vorm hebben die Nextcloud verwacht. Een wijziging met de hand in `l10n/` of in een `.po`-bestand zou bij de volgende build verdwijnen, en een pull request die een `.po`-bestand buiten Weblate om wijzigt, faalt op de controle **l10n sync**. Een verkeerde vertaling verbeter je in Weblate.

## Vertalingen tijdens het gebruik

### Welke vertaling een gebruiker krijgt

`ApiController::getWizardSteps()` neemt de taal van de gebruiker met `IFactory::findLanguage(null)` (bewust niet `findLanguage('introvox')`, dat zou overstappen op een taal waarvoor IntroVox toevallig een vertaalbestand heeft). `DefaultStepsService::getForLanguage($lang)` maakt dan de acht standaardstappen via `IFactory::get('introvox', $lang)`: in de volledige taal van de gebruiker (`pt_BR`), anders de basistaal (`pt`), anders Engels, nooit de standaardtaal van het systeem. Zie [Meertaligheid](../features/multi-language.nl.md#terugvaltabel).

### `DefaultStepsService` (sinds v1.7.0)

Een `DefaultStepsService` is in v1.6.0 eerst verwijderd, omdat hij hardgecodeerde Nederlandse standaardstappen bevatte en niet meer gebruikt werd. In v1.7.0 kwam hij **terug**, nu als de enige bron van de acht ingebouwde stappen, gedeeld door `AdminController` (de beginstand in de editor) en `ApiController` (wat gebruikers ophalen). Hij vertaalt ze met `IFactory::get('introvox', $lang)`, en valt bewust terug op Engels als er voor de gevraagde taal geen vertaalbestand is.

Daardoor kon het oude antwoord met `useDefault: true` en een lege lijst stappen verdwijnen: de API stuurt nu altijd de volledige, al vertaalde stappen mee, zodat de browser de standaardstappen nooit meer zelf hoeft op te bouwen (dat vertaalde ze opnieuw via de Vue-bundle in de browser, soms in de verkeerde taal).

### Ingebouwde tours (sinds 2.0.0)

De ingebouwde tours voor Files, Talk, Deck en Calendar worden op dezelfde manier vertaald. `BuiltinTours::stepsIn($l)` legt hun stappen vast met `$l->t()`, zodat hun teksten net als die van de welkomsttour in de POT staan; `BuiltinTours::steps($id, $lang)` maakt ze in de taal van de gebruiker, de basistaal of het Engels. Een gebruiker krijgt eerst de eigen stappen van de beheerder in zijn taal, dan de vertaalde ingebouwde stappen, dan de stappen van de beheerder in de hoofdtaal van de tour, dan Engels (zie [API-referentie](api-reference.nl.md)).

### Taalnamen in de override-keuzelijst (sinds v1.6.0)

De namen in de keuzelijst van **Taalspecifieke versie toevoegen** (bv. "Nederlands", "Português") komen uit `OCP\L10N\IFactory::getLanguages()`, de lijst met taalnamen die Nextcloud zelf heeft. Elke taal die Nextcloud kent, is te kiezen, niet alleen talen waarvoor IntroVox al een vertaalbestand heeft. Een beheerder kan dus een override schrijven voor een taal die nog geen vertaling heeft.

Vóór v1.6.0 had IntroVox een vaste lijst van taalcodes met namen (en vlag-emoji). Sinds v1.6.0 levert Nextcloud de namen, in de taal van de beheerder (een Engelstalige beheerder ziet "German", een Duitstalige "Deutsch"). Zonder vlaggen, zoals in de instellingen van Nextcloud.

## Engelse bronteksten als msgid (sinds v1.6.0)

Vóór v1.6.0 gebruikte de standaardinhoud nietszeggende sleutels:

```js
t('introvox', 'step_welcome_title')   // ← slecht, vertalers zien een sleutel
```

Vertalers konden niet weten wat `step_welcome_title` moest betekenen. Sinds v1.6.0 *is* de Engelse brontekst de msgid:

```js
t('introvox', '👋 Welcome to Nextcloud')   // ← goed, vertalers zien echte tekst
```

Dat geldt voor alle titels en teksten van de standaardstappen, alle teksten van de beheer- en persoonlijke instellingen, de knop "Begrepen" die eerst in het Nederlands vastlag (nu `t('introvox', 'Got it')`), en de teksten van de stap over installeren als app (PWA): die stap herkent het besturingssysteem en de browser van de gebruiker en geeft daar passende uitleg bij, en zijn teksten in `src/utils/deviceDetection.js` en `src/components/wizardSteps.js` waren vóór v1.6.0 vaste Nederlandse teksten.

**Eigen stappen die al opgeslagen zijn** in `oc_appconfig.wizard_steps_<lang>` veranderen hier **niet** door: alleen de ingebouwde standaardstappen gebruiken deze teksten.

## Een nieuwe taal, of een fout in een vertaling

- **Een fout in een vertaling, of een taal waarmee je wilt helpen:** de vertalingen worden bijgehouden in de Weblate van VoxCloud. Open een issue op [GitHub](https://github.com/nextcloud/IntroVox/issues) met de taal, de Engelse tekst en wat er zou moeten staan. Een verbetering bereikt gebruikers met de volgende release van IntroVox, zodra hun beheerder de app heeft bijgewerkt.
- **Eigen tekst voor één taal:** een beheerder kan in de stappen-editor een override `wizard_steps_<lang>` toevoegen voor elke taal die Nextcloud ondersteunt, ook een taal zonder vertaling. De override gaat voor tot hij hersteld wordt; daarna nemen de vertaalde standaardstappen het weer over. Zie [Talenbeheer](../admin/language-management.nl.md).

## Geschiedenis

- **Van v1.6.0 tot november 2026: Transifex.** Vanaf v1.6.0 deed IntroVox mee in het Transifex-project van Nextcloud (resource `nextcloud/introvox`). Vanaf v1.7.0 zette de sync-bot van Nextcloud de vertalingen in de repository ([docker-ci#938](https://github.com/nextcloud/docker-ci/issues/938)); 2.0.0 kwam uit met een eigen pull, gemaakt op de releasedag, met elke taal die vertalingen had.
- **Sinds 24 november 2026: de Weblate van VoxCloud.** De vertalingen zijn verhuisd naar de eigen Weblate van VoxCloud, en de `.po`-bestanden horen sindsdien bij de repository. Er is niets verloren gegaan: dezelfde 107 talen zijn overgezet, zonder verschillen. Eén Belarussische vertaling, van een tekst die in oktober uit de code verdween, staat in het vertaalgeheugen van Weblate.

## Zie ook

- [Meertaligheid](../features/multi-language.nl.md): hoe de talen werken voor gebruikers
- [Talenbeheer](../admin/language-management.nl.md): overrides van de beheerder
- [Frontend-architectuur](frontend-architecture.nl.md): hoe vertalingen in de browser laden
