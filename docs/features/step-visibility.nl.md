# Stap-zichtbaarheid

Stap-zichtbaarheid in IntroVox wordt bepaald door drie gelaagde controls — elk waarvan een stap voor een bepaalde gebruiker kan verbergen.

## Laag 1 — stap-niveau in-/uitschakelen

Elke stap heeft een in-/uitschakelen-toggle (✅/❌) in de admin-stap-lijst.

- **Uitgeschakelde stappen** (`enabled: false`) worden server-side uitgefilterd en nooit naar enige gebruiker gestuurd
- **Ingeschakelde stappen** gaan door naar de volgende laag

Dit is een simpel tijdelijk-verberg-mechanisme voor seizoens- of in-ontwikkeling-stappen. Zie [Wizard-stappen beheren](../admin/managing-steps.md#stap-aanuitschakelen).

## Laag 2 — groep-gebaseerde zichtbaarheid (v1.2.0+)

Elke stap heeft een **Zichtbaar voor groepen**-veld — een multi-select van Nextcloud-groepen.

- **Lege selectie** (default) — stap is zichtbaar voor **alle gebruikers**
- **Eén of meer groepen** — stap is alleen zichtbaar voor gebruikers in **minstens één** van die groepen

Filtering gebeurt in [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php):

```php
$userGroups = $this->groupManager->getUserGroupIds($user);
$steps = array_filter($steps, function($step) use ($userGroups) {
    if (!isset($step['visibleToGroups']) || empty($step['visibleToGroups'])) {
        return true;  // zichtbaar voor iedereen
    }
    return !empty(array_intersect($step['visibleToGroups'], $userGroups));
});
```

Omdat filtering server-side gebeurt, kunnen gebruikers verborgen stappen ook niet via browser-developer-tools zien. Zie [Groep-gebaseerde zichtbaarheid](../admin/group-visibility.md) voor use-cases en configuratie.

## Laag 3 — gebruikers-voorkeuren

Elke gebruiker kan zijn eigen tour-ervaring beheren via persoonlijke instellingen.

### Permanent uitschakelen

Indien gezet start de wizard niet automatisch voor die gebruiker. Ze kunnen nog steeds handmatig herstarten via persoonlijke instellingen.

**Gezet door:**

- De **"Overslaan en niet meer tonen"**-knop in de eerste stap
- De **"Introductie-tour permanent uitschakelen"**-checkbox in **Persoonlijke instellingen → IntroVox**
- De tour voltooien (klikken op **Klaar** in de laatste stap)

**Gewist door:**

- De **Wizard tonen aan alle gebruikers**-knop van de beheerder (wist de voorkeur voor iedereen)
- Handmatig uitvinken van de persoonlijke-instellingen-checkbox

### LocalStorage-voltooiings-status

De frontend gebruikt localStorage om per-browser tour-voltooiing te tracken:

- `seen` — gebruiker heeft tour gesloten met ✕ (verschijnt opnieuw bij volgende login)
- `completed` — gebruiker klikte op **Klaar** of **Overslaan en niet meer tonen** (start niet automatisch)

LocalStorage is per browser, dus een gebruiker die van browser wisselt kan de tour opnieuw zien. De server-side permanent-uitschakelen-voorkeur is de gezaghebbende staat.

## Wizard-versie-teller

De `wizard_version`-appconfig-waarde wordt verhoogd wanneer beheerders op **Wizard tonen aan alle gebruikers** klikken. De frontend vergelijkt hem met de versie die hij voor het laatst zag en toont de tour opnieuw als nieuwer — ook aan gebruikers die hem hebben voltooid. Dit is het mechanisme waarmee beheerders de tour voor iedereen kunnen forceer-herstarten.

## Lagen combineren

De drie lagen worden gecombineerd:

| Stap-staat | Groep-beperking | Gebruikers-opt-out | Resultaat |
|---|---|---|---|
| Ingeschakeld | Geen | Nee | Gebruiker ziet de stap |
| Ingeschakeld | Gebruiker in groep | Nee | Gebruiker ziet de stap |
| Ingeschakeld | Gebruiker niet in groep | (irrelevant) | Gebruiker ziet de stap niet |
| Ingeschakeld | Geen | Permanent uitschakelen | Tour start niet automatisch; bij handmatige herstart ziet gebruiker de stap |
| Uitgeschakeld | (elk) | (elk) | Niemand ziet de stap |

## Zie ook

- [Groep-gebaseerde zichtbaarheid](../admin/group-visibility.md) — configuratie-gids
- [Wizard-stappen beheren](../admin/managing-steps.md) — in-/uitschakelen-toggle
- [Persoonlijke instellingen](../user/personal-settings.md) — gebruikers-controls
- [API-referentie](../architecture/api-reference.md) — filtering-implementatie
