# FAQ (gebruikers)

Veelgestelde vragen van IntroVox-gebruikers.

## Algemeen

### Moet ik de tour doen?

Nee, hij is optioneel. Je kunt hem op elk moment overslaan, of **Start tours by themselves** uitzetten in **Persoonlijke instellingen → IntroVox**, dan start er geen tour meer vanzelf.

### Hoe lang duurt de tour?

Meestal 2–5 minuten, afhankelijk van hoeveel stappen je beheerder heeft geconfigureerd.

### Kan ik de tour pauzeren en later doorgaan?

Je kunt hem sluiten met **✕** en later opnieuw starten via **Persoonlijke instellingen → IntroVox**: **Tour nu herstarten** voor de welkomsttour, **Start again** voor een tour voor een app. Hij begint dan bij de eerste stap: de tour onthoudt je plek niet, dus je kunt hem het beste in één keer doen. De pagina verversen is anders: dan gaat de tour verder bij de stap waar hij was.

### Zie ik de tour elke keer dat ik inlog?

Nee. Heb je de welkomsttour voltooid of **Overslaan en niet meer tonen** gekozen, dan start hij niet meer vanzelf. Sluiten met **✕** stopt hem alleen in deze browser. Een tour voor een app start één keer vanzelf, en je beheerder kan hem later laten starten: alleen voor nieuwe accounts, een aantal dagen na je eerste login, of alleen tussen twee datums.

### Waarom startte er een tour toen ik een app opende?

Je beheerder heeft een korte tour voor die app gemaakt. Die start één keer vanzelf, de eerste keer dat je de app opent, tenzij je beheerder hem alleen voor nieuwe accounts, pas een aantal dagen na je eerste login of alleen tussen twee datums laat starten. Een tour die "overal" start, komt als tip op de eerstvolgende pagina die je opent. Wil je een tour nog eens zien, ga dan naar **Persoonlijke instellingen → IntroVox** en klik onder **Tours** op **Start again** bij die tour. **Tours** in je gebruikersmenu leidt daar ook heen.

### Iemand stuurde me een link naar een tour. Wat doet die?

Die opent de app van de tour en start de tour daar, ook als je hem al zag of **Start tours by themselves** uit hebt gezet. Ben je niet ingelogd, dan log je eerst in. Is de tour niet voor jou bedoeld, dan kom je op je startpagina, zonder tour.

### Wat is de lijst "Aan de slag" op mijn Dashboard?

Je beheerder heeft een lijst toegevoegd met de eerste dingen om te doen in Nextcloud, zoals een bestand uploaden of een profielfoto toevoegen. Elke taak linkt naar de plek waar je hem doet, en vinkt zichzelf af zodra je hem gedaan hebt. Met **Put it on every Dashboard** verschijnt hij vanzelf alleen bij nieuwe accounts en bij iedereen die zijn Dashboard nooit heeft ingericht; ieder ander voegt hem toe onder **Aanpassen** op zijn Dashboard. Heb je er niets aan? Haal hem daar weg; op dezelfde manier zet je hem terug.

## Inhoud

### Waarom zie ik niet alle features die in de tour worden genoemd?

Een paar mogelijke redenen:

- Je Nextcloud-instantie heeft mogelijk niet alle apps geïnstalleerd
- Je beheerder kan bepaalde stappen voor specifieke groepen hebben geconfigureerd (en jij zit niet in zo'n groep)
- Stappen voor een app die je niet kunt openen, vallen weg. Een stap waarvan het element er nog niet is, wacht in de hoek; zie [Stappen die wachten](taking-the-tour.nl.md#stappen-die-wachten)

De tour toont alleen wat relevant is voor jou.

### Kan ik aanpassen wat de tour toont?

Nee — alleen beheerders kunnen tour-content aanpassen. Heb je niets aan de tours, zet dan **Start tours by themselves** uit.

### Wordt de tour bijgewerkt wanneer Nextcloud nieuwe features toevoegt?

Je beheerder bepaalt wat er in de tour staat. Na grote Nextcloud-upgrades kunnen ze **Show again to everyone** gebruiken om iedereen een bijgewerkte tour te geven. Heb je **Start tours by themselves** uitgezet, dan start hij bij jou niet vanzelf; je kunt hem wel herstarten via je persoonlijke instellingen.

## Technisch

### Werkt de tour offline?

Nee, je hebt een actieve verbinding met Nextcloud nodig om hem te gebruiken.

### Welke browsers worden ondersteund?

Alle moderne browsers: Chrome, Firefox, Safari, Edge (laatste versies).

### Verzamelt de tour data over mij?

Alleen wat IntroVox nodig heeft om te weten welke tours je krijgt, en hoe ver je kwam, bewaard bij je Nextcloud-account; zie hieronder. Je beheerder ziet alleen totalen.

### Kan ik de tour met screenreaders gebruiken?

Ja — IntroVox is ontworpen om toegankelijk te zijn en werkt met JAWS, NVDA en VoiceOver. Zie [Toetsenbord-navigatie](keyboard-navigation.nl.md).

## Privacy

### Waar wordt mijn tour-voorkeur opgeslagen?

Op twee plekken:

1. **Je browser-localStorage** — of je de welkomsttour in deze browser hebt afgemaakt of gesloten
2. **Nextcloud-server**, in je eigen voorkeuren:
   - voor de welkomsttour en elke tour voor een app: of je hem startte, afmaakte of oversloeg, en wanneer
   - hoe ver je kwam de laatste keer dat een tour vanzelf startte
   - je instelling **Start tours by themselves**
   - voor de lijst **Aan de slag** op het Dashboard: de taken van je beheerder die je vanuit de lijst opende, en dat je een eerste bestand uploadde

### Wat gebeurt er met mijn data als ik de tour uitschakel?

**Start tours by themselves** uitzetten zorgt alleen dat tours niet meer vanzelf starten. Wat hierboven staat blijft, dus de tours die je zag blijven gemarkeerd als gezien. Het verdwijnt met je account, en voor één tour als je beheerder die tour verwijdert.

### Kan mijn beheerder zien of ik de tour heb voltooid?

Niet in IntroVox. Het paneel **Statistieken** toont alleen totalen per tour: hoeveel mensen hem startten, afmaakten en oversloegen, en hoeveel er bij elke stap kwamen. Niemand kan daar zien hoe ver jij kwam. Deelt je beheerder anonieme gebruiksstatistieken, dan zijn dat ook totalen voor de hele server.

## Zie ook

- [Overzicht](overview.nl.md)
- [De tour doorlopen](taking-the-tour.nl.md)
- [Persoonlijke instellingen](personal-settings.nl.md)
- [Problemen oplossen](troubleshooting.nl.md)
- [Tips om het beste uit Nextcloud te halen](tips.nl.md)
