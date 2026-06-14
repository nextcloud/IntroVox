# Problemen oplossen (gebruikers)

Veelvoorkomende problemen die gebruikers met IntroVox ervaren en hoe je ze oplost. Voor admin-side problemen, zie [Beheer-troubleshooting](../admin/troubleshooting.md).

## Tour start niet

**Probleem:** de tour verschijnt niet bij eerste login.

**Probeer:**

1. Wacht 2–3 seconden — de tour start automatisch na een korte vertraging
2. Ververs de pagina (`Ctrl+R` / `Cmd+R`)
3. Zorg dat je op de **dashboard**-pagina staat (daar start de tour)
4. Probeer handmatig starten via **Persoonlijke instellingen → IntroVox → Tour nu herstarten**

Als de tour nog steeds niet verschijnt, heeft je beheerder hem mogelijk uitgeschakeld of jouw taal niet ingeschakeld. Neem contact op.

## Stappen ontbreken of worden overgeslagen

**Probleem:** sommige stappen verschijnen niet tijdens de tour.

**Dit is meestal normaal.** Mogelijke redenen:

- De Nextcloud-app voor die stap is niet geïnstalleerd
- Je beheerder heeft bepaalde stappen uitgeschakeld
- Sommige UI-elementen zijn niet zichtbaar in jouw weergave
- De stap is beperkt tot specifieke gebruikersgroepen, en je zit niet in een daarvan

De tour toont automatisch alleen de stappen die relevant zijn voor jouw setup en rol.

## Tekst niet in mijn taal

**Probleem:** de tour toont Engelse tekst maar je hebt een andere Nextcloud-taal geselecteerd.

**Probeer:**

1. Check je Nextcloud-taal: **Persoonlijke instellingen → Taal**
2. Hard-refresh de pagina: `Ctrl+Shift+R` (Windows) of `Cmd+Shift+R` (Mac)
3. Neem contact op met je beheerder — die moet mogelijk jouw taal inschakelen

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

Dit is verwacht als je de tour hebt gesloten met de **✕**-knop in plaats van hem te voltooien, of als je browser localStorage wist tussen sessies.

**Oplossingen:**

- Voltooi de tour volledig (klik op **Klaar** in de laatste stap), of
- Klik in de eerste stap op **Overslaan en niet meer tonen**, of
- Vink **"Introductie-tour permanent uitschakelen"** aan in **Persoonlijke instellingen → IntroVox**

## Eerder getoonde stappen blijven achter de huidige stap zichtbaar (v1.6.1-fix)

**Probleem:** elke nieuwe stap stapelt op — oude stappen blijven zichtbaar onder de huidige.

Dit was een bug die in v1.4.0 werd geïntroduceerd en in v1.6.1 is opgelost. Als je hem ziet, vraag je beheerder om IntroVox naar v1.6.1 of hoger te upgraden.

## Zie ook

- [FAQ](faq.md) — veelgestelde vragen
- [Persoonlijke instellingen](personal-settings.md) — herstarten en uitschakelen
- [Beheer-troubleshooting](../admin/troubleshooting.md) — als je beheerder bent
