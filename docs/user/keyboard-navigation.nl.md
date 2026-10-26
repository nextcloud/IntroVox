# Toetsenbord-navigatie

IntroVox is volledig toegankelijk via het toetsenbord.

## Sneltoetsen

| Toets | Actie |
|---|---|
| `→` (pijltje naar rechts) | Naar de volgende stap; niet bij een stap die wacht tot je op zijn element klikt of zijn veld invult, net als de knop **Volgende** |
| `←` (pijltje naar links) | Naar de vorige stap |
| `Escape` | Tour sluiten |
| `Tab` | Focus verplaatsen tussen de knoppen en links van de stap |
| `Enter` of `Spatie` | Geselecteerde knop activeren |

De toetsen werken zolang de stap de focus heeft, en die krijgt hij als hij verschijnt. Hij pakt de focus niet af van een veld op de pagina waarin je typt. Op een video of zijn pauzeknop bedienen de pijltjestoetsen en `Spatie` de video.

## Toegankelijkheids-features

### Screenreader-ondersteuning

- Alle stappen hebben correcte ARIA-labels
- Headings, content en knoppen zijn semantisch gemarkeerd
- Werkt met populaire screenreaders (JAWS, NVDA, VoiceOver)

### Focus-indicators

- Een duidelijke zichtbare omlijning toont welke knop momenteel focus heeft
- Gebruik `Tab` om te wisselen tussen Terug, Volgende/Klaar en Sluiten

### Hoog-contrast-modus

De tour past zich automatisch aan aan je systeem-hoog-contrast-instellingen, met verbeterde randen en kleuren voor betere zichtbaarheid.

### Beperkte beweging

Als je systeem de "reduce motion"-toegankelijkheidsvoorkeur heeft ingeschakeld, schakelt IntroVox zijn animaties uit om motion sensitivity te voorkomen. Het pijltje dat naar een element wijst en de rand eromheen staan stil, GIF's en video's spelen niet vanzelf (gebruik hun afspeelknop), en de tour springt naar een stap in plaats van te scrollen.

## Zie ook

- [De tour doorlopen](taking-the-tour.nl.md) — tour-navigatie-overzicht
- [Mobiel](mobile.nl.md) — touch-gebaseerde interactie
- [Persoonlijke instellingen](personal-settings.nl.md) — herstarten en voorkeuren
