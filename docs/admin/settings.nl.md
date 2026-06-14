# Beheerder-instellingen-referentie

Referentie voor elke optie in **Instellingen → Beheer → IntroVox**.

## Globale instellingen

### Wizard inschakelen voor alle gebruikers

**Locatie:** bovenaan de beheer-pagina onder "Globale instellingen"

**Functie:** master-schakelaar voor de hele wizard.

| Staat | Gedrag |
|---|---|
| ✅ Aangevinkt | Wizard is ingeschakeld. Nieuwe gebruikers zien hem automatisch bij eerste login (in hun ingeschakelde taal). Alle gebruikers kunnen hem herstarten via persoonlijke instellingen. |
| ☐ Uitgevinkt | Wizard is volledig uitgeschakeld. Geen auto-start, geen handmatige herstart. Gebruikers zien "De introductie-tour is momenteel uitgeschakeld door je beheerder." |

**Opslag:** `appconfig`-key `wizard_enabled` (`'true'` / `'false'`)

**Use-case:** handig tijdens onderhoud of wanneer je de onboarding-ervaring tijdelijk wilt uitschakelen zonder je stap-configuratie te verliezen.

### Beschikbare talen

**Locatie:** onder de wizard-toggle in "Globale instellingen"

**Functie:** multi-checkbox die regelt voor welke talen de wizard beschikbaar is.

**Out-of-the-box ondersteunde talen:**

- 🇬🇧 Engels (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Duits (`de`)
- 🇫🇷 Frans (`fr`)
- 🇩🇰 Deens (`da`)
- 🇸🇪 Zweeds (`sv`)

Extra talen verschijnen automatisch zodra hun `l10n/<lang>.json`-bestand aanwezig is — zie [Meertaligheid](../features/multi-language.md).

**Defaults:**

- Bij eerste installatie is alleen **Engels** ingeschakeld
- Er moet altijd minstens één taal ingeschakeld blijven

**Opslag:** `appconfig`-key `enabled_languages` (JSON-array van base-taalcodes)

### Wizard tonen aan alle gebruikers

**Locatie:** onder "Beschikbare talen" in "Globale instellingen"

**Functie:** forceer-herstart van de wizard voor **alle gebruikers**, inclusief wie expliciet opt-out hebben gedaan.

**Effect wanneer geklikt (en bevestigd):**

- Verhoogt de interne wizard-versie-teller (`wizard_version`)
- Wist elk de permanent-uitschakelen-voorkeur van elke gebruiker
- Volgende login: wizard start automatisch voor iedereen

> **Waarschuwing:** dit overruled alle gebruikers-voorkeuren. Gebruikers die "Introductie-tour permanent uitschakelen" hebben aangevinkt zien de wizard weer.

## Taal-instellingen

### Taal selecteren om te bewerken

**Locatie:** sectie "Taal-instellingen", dropdown-menu

**Functie:** kiest welke taal-stap-configuratie je bewerkt. De stap-lijst onder de dropdown herlaadt voor de geselecteerde taal.

**Gedrag:**

- Alleen ingeschakelde talen verschijnen in de dropdown
- Wijzigingen gelden alleen voor de **geselecteerde taal**
- Als je van taal wisselt met niet-opgeslagen wijzigingen, krijg je een waarschuwing

Voor volledige per-taal-configuratie-details zie [Talenbeheer](language-management.md).

## Stap-beheer

De stap-beheer-sectie is uitgewerkt in [Wizard-stappen beheren](managing-steps.md). De beschikbare controls zijn:

| Control | Actie | Referentie |
|---|---|---|
| **➕ Nieuwe stap toevoegen** | Maak een nieuwe wizard-stap | [Stappen beheren → Toevoegen](managing-steps.md#nieuwe-stap-toevoegen) |
| **✏️ Bewerken** | Wijzig een bestaande stap | [Stappen beheren → Bewerken](managing-steps.md#stap-bewerken) |
| **🗑️ Verwijderen** | Verwijder een stap | [Stappen beheren → Verwijderen](managing-steps.md#stap-verwijderen) |
| **☰** sleep-handle | Stappen herordenen | [Stappen beheren → Herordenen](managing-steps.md#stappen-herordenen) |
| **✅ / ❌** toggle | Individuele stappen aan/uitschakelen | [Stappen beheren → Aan/uitschakelen](managing-steps.md#stap-aanuitschakelen) |
| **📥 Exporteren** | Download stappen als JSON | [Import/Export](import-export.md#wizard-stappen-exporteren) |
| **📤 Importeren** | Upload stappen vanuit JSON | [Import/Export](import-export.md#wizard-stappen-importeren) |
| **🔄 Reset naar default** | Herstel fabrieks-defaults voor de geselecteerde taal | [Stappen beheren → Reset](managing-steps.md#reset-naar-default) |
| **💾 Wijzigingen opslaan** | Persisteer alle aanpassingen | [Stappen beheren → Opslaan](managing-steps.md#wijzigingen-opslaan) |

## Waar instellingen worden opgeslagen

| Instelling | Backend-opslag |
|---|---|
| Globale aan/uit | `appconfig` → `wizard_enabled` |
| Ingeschakelde talen | `appconfig` → `enabled_languages` (JSON-array) |
| Wizard-versie (force-show) | `appconfig` → `wizard_version` (integer) |
| Stappen per taal | `appconfig` → `wizard_steps_<lang>` (JSON-array) |
| Per-gebruiker permanent uitschakelen | `preferences`-tabel (user-scoped) |

Zie [Backend-architectuur](../architecture/backend-architecture.md) voor het volledige opslag-model.
