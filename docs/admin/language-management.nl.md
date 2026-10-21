# Talenbeheer

Sinds v1.7.0 werkt IntroVox vanzelf in elke taal die Nextcloud kent. De standaardinhoud van de wizard wordt vertaald via Transifex, en gebruikers zien hem in hun Nextcloud-taal zonder dat een beheerder iets hoeft te doen.

Beheerders kunnen **overrides per taal** maken: eigen tekst die de standaardinhoud vervangt, alleen voor die ene taal. Overrides zijn de uitzondering; de meeste installaties hebben er nooit een nodig. In de Nederlandse interface heet een override een *eigen versie* (**Taalspecifieke versie toevoegen**, **Talen met een eigen versie**).

## Hoe de talen werken (kort)

- **De standaardinhoud** komt uit aanroepen van `$l->t('…')` in `lib/Service/DefaultStepsService.php`. De Engelse bronteksten gaan naar `translationfiles/templates/introvox.pot` en worden vertaald op Transifex (`nextcloud/introvox`).
- **Gebruikers krijgen de wizard altijd in hun Nextcloud-taal**: eerst de volledige taal (`pt_BR`), dan de basistaal (`pt`), en Engels als er voor geen van beide een vertaling is. De beheerder zet geen talen aan, en er is geen schifting per gebruiker.
- **Overrides van de beheerder** staan in de database (`oc_appconfig`, sleutel `wizard_steps_<lang>`). Eén rij per taal met een override; is er geen rij, dan krijgt de gebruiker de standaardstappen die op Transifex vertaald zijn.

## Een override voor een taal toevoegen

1. Ga naar **Instellingen → Beheer → IntroVox → Tours** en klik bij de **Welcome tour** op **Stappen bewerken**.
2. Klik op **Taalspecifieke versie toevoegen**.
3. Typ om te zoeken in de volledige lijst met Nextcloud-talen, kies een taal en klik op **Eigen versie toevoegen**.
4. De stappen-editor schakelt naar die taal en toont de huidige standaardinhoud als begin.
5. Pas de stappen aan. De override-rij wordt gemaakt bij de eerste wijziging die je opslaat, niet eerder; een taal kiezen en weer afhaken kost dus niets.

De keuzelijst **Taal** toont alleen talen die nu een override hebben (plus Engels, altijd). Hij toont nooit direct de volledige lijst van 100+ talen.

Deze pagina gaat over de welkomsttour. Een tour voor een app werkt net zo in zijn eigen stappen-editor, maar alleen de ingebouwde tours hebben automatisch vertaalde standaardstappen. Elke andere app-tour heeft alleen de stappen die je zelf schrijft, en wie een taal heeft zonder eigen stappen, krijgt de hoofdtaal van de tour. Een ingebouwde tour geeft gebruikers zijn vertaalde stappen zolang hun taal, de basistaal daarvan en de hoofdtaal van de tour geen eigen stappen van jou hebben. Zie [Tours](tours.nl.md).

## Een override weggooien

Een taal teruggeven aan de automatisch vertaalde standaardstappen:

1. Kies de taal in de keuzelijst.
2. Klik op **Herstellen**.
3. Bevestig.

De rij `wizard_steps_<lang>` wordt verwijderd. Gebruikers in die taal zien nu de standaardstappen van Transifex, ook de nieuwe vertalingen die er sinds het schrijven van de override bij zijn gekomen.

## Hoe de taaldetectie werkt

Als een gebruiker Nextcloud opent, doet IntroVox dit:

