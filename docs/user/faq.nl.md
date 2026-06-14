# FAQ (gebruikers)

Veelgestelde vragen van IntroVox-gebruikers.

## Algemeen

### Moet ik de tour doen?

Nee, hij is optioneel. Je kunt hem op elk moment overslaan of permanent uitschakelen.

### Hoe lang duurt de tour?

Meestal 2–5 minuten, afhankelijk van hoeveel stappen je beheerder heeft geconfigureerd.

### Kan ik de tour pauzeren en later doorgaan?

Ja. Klik op **✕** om hem te sluiten. De volgende keer dat je inlogt, start de tour weer vanaf het begin. Wil je je plek behouden, dan kun je hem het beste in één keer doen.

### Zie ik de tour elke keer dat ik inlog?

Alleen totdat je hem voltooit of **Overslaan en niet meer tonen** kiest. Daarna start hij niet meer automatisch.

## Inhoud

### Waarom zie ik niet alle features die in de tour worden genoemd?

Een paar mogelijke redenen:

- Je Nextcloud-instantie heeft mogelijk niet alle apps geïnstalleerd
- Je beheerder kan bepaalde stappen voor specifieke groepen hebben geconfigureerd (en jij zit niet in zo'n groep)
- Stappen met ontbrekende UI-elementen worden automatisch overgeslagen

De tour toont alleen wat relevant is voor jou.

### Kan ik aanpassen wat de tour toont?

Nee — alleen beheerders kunnen tour-content aanpassen. Je kunt de tour wel uitschakelen als hij niet nuttig voor je is.

### Wordt de tour bijgewerkt wanneer Nextcloud nieuwe features toevoegt?

Je beheerder bepaalt wat er in de tour staat. Na grote Nextcloud-upgrades kunnen ze **"Wizard tonen aan alle gebruikers"** gebruiken om iedereen een bijgewerkte tour te geven.

## Technisch

### Werkt de tour offline?

Nee, je hebt een actieve verbinding met Nextcloud nodig om hem te gebruiken.

### Welke browsers worden ondersteund?

Alle moderne browsers: Chrome, Firefox, Safari, Edge (laatste versies).

### Verzamelt de tour data over mij?

Geen persoonlijke data wordt verzameld. Alleen basisvoorkeuren (voltooid/uitgeschakeld-flags) worden lokaal in je browser en op de Nextcloud-server opgeslagen.

### Kan ik de tour met screenreaders gebruiken?

Ja — IntroVox is ontworpen om toegankelijk te zijn en werkt met JAWS, NVDA en VoiceOver. Zie [Toetsenbord-navigatie](keyboard-navigation.md).

## Privacy

### Waar wordt mijn tour-voorkeur opgeslagen?

Op twee plekken:

1. **Je browser-localStorage** — voltooiings-status
2. **Nextcloud-server** — permanent-uitschakelen-voorkeur (in de per-gebruiker-voorkeuren-tabel)

### Wat gebeurt er met mijn data als ik de tour uitschakel?

Alleen een enkele voorkeur-flag wordt opgeslagen op de server. Geen persoonlijke informatie of tour-voortgang-data wordt bewaard.

### Kan mijn beheerder zien of ik de tour heb voltooid?

Beheerders kunnen aggregate-telemetrie zien (geanonimiseerde gebruikers-aantallen en voltooiings-events, sinds v1.4.x), maar geen individuele gebruikers-voortgang.

## Zie ook

- [Overzicht](overview.md)
- [De tour doorlopen](taking-the-tour.md)
- [Persoonlijke instellingen](personal-settings.md)
- [Problemen oplossen](troubleshooting.md)
- [Tips om het beste uit Nextcloud te halen](tips.md)
