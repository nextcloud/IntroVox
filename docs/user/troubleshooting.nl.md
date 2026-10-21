# Problemen oplossen (gebruikers)

Veelvoorkomende problemen die gebruikers met IntroVox ervaren en hoe je ze oplost. Voor admin-side problemen, zie [Beheer-troubleshooting](../admin/troubleshooting.nl.md).

## Tour start niet

**Probleem:** de tour verschijnt niet bij eerste login.

**Probeer:**

1. Wacht 2–3 seconden — de tour start automatisch na een korte vertraging
2. Ververs de pagina (`Ctrl+R` / `Cmd+R`)
3. Open een andere pagina, zoals Bestanden: de welkomsttour start op de eerste pagina die je na het inloggen opent, welke app dat ook is
4. Controleer of **Start tours by themselves** aan staat in **Persoonlijke instellingen → IntroVox**
5. Probeer handmatig starten via **Persoonlijke instellingen → IntroVox → Tour nu herstarten**

Als de tour nog steeds niet verschijnt, heeft je beheerder hem mogelijk voor iedereen uitgeschakeld. Neem contact op.

## Tour voor een app start niet

**Probleem:** je opent een app die een tour heeft, maar de tour verschijnt niet.

Een tour voor een app start alleen vanzelf de eerste keer dat je die app opent, en nooit bovenop de welkomsttour: heb je de welkomsttour nog niet gehad, dan krijg je die eerst, en de tour van de app bij een later bezoek. Je beheerder kan hem ook alleen voor nieuwe accounts, pas een aantal dagen na je eerste login, of alleen tussen twee datums laten starten. Wil je hem (opnieuw) zien, ga dan naar **Persoonlijke instellingen → IntroVox**, zoek hem onder **Tours** en klik op **Start** of **Start again**. Staat de tour van de app daar niet, dan is hij niet voor jou bedoeld of heeft je beheerder hem niet aangezet.

## Stappen ontbreken

**Probleem:** sommige stappen verschijnen niet tijdens de tour.

**Dit is meestal normaal.** Mogelijke redenen:

- De stap hoort bij een app die je niet kunt openen, of die niet geïnstalleerd is
- Je beheerder heeft bepaalde stappen uitgeschakeld
- De stap is beperkt tot specifieke gebruikersgroepen, en je zit niet in een daarvan

De tour toont automatisch alleen de stappen die relevant zijn voor jouw setup en rol.

## Een stap wacht in de hoek

**Probleem:** een stap staat rechtsonder (linksonder zolang er een venster open is) in plaats van ergens naar te wijzen.

De stap wacht op het deel van de pagina waar hij over gaat. Vaak verschijnt dat pas als je iets gedaan hebt, zoals een gesprek aanmaken of de details van een bestand openen. De pagina blijft bruikbaar: doe wat de stap zegt, en de stap schuift erheen zodra het verschijnt. **Volgende** gaat ook zonder het element verder.

## Geen knop Volgende, of Volgende werkt niet

**Probleem:** een stap heeft geen knop **Volgende** (Next), of je kunt er niet op klikken.

De stap vraagt je iets te doen:

- "Klik op het gemarkeerde element om verder te gaan.": klik op het deel van de pagina met de rand en het knipperende pijltje. De tour gaat dan vanzelf verder.
- "Vul het gemarkeerde veld in om verder te gaan.": typ iets in het veld. **Volgende** werkt zodra het veld tekst heeft.

Staat het element niet op de pagina, dan werkt **Volgende** gewoon, zodat je nooit vastloopt.

## Tekst niet in mijn taal

**Probleem:** de tour toont Engelse tekst maar je hebt een andere Nextcloud-taal geselecteerd.

**Meest waarschijnlijke oorzaak:** de tekst van de tour is voor jouw taal nog niet vertaald op [Transifex](https://www.transifex.com/nextcloud/nextcloud/). IntroVox valt dan terug op Engels, zodat je altijd leesbare tekst krijgt. Iedereen kan op Transifex meevertalen. Nieuwe vertalingen bereiken je met de volgende release van IntroVox, zodra je beheerder de app heeft bijgewerkt.

**Andere dingen om te proberen:**

1. Check je Nextcloud-taal: **Persoonlijke instellingen → Taal**
2. Hard-refresh de pagina: `Ctrl+Shift+R` (Windows) of `Cmd+Shift+R` (Mac)
3. Heeft je beheerder eigen stappen voor jouw taal geschreven, vraag dan of die opgeslagen zijn

## Tour-venster te klein of te groot

**Probleem:** het tour-venster past niet goed op je scherm.

**Probeer:**

1. **Uitzoomen** als het venster te groot is: `Ctrl+−` / `Cmd+−`
2. **Inzoomen** als de tekst te klein is: `Ctrl++` / `Cmd++`
3. Probeer een andere browser (Chrome, Firefox, Safari, Edge worden officieel ondersteund)

## Kan de tour niet sluiten

**Probleem:** de sluit-knop (✕) werkt niet.

**Probeer:**

1. Druk op **Escape** op je toetsenbord
2. Ververs de pagina (`Ctrl+R` / `Cmd+R`)
3. Klik in de eerste stap op **Overslaan en niet meer tonen**

## Tour verschijnt elke keer dat ik inlog

**Probleem:** je hebt de tour al doorlopen, maar hij blijft verschijnen.

Sluit je de welkomsttour met **✕** of Escape, dan onthoudt alleen deze browser dat. De tour komt terug in een andere browser of op een ander apparaat, en ook in deze browser als die zijn sitegegevens wist tussen sessies, zoals een privévenster doet.

**Oplossingen:**

- Voltooi de tour volledig (klik op **Klaar** in de laatste stap), of
- Klik in de eerste stap op **Overslaan en niet meer tonen**, of
- Zet **Start tours by themselves** uit in **Persoonlijke instellingen → IntroVox** (dan start er geen tour meer vanzelf, ook geen tour voor een app)

## Zie ook

- [FAQ](faq.nl.md) — veelgestelde vragen
- [Persoonlijke instellingen](personal-settings.nl.md) — herstarten, tours voor apps starten, tours niet meer vanzelf laten starten
- [Beheer-troubleshooting](../admin/troubleshooting.nl.md) — als je beheerder bent
