# Mobiel

IntroVox werkt op telefoons en tablets — de layout past zich aan aan kleine schermen en touch-input.

## Responsive design

- **Tablets** — volledige tour-ervaring met een licht aangepaste layout
- **Smartphones** — vereenvoudigde layout geoptimaliseerd voor kleine schermen
- **Touch-gebaren** — tik op knoppen in plaats van klikken

## Mobiel-specifiek gedrag

- **Grotere touch-targets** — knoppen zijn op grootte voor makkelijk tikken
- **Volle-breedte-stappen** — stappen nemen het grootste deel van het scherm in voor leesbaarheid
- **Gestapelde knoppen** — Terug/Volgende worden verticaal gestapeld op zeer smalle schermen
- **Intern scrollen voor lange stappen** — sinds v1.5.0 scrolt de body van elke stap binnen de stap-container terwijl de header en sluit-knop vast blijven staan. Dit betekent dat je altijd de **✕**-knop en de navigatie-knoppen kunt bereiken, ook bij stappen met veel content.

## Tips

- 📱 Houd je apparaat in **portrait-modus** voor de beste ervaring
- 📱 Tik op **✕** om de tour te sluiten als je eerst wilt rondkijken
- 📱 Gebruik de **Terug**- en **Volgende**-knoppen — swipe-gebaren worden niet ondersteund

## Bekende mobiele issues (opgelost)

Vóór v1.5.0 kon zeer lange stap-content op mobiel gebruikers vastzetten: de overlay blokkeerde pagina-scroll, maar de stap zelf scrolde ook niet, waardoor de sluit-knop onbereikbaar werd. Dit is opgelost in v1.5.0 door de stap een `max-height` te geven (`100dvh - 16px` op mobiel), de header/footer vast te zetten en de body intern te laten scrollen.

Als je dit probleem nog steeds ziet, vraag je beheerder om IntroVox naar v1.5.0 of hoger te upgraden.

## Zie ook

- [De tour doorlopen](taking-the-tour.md) — tour-navigatie
- [Toetsenbord-navigatie](keyboard-navigation.md) — hardware-toetsenbord-ondersteuning (relevant op tablets)
- [Problemen oplossen](troubleshooting.md) — wanneer er iets mis gaat
