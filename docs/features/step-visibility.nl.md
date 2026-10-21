# Stap-zichtbaarheid

Stap-zichtbaarheid in IntroVox wordt bepaald door drie gelaagde controls — elk waarvan een stap voor een bepaalde gebruiker kan verbergen.

## Laag 1 — stap-niveau in-/uitschakelen

Elke stap heeft een schakelaar in de lijst met stappen.

- **Uitgeschakelde stappen** (`enabled: false`) worden server-side uitgefilterd en nooit naar enige gebruiker gestuurd
- **Ingeschakelde stappen** gaan door naar de volgende laag

Dit is een simpel tijdelijk-verberg-mechanisme voor seizoens- of in-ontwikkeling-stappen. Zie [Tourstappen beheren](../admin/managing-steps.nl.md#stap-aan-uitschakelen).

## Laag 2 — groep-gebaseerde zichtbaarheid (v1.2.0+)

Elke stap heeft een veld **Zichtbaar voor groepen** (Visible to groups): een keuzelijst met meerdere Nextcloud-groepen.

- **Lege selectie** (default) — stap is zichtbaar voor **alle gebruikers**
- **Eén of meer groepen** — stap is alleen zichtbaar voor gebruikers in **minstens één** van die groepen

Het filteren gebeurt op de server, in [StepValidator::visibleTo()](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/StepValidator.php), voor de welkomsttour en voor tours voor apps:

```php
foreach ($steps as $step) {
    $groups = is_array($step) ? ($step['visibleToGroups'] ?? []) : null;
    if (!self::isEnabled($step) || !is_array($groups) || ($groups !== [] && array_intersect($groups, $groupIds) === [])) {
        continue;  // uitgezet, een kapotte groepenlijst, of niet voor de groepen van deze gebruiker
    }
    unset($step['visibleToGroups']);  // de groeps-id's blijven op de server
    $visible[] = $step;
}
```

Omdat het filteren op de server gebeurt, kunnen gebruikers verborgen stappen ook niet via de ontwikkelaarstools van hun browser zien, en de groeps-id's komen nooit in de browser. Een stap met een kapotte groepenlijst blijft weg. Zie [Groep-gebaseerde zichtbaarheid](../admin/group-visibility.nl.md) voor use-cases en configuratie.

Een tour voor een app kun je ook als geheel tot groepen beperken, met **Zichtbaar voor** in de instellingen van de tour. Wie niet in die groepen zit, krijgt de tour helemaal niet. Zie [Tours](../admin/tours.nl.md).

## Laag 3 — gebruikers-voorkeuren

Elke gebruiker kan zijn eigen tour-ervaring beheren via persoonlijke instellingen.

### Welkomsttour klaar (`wizard_disabled`)

Indien gezet start de welkomsttour niet automatisch voor die gebruiker. Die kan hem nog steeds handmatig herstarten via persoonlijke instellingen. Op tours voor apps heeft dit geen invloed.

**Gezet door:**

- De knop **Overslaan en niet meer tonen** in de eerste stap
- De tour voltooien (klikken op **Klaar** in de laatste stap)
- **Start tours by themselves** uitzetten in **Persoonlijke instellingen → IntroVox**

**Gewist door:**

- **Show again to everyone** bij de **Welcome tour** (wist de voorkeur voor iedereen)
- **Tour nu herstarten** in persoonlijke instellingen

### Start tours by themselves (`tours_disabled`)

Een schakelaar in **Persoonlijke instellingen → IntroVox**, standaard aan. Zet de gebruiker hem uit, dan start er voor die gebruiker geen tour meer vanzelf: de welkomsttour niet, en de tours voor apps ook niet. Elke tour kan nog wel met de hand gestart worden via persoonlijke instellingen. Alleen de gebruiker zelf kan hem weer aanzetten; **Show again to everyone** verandert er niets aan.

### LocalStorage-voltooiings-status

De frontend houdt de staat van de welkomsttour per browser bij, in localStorage:

- `introvox_completed`: de gebruiker heeft de tour in deze browser afgerond met **Klaar**, overgeslagen met **Overslaan en niet meer tonen**, of gesloten met ✕. Hier start hij niet meer vanzelf
- `introvox_version`: de `wizard_version` van dat moment. Een nieuwere versie op de server toont de tour opnieuw

Alleen **Klaar** en **Overslaan en niet meer tonen** zetten ook `wizard_disabled` op de server. Wie de tour met ✕ sloot, krijgt hem in een andere browser opnieuw. De server-side voorkeur `wizard_disabled` is de gezaghebbende staat.

Een tour voor een app wordt alleen op de server bijgehouden, per gebruiker: is hij eenmaal gestart, dan start hij niet meer vanzelf, in geen enkele browser, tot een beheerder **Show again to everyone** bij die tour gebruikt.

## Wizard-versie-teller

De `wizard_version`-appconfig-waarde wordt verhoogd wanneer een beheerder **Show again to everyone** bij de **Welcome tour** gebruikt. De frontend vergelijkt hem met de versie die hij voor het laatst zag en toont de tour opnieuw als nieuwer — ook aan gebruikers die hem hebben voltooid. Dit is het mechanisme waarmee beheerders de tour voor iedereen kunnen forceer-herstarten, behalve voor gebruikers die **Start tours by themselves** hebben uitgezet.

## Lagen combineren

De drie lagen worden gecombineerd:

| Stap-staat | Groep-beperking | Gebruikers-opt-out | Resultaat |
|---|---|---|---|
| Ingeschakeld | Geen | Nee | Gebruiker ziet de stap |
| Ingeschakeld | Gebruiker in groep | Nee | Gebruiker ziet de stap |
| Ingeschakeld | Gebruiker niet in groep | (irrelevant) | Gebruiker ziet de stap niet |
| Ingeschakeld | Geen | Welkomsttour klaar, of **Start tours by themselves** uit | Tour start niet automatisch; bij handmatige herstart ziet gebruiker de stap |
| Uitgeschakeld | (elk) | (elk) | Niemand ziet de stap |

## Zie ook

- [Groep-gebaseerde zichtbaarheid](../admin/group-visibility.nl.md) — configuratie-gids
- [Tourstappen beheren](../admin/managing-steps.nl.md) — de schakelaar van een stap
- [Persoonlijke instellingen](../user/personal-settings.nl.md) — gebruikers-controls
- [API-referentie](../architecture/api-reference.nl.md) — filtering-implementatie
