# Beheerdersgids

Deze gids beschrijft dagelijks beheer van IntroVox. Voor installatie, zie de [Installatie-gids](../deployment/installation.md).

![IntroVox-beheer-interface](../screenshots/admin-interface.png)

## Overzicht

IntroVox is een interactieve onboarding-wizard die nieuwe Nextcloud-gebruikers helpt kernfeatures te ontdekken via een begeleide tour. Als beheerder bepaal jij:

- **Globale wizard-beschikbaarheid** — schakel de tour aan/uit voor iedereen
- **Taal-ondersteuning** — welke talen beschikbaar zijn, met per-taal-configuratie
- **Stap-beheer** — stappen toevoegen, bewerken, verwijderen, herordenen en in-/uitschakelen
- **Groep-gebaseerde zichtbaarheid** — beperk specifieke stappen tot bepaalde gebruikersgroepen (rol-gebaseerde onboarding)
- **Gebruiker-overrides** — forceer de tour te tonen aan alle gebruikers, ook wie hem hebben uitgeschakeld

## Beheerder-instellingen openen

1. Klik op je **gebruikers-avatar** rechtsboven
2. Selecteer **Instellingen** (⚙️)
3. Scroll naar beneden in de linker-sidebar naar **Beheer**
4. Klik op **IntroVox**

Je bent nu op de IntroVox-beheerder-pagina.

## Indeling van de beheer-interface

De beheer-interface bestaat uit drie hoofdsecties:

### 1. Globale instellingen

- **Wizard inschakelen voor alle gebruikers** — master-aan/uit-toggle ([Instellingen](settings.md))
- **Beschikbare talen** — checkboxes om specifieke talen aan/uit te zetten ([Talenbeheer](language-management.md))
- **Wizard tonen aan alle gebruikers** — forceer-tonen-knop die alle gebruikers-voorkeuren wist

### 2. Taal-selector

- Dropdown met alleen ingeschakelde talen
- Schakelt de stap-lijst naar de configuratie van de gekozen taal

### 3. Stap-beheer

- **Stap toevoegen** — nieuwe wizard-stappen aanmaken
- **Bewerken / verwijderen** — bestaande stappen wijzigen of verwijderen
- **Sleep-handle** — stappen herordenen
- **In-/uitschakelen-toggle** — stappen tijdelijk verbergen zonder ze te verwijderen
- **Exporteren / importeren** — configuraties delen als JSON ([Import/Export](import-export.md))
- **Reset naar default** — fabrieks-defaults herstellen voor de geselecteerde taal
- **Wijzigingen opslaan** — alle aanpassingen persisteren

Zie [Wizard-stappen beheren](managing-steps.md) voor details.

## Eindgebruiker-ervaring

### Automatische start

Wanneer de wizard is ingeschakeld en de taal van de gebruiker is ingeschakeld:

- Nieuwe gebruikers zien de wizard automatisch bij eerste login
- De wizard start op de dashboard-pagina
- Gebruikers kunnen de wizard op elk moment sluiten met **✕** of **Overslaan en niet meer tonen**

De wizard start automatisch voor gebruikers met een ingeschakelde taal — IntroVox detecteert de Nextcloud-taal-instelling van de gebruiker en toont stappen in die taal.

### Handmatige start

Gebruikers kunnen de wizard herstarten via **Persoonlijke instellingen → IntroVox → Tour nu herstarten**, en daarna de pagina vernieuwen.

### Gedrag wanneer wizard of taal is uitgeschakeld

Als je de wizard globaal uitschakelt of een taal van een gebruiker uitschakelt:

- Gebruikers zien de wizard **niet** automatisch
- In hun persoonlijke instellingen zien ze een bericht:
  - **Globaal uitgeschakeld**: "De introductie-tour is momenteel uitgeschakeld door je beheerder."
  - **Taal uitgeschakeld**: "De introductie-tour is niet beschikbaar in je taal."
- Ze kunnen de wizard niet handmatig starten

## Forceer-tonen van de wizard

De knop **Wizard tonen aan alle gebruikers** reset de wizard voor **alle gebruikers**, inclusief:

- Gebruikers die de wizard al hebben voltooid
- Gebruikers die hem permanent hebben uitgeschakeld in persoonlijke instellingen

Gebruik dit wanneer:

- Een grote Nextcloud-upgrade features toevoegt die het waard zijn om uit te lichten
- Je wizard-content significant hebt geüpdatet
- Een belangrijke bedrijfs-aankondiging brede zichtbaarheid nodig heeft

> **Waarschuwing:** dit overruled alle gebruikers-voorkeuren. Gebruikers die expliciet hebben opt-out zien de wizard bij hun volgende login.

## Volgende stappen

- [Instellingen-referentie](settings.md) — elke admin-optie in detail
- [Wizard-stappen beheren](managing-steps.md) — stap-CRUD en herordenen
- [Groep-gebaseerde zichtbaarheid](group-visibility.md) — rol-gebaseerde onboarding (v1.2.0+)
- [Import/Export](import-export.md) — configuraties delen
- [Best practices](best-practices.md) — content-richtlijnen
- [Problemen oplossen](troubleshooting.md) — veelvoorkomende issues
- [FAQ](faq.md) — veelgestelde vragen
