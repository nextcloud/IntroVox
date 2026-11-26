# Meertaligheid

Sinds v1.7.0 is elke taal waarvoor IntroVox een vertaling heeft vanzelf beschikbaar voor gebruikers. De vertalingen worden bijgehouden in de Weblate van VoxCloud en komen mee met de app. Beheerders zetten geen talen aan of uit; ze beheren alleen *overrides*: eigen tekst die voor één taal de standaardtekst vervangt, als ze dat willen.

## Hoe de talen werken

Het model in één alinea:

> Elke Nextcloud-gebruiker krijgt de wizard in zijn Nextcloud-taal. IntroVox probeert eerst de volledige taal van de gebruiker (`pt_BR`), dan de basistaal (`pt`), dan Engels. De standaardtekst wordt vertaald via `$l->t()`, uit de vertalingen die met IntroVox meekomen in `l10n/`. Een beheerder kan een override `wizard_steps_<lang>` opslaan; overrides worden per basistaal gemaakt, dus een override voor `pt` bedient ook gebruikers met `pt_BR` of `pt_PT`. Een override vervangt de standaardtekst alleen voor die taal.

IntroVox heeft geen eigen lijst met "ondersteunde talen". De lijst is wat in Weblate vertalingen heeft, plus Engels (altijd). Elke zo'n taal gaat mee, hoe ver de vertaling ook is: er is geen minimumpercentage, en wat nog niet vertaald is, verschijnt in het Engels. Een vertaling die na een release in Weblate gemaakt wordt, bereikt gebruikers met de volgende release van IntroVox.

## Taaldetectie

[`ApiController::getWizardSteps()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) roept `IFactory::findLanguage(null)` aan (bewust niet `findLanguage('introvox')`), zodat hij de taal krijgt die de gebruiker echt koos, zonder dat Nextcloud stilletjes overstapt op een taal waarvoor IntroVox toevallig een bestand heeft. De stappen:

1. Lees de taal van de gebruiker via `IFactory::findLanguage(null)`, bv. `pt_BR`
2. Maak de kandidaten: de volledige taal, dan de basistaal: `pt_BR`, `pt`
3. Zoek `wizard_steps_pt_BR`, dan `wizard_steps_pt` in `oc_appconfig`
4. **Er is een override** → stuur de eerste die gevonden wordt (na het filteren op groepen)
5. **Geen override** → neem de eerste kandidaat waarvoor IntroVox een vertaling heeft (`IFactory::languageExists()`): `pt_BR`, anders `pt`, anders **Engels** (niet de standaardtaal van het systeem). [`DefaultStepsService::getForLanguage()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php) maakt dan de acht standaardstappen in die taal via `IFactory::get('introvox', <lang>)`

Vóór 2.0.0 telde alleen de basistaal, dus een vertaling voor `pt_BR` of `zh_CN` bereikte nooit iemand.

## Terugvaltabel

| Taal van de gebruiker | Override van de beheerder? | Wat de gebruiker ziet |
|---|---|---|
| `nl` | ja | De inhoud van `wizard_steps_nl` van de beheerder, zoals hij is |
| `nl_BE` | ja, voor `nl` | De override voor `nl`: overrides gelden per basistaal |
| `nl` | nee | De vertaalde standaardstappen (of Engels als er geen Nederlandse vertaling is) |
| `pt_BR` | nee | De vertaling `pt_BR`; zonder die vertaling de basistaal `pt`, anders Engels |
| `pt_BR` | ja, voor `pt` | De override voor `pt`: een override gaat voor elke vertaalde standaardtekst |
| `it` | nee, en geen Italiaanse vertaling | De Engelse standaardstappen (bewuste terugval op `en`) |
| `xx` (ongeldig) | n.v.t. | De Engelse standaardstappen |

De bewuste terugval op Engels voorkomt dat een Italiaanse gebruiker onverwacht een Nederlandse tour krijgt, wat de standaardcontrole van `findLanguage()` in Nextcloud anders zou doen.

Alles hierboven gaat over de welkomsttour. Een tour voor een app heeft geen vertaalde standaardstappen: hij heeft alleen de stappen die een beheerder heeft geschreven. Een gebruiker krijgt die in zijn eigen taal, anders in de basistaal, anders in de hoofdtaal van de tour. De ingebouwde tours zijn de uitzondering: zolang geen van die talen eigen stappen van de beheerder heeft, krijgen gebruikers de ingebouwde stappen, vertaald in hun eigen taal, of in het Engels zolang een vertaling ontbreekt. Zie [Tours](../admin/tours.nl.md).

## Een override voor een taal toevoegen (beheerder)

Overrides per taal staan in de database, niet in Weblate. Het is eigen tekst voor deze installatie, die een beheerder zelf schrijft.

1. Ga naar **Instellingen → Beheer → IntroVox → Tours** en klik bij de **Welcome tour** op **Stappen bewerken**
2. Klik op **Taalspecifieke versie toevoegen** (Add language override)
3. Zoek in de volledige lijst met Nextcloud-talen, kies een taal en klik op **Eigen versie toevoegen**
4. De editor toont de standaardstappen in die taal (in het Engels zolang er geen vertaling is) als begin. Pas ze aan; de override wordt geschreven bij de eerste wijziging die je opslaat

