# Meertaligheid

Sinds v1.7.0 wordt IntroVox automatisch vertaald in elke taal die Nextcloud ondersteunt, via de Transifex-resource [`nextcloud/introvox`](https://www.transifex.com/nextcloud/nextcloud/). Beheerders zetten geen talen aan of uit; ze beheren alleen *overrides*: eigen tekst die voor één taal de standaardtekst vervangt, als ze dat willen.

## Hoe de talen werken

Het model in één alinea:

> Elke Nextcloud-gebruiker krijgt de wizard in zijn Nextcloud-taal. IntroVox probeert eerst de volledige taal van de gebruiker (`pt_BR`), dan de basistaal (`pt`), dan Engels. De standaardtekst wordt automatisch vertaald via `$l->t()`, uit de vertalingen op Transifex. Een beheerder kan een override `wizard_steps_<lang>` opslaan; overrides worden per basistaal gemaakt, dus een override voor `pt` bedient ook gebruikers met `pt_BR` of `pt_PT`. Een override vervangt de standaardtekst alleen voor die taal.

IntroVox heeft geen eigen lijst met "ondersteunde talen". De lijst is wat Transifex vertaald heeft, plus Engels (altijd). IntroVox 2.0.0 levert 105 talen mee, zoals ze op de releasedag op Transifex stonden, ook talen waarvan minder dan 25% van de teksten vertaald is; wat nog niet vertaald is, verschijnt in het Engels. Een vertaling die na een release op Transifex gemaakt wordt, bereikt gebruikers met de volgende release van IntroVox.

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
| `nl` | nee | De automatisch vertaalde standaardstappen van Transifex (of Engels als er geen Nederlandse vertaling is) |
| `pt_BR` | nee | De vertaling `pt_BR`; zonder die vertaling de basistaal `pt`, anders Engels |
| `pt_BR` | ja, voor `pt` | De override voor `pt`: een override gaat voor elke vertaalde standaardtekst |
| `it` | nee, en geen Italiaanse vertaling | De Engelse standaardstappen (bewuste terugval op `en`) |
| `xx` (ongeldig) | n.v.t. | De Engelse standaardstappen |

De bewuste terugval op Engels voorkomt dat een Italiaanse gebruiker onverwacht een Nederlandse tour krijgt, wat de standaardcontrole van `findLanguage()` in Nextcloud anders zou doen.

Alles hierboven gaat over de welkomsttour. Een tour voor een app heeft geen standaardstappen van Transifex: hij heeft alleen de stappen die een beheerder heeft geschreven. Een gebruiker krijgt die in zijn eigen taal, anders in de basistaal, anders in de hoofdtaal van de tour. De ingebouwde tours zijn de uitzondering: zolang geen van die talen eigen stappen van de beheerder heeft, krijgen gebruikers de ingebouwde stappen, vertaald in hun eigen taal, of in het Engels zolang een vertaling ontbreekt. Zie [Tours](../admin/tours.nl.md).

## Een override voor een taal toevoegen (beheerder)

Overrides per taal staan in de database, niet op Transifex. Het is eigen tekst voor deze installatie, die een beheerder zelf schrijft.

1. Ga naar **Instellingen → Beheer → IntroVox → Tours** en klik bij de **Welcome tour** op **Stappen bewerken**
2. Klik op **Taalspecifieke versie toevoegen** (Add language override)
3. Zoek in de volledige lijst met Nextcloud-talen, kies een taal en klik op **Eigen versie toevoegen**
4. De editor toont de standaardstappen in die taal (in het Engels zolang er geen vertaling is) als begin. Pas ze aan; de override wordt geschreven bij de eerste wijziging die je opslaat

Een override weggooien en teruggaan naar de automatisch vertaalde standaardstappen: kies de taal → klik op **Herstellen** (Reset) → bevestig.

Zie [Talenbeheer](../admin/language-management.nl.md) voor de hele werkwijze.

## Vertalen op Transifex

Voor de standaardtekst van de tours (de acht standaardstappen van de welkomsttour, de stappen van de ingebouwde tours, en alle teksten van de beheer- en persoonlijke instellingen):

1. We committen `translationfiles/templates/introvox.pot` naar GitHub
2. De Transifex-sync-bot van Nextcloud zet de POT op Transifex (resource: `nextcloud/introvox`)
3. Vertalers uit de community vertalen op Transifex
4. Dezelfde bot opent PR's die `l10n/<lang>.json` + `l10n/<lang>.js` terug in de repo zetten
5. De volgende release van IntroVox bevat de nieuwe vertalingen; gebruikers in die taal krijgen ze vanzelf

Voor overrides van een beheerder doet Transifex **niet** mee. Elke override is eigen tekst die de beheerder alleen voor zijn eigen installatie schrijft.

## Transifex-infrastructuur

De repo bevat:

- **`.tx/config`**: de configuratie van de Transifex-resource (PO-formaat, bron = Engels)
- **`translationfiles/templates/introvox.pot`**: het POT-sjabloon, gehaald uit alle aanroepen van `$l->t()` en `t('introvox', ...)`
- **`l10n/.gitkeep`**: houdt de map in git, ook als hij leeg is
- **`.l10nignore`**: wat de sync-bot overslaat
- **`scripts/po2l10n.py`**: een Python-hulpje dat de PO-bestanden van Transifex (`translationfiles/<lang>/introvox.po`) omzet in `l10n/<lang>.json` en `l10n/<lang>.js`, zoals de sync-bot dat doet

De sync is aangevraagd in [docker-ci#938](https://github.com/nextcloud/docker-ci/issues/938) en ging live met v1.7.0.

## Teksten van de standaardstappen als Transifex-msgids

Sinds v1.6.0 gaan de acht standaardstappen van de welkomsttour door `t('introvox', '<Engelse bron>')` (in [`DefaultStepsService::build()`](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php)). De Engelse brontekst *is* de Transifex-msgid, zodat vertalers echte zinnen zien in plaats van nietszeggende sleutels als `step_welcome_title`.

Eigen stappen die al opgeslagen zijn (in `oc_appconfig.wizard_steps_<lang>`) staan daar los van en veranderen niet door updates op Transifex.

## Namen in de override-keuzelijst

De keuzelijst van **Taalspecifieke versie toevoegen** toont talen in hun eigen naam (bv. "Nederlands", "Português") via `OCP\L10N\IFactory::getLanguages()`. Elke taal die Nextcloud kent, is te kiezen, één keer per basistaal (`en_GB` valt samen met `en`), niet alleen talen die al een IntroVox-vertaling hebben. Een beheerder kan dus een override schrijven voor een taal die Transifex nog niet vertaald heeft; die override wint tot er een vertaling op Transifex is, en dan geeft **Herstellen** de taal terug aan de standaardstappen.

## Upgrade-opmerkingen (1.6.x → 1.7.0)

Versies vóór 1.7.0 bewaarden de standaardinhoud van de tour vanzelf in `oc_appconfig` zodra de beheerder het tabblad Steps opende. Na de upgrade gelden die rijen, die precies gelijk zijn aan de oude standaardstappen, als overrides (en staan ze in de keuzelijst met talen). Ze blijven werken, maar **krijgen geen nieuwe vertalingen van Transifex meer** voor die talen, tot de beheerder op **Herstellen** klikt. Zie [Talenbeheer](../admin/language-management.nl.md#upgrade-opmerkingen-voor-installaties-die-van-16x-komen).

## Zie ook

- [Talenbeheer](../admin/language-management.nl.md): de hele werkwijze voor overrides, plus upgrade-opmerkingen
- [Transifex-integratie](../architecture/transifex-integration.nl.md): hoe de sync-bot werkt
- [API-referentie](../architecture/api-reference.nl.md): endpoints die met talen werken