1. Leest de taal van de gebruiker via `IFactory::findLanguage(null)` (bv. `pt_BR`): de taal die de gebruiker koos, niet een taal waarvoor IntroVox toevallig een bestand heeft.
2. Maakt een kort lijstje: de volledige taal, dan de basistaal (`pt_BR`, dan `pt`).
3. Zoekt in die volgorde een override: `wizard_steps_pt_BR`, dan `wizard_steps_pt` in `oc_appconfig`.
4. **Er is een override** → stuurt de eerste die hij vindt zoals hij is, zonder uitgeschakelde stappen en zonder stappen voor groepen waar de gebruiker niet in zit.
5. **Geen override voor allebei** → stuurt de standaardstappen (`DefaultStepsService::getForLanguage()`) in de eerste van die talen die een vertaling op Transifex heeft, gemaakt met de vertaler van Nextcloud (`IFactory`). Heeft geen van beide er een, dan krijgt de gebruiker Engels, nooit de standaardtaal van de server.

Een override voor `pt` geldt dus ook voor gebruikers met `pt_BR`, tenzij `pt_BR` een eigen override heeft. Sinds 2.0.0: daarvoor telden alleen de eerste twee letters van de taal, zodat een override of vertaling voor `pt_BR` of `zh_CN` nooit getoond werd.

Zie [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php) en [DefaultStepsService](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/DefaultStepsService.php) voor de code.

## Upgrade-opmerkingen voor installaties die van 1.6.x komen

In 1.6.x bewaarde het openen van het tabblad Steps stilletjes de standaardinhoud van de tour in `oc_appconfig`, zodat herordenen werkte. Daardoor hebben de meeste 1.6.x-installaties zes rijen in de database (en/nl/de/da/fr/sv) die precies gelijk zijn aan de standaardstappen van 1.6.x van dat moment.

Na de upgrade naar 1.7.0:

- Staan die zes rijen in de keuzelijst met talen van de stappen-editor van de welkomsttour, als **overrides**.
- Blijft de wizard werken; gebruikers merken geen verschil.
- Maar **krijgen die zes talen geen nieuwe vertalingen van Transifex** zolang de override-rij er is. De standaardtekst van 1.6.x blijft bevroren in de database.

Zo komt een van die zes talen weer helemaal van Transifex:

1. Open **Tours** en klik bij de **Welcome tour** op **Stappen bewerken**.
2. Kies de taal in de keuzelijst.
3. Klik op **Herstellen**.

Dat verwijdert de rij; vanaf dan komen updates van Transifex vanzelf door.

Heb je een van die zes talen in 1.6.x echt aangepast, laat hem dan staan: het is een echte override, en **Herstellen** gooit je werk weg.

De oude sleutel `enabled_languages` in de appconfig wordt door 1.7.0 genegeerd, maar blijft in de database staan zodat terugzetten naar een oudere versie veilig is. Je kunt hem met de hand weghalen:

```bash
occ config:app:delete introvox enabled_languages
```

## Een taal toevoegen die nog niet op Transifex staat

Je hoeft niet op Transifex te wachten: een override werkt voor elke taal die Nextcloud kent, ook als Transifex de teksten van IntroVox nog niet vertaald heeft. Voeg een override toe, schrijf de tekst zelf en sla op. Gebruikers in die taal zien jouw override; gebruikers in andere talen blijven zien wat Transifex levert (of Engels).

Komt er later een vertaling op Transifex voor die taal, dan **wint** jouw override. Reset de override als je de eigen tekst niet meer nodig hebt.

## Voorbeelden van overrides

- **Tips per regio**: Nederlandse gebruikers krijgen stappen die Nederlandse cloudaanbieders noemen; internationale gebruikers zien de algemene, vertaalde tekst.
- **Eigen woorden per organisatie**: een instelling wil "Welkom bij ACME Cloud" in plaats van "Welkom bij Nextcloud", alleen voor haar eigen gebruikers.
- **Gaten in de vertaling**: een taal die Transifex nog niet heeft; de beheerder schrijft hem zelf als override tot er een vertaling op Transifex is.

## Zie ook

- [Meertaligheid](../features/multi-language.nl.md): details van de Transifex-integratie
- [Transifex-integratie](../architecture/transifex-integration.nl.md): hoe vertalen werkt
- [Tourstappen beheren](managing-steps.nl.md): stappen per taal bewerken
- [Instellingen](settings.nl.md): de instellingen voor beheerders