Een override weggooien en teruggaan naar de vertaalde standaardstappen: kies de taal → klik op **Herstellen** (Reset) → bevestig.

Zie [Talenbeheer](../admin/language-management.nl.md) voor de hele werkwijze.

## Hoe vertalen werkt

Voor de standaardtekst van de tours (de acht standaardstappen van de welkomsttour, de stappen van de ingebouwde tours, en alle teksten van de beheer- en persoonlijke instellingen):

1. Wie bronteksten wijzigt, draait `npm run pot` en commit `translationfiles/templates/introvox.pot` met de code
2. Zodra dat op `main` staat, haalt Weblate de nieuwe teksten vanzelf op
3. Bij een release krijgt elke string die nog leeg is een eerste vertaling door AI (Claude), in de talen die gebruikers van Nextcloud het meest kiezen; mensen controleren die vertalingen in Weblate, en vertalers vertalen daar ook. Een vertaling van een mens wordt nooit vervangen
4. Weblate commit de vertalingen (`translationfiles/<lang>/introvox.po`) op de branch `l10n/weblate` en opent een pull request; CI bouwt daaruit `l10n/<lang>.json` + `l10n/<lang>.js` op die branch, zonder de teksten die nog nagekeken moeten worden
5. De pull request wordt gemerged, en de volgende release van IntroVox bevat de nieuwe vertalingen; gebruikers in die taal krijgen ze vanzelf

Een fout in een vertaling gezien, of wil je helpen met een taal? Open een issue op [GitHub](https://github.com/nextcloud/IntroVox/issues).

**Een opgeslagen welkomsttour houdt zijn eigen tekst.** Heeft een beheerder de welkomsttour voor een taal opgeslagen (een override, zie [Een override voor een taal toevoegen](#een-override-voor-een-taal-toevoegen-beheerder)), dan blijven gebruikers in die taal die tekst zien, ook als een release nieuwe of betere vertalingen meebrengt: vertalingen komen alleen in talen zonder opgeslagen tour. Wil je dat een taal de vertaalde standaardstappen weer krijgt, kies dan de taal en klik op **Herstellen**.

Voor overrides van een beheerder doet Weblate **niet** mee. Elke override is eigen tekst die de beheerder alleen voor zijn eigen installatie schrijft.

## Vertaalbestanden

De repo bevat:

- **`translationfiles/templates/introvox.pot`**: het POT-sjabloon, door de translationtool van Nextcloud gehaald uit alle aanroepen van `$l->t()` en `t('introvox', ...)` (`npm run pot`)
- **`translationfiles/<lang>/introvox.po`**: de vertalingen van één taal; alleen Weblate schrijft hierin
- **`l10n/<lang>.json`** en **`l10n/<lang>.js`**: wat Nextcloud laadt, door CI gebouwd uit de `.po`-bestanden (`scripts/l10n-sync.mjs build`); nooit met de hand bewerkt
- **`.l10nignore`**: mappen die translationtool overslaat bij het maken van de POT

Zie [Vertalingen](../architecture/translations.nl.md) voor de hele keten, en voor hoe het vóór november 2026 ging.

## Teksten van de standaardstappen als msgid

Sinds v1.6.0 gaan de acht standaardstappen van de welkomsttour door `t('introvox', '<Engelse bron>')` (in [`DefaultStepsService::build()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php)). De Engelse brontekst *is* de msgid, zodat vertalers echte zinnen zien in plaats van nietszeggende sleutels als `step_welcome_title`.

Eigen stappen die al opgeslagen zijn (in `oc_appconfig.wizard_steps_<lang>`) staan daar los van en veranderen niet door nieuwe vertalingen.

## Namen in de override-keuzelijst

De keuzelijst van **Taalspecifieke versie toevoegen** toont talen in hun eigen naam (bv. "Nederlands", "Português") via `OCP\L10N\IFactory::getLanguages()`. Elke taal die Nextcloud kent, is te kiezen, één keer per basistaal (`en_GB` valt samen met `en`), niet alleen talen die al een IntroVox-vertaling hebben. Een beheerder kan dus een override schrijven voor een taal die nog geen vertaling heeft; die override blijft voorgaan als er later een vertaling komt, en dan geeft **Herstellen** de taal terug aan de vertaalde standaardstappen.

## Upgrade-opmerkingen (1.6.x → 1.7.0)

Versies vóór 1.7.0 bewaarden de standaardinhoud van de tour vanzelf in `oc_appconfig` zodra de beheerder het tabblad Steps opende. Na de upgrade gelden die rijen, die precies gelijk zijn aan de oude standaardstappen, als overrides (en staan ze in de keuzelijst met talen). Ze blijven werken, maar **krijgen geen nieuwe vertalingen meer** voor die talen, tot de beheerder op **Herstellen** klikt. Zie [Talenbeheer](../admin/language-management.nl.md#upgrade-opmerkingen-voor-installaties-die-van-16x-komen).

## Zie ook

- [Talenbeheer](../admin/language-management.nl.md): de hele werkwijze voor overrides, plus upgrade-opmerkingen
- [Vertalingen](../architecture/translations.nl.md): hoe vertalen werkt
- [API-referentie](../architecture/api-reference.nl.md): endpoints die met talen werken
