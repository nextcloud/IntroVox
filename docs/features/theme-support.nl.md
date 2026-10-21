# Thema-ondersteuning

IntroVox past zich automatisch aan aan alle Nextcloud-thema's. Geen configuratie nodig.

![IntroVox-tour in Nextcloud-dark-thema](../screenshots/dark-theme.png)

## Ondersteunde thema's

- ✅ **Light-modus** (default)
- ✅ **Dark-modus** (via systeem-voorkeur of Nextcloud-instelling)
- ✅ **Hoog-contrast-modus** (toegankelijkheid)
- ✅ **Custom thema's** (via de Nextcloud-Theming-app)

## Hoe het werkt

De wizard gebruikt Nextcloud's CSS-variabelen in plaats van hardcoded kleuren:

| Variabele | Doel |
|---|---|
| `--color-main-background` | Stap-achtergrond |
| `--color-main-text` | Body-tekst |
| `--color-primary-element` | Accent (knoppen, highlight-randen) |
| `--color-border` | Stap-container-rand |
| `--color-background-hover` | Hover-staten op knoppen |

Omdat deze variabelen scoped zijn aan het document en geüpdatet worden door het Nextcloud-theming-systeem, pakt de wizard automatisch elke thema-wijziging op — inclusief custom thema's gedeployed via de Theming-app.

## Toegankelijkheid

### Beperkte beweging

Als de "reduce motion"-toegankelijkheidsvoorkeur van het systeem van de gebruiker is ingeschakeld, staat de tour stil:

- Stappen verschijnen zonder in te faden
- Het pijltje en de rand rond het element van een stap staan stil
- GIF's en video's spelen niet vanzelf; ze starten met hun afspeelknop
- De tour springt naar een stap in plaats van soepel te scrollen, en de stappenlijst op de beheerpagina ook

Voor alle anderen knipperen het pijltje en de rand een paar keer en staan ze daarna ook stil, in plaats van te blijven knipperen zolang de stap er staat.

### Hoog contrast

In hoog-contrast-modus gebruikt de wizard verbeterde rand-diktes en kleur-contrasten om leesbaar te blijven.

### Toetsenbord-focus

Alle interactieve elementen hebben zichtbare focus-indicators die zich aanpassen aan het huidige thema — ze blijven duidelijk zichtbaar in zowel light- als dark-modus.

### Semantische HTML en ARIA

Stappen gebruiken semantische HTML (Shepherd rendert de titel als `<h3 class="shepherd-title">`, acties als `<button>`) en ARIA-labels waar nodig, zodat screenreaders content correct kunnen aankondigen.

## Custom CSS

IntroVox ondersteunt momenteel geen custom-CSS-overrides via het admin-paneel. Als je custom styling nodig hebt, kun je:

- De Nextcloud-Theming-app gebruiken om globale CSS-variabelen aan te passen (wijzigingen gelden automatisch voor IntroVox)
- Custom CSS deployen op Nextcloud-niveau (via de "Custom CSS"-feature van de Theming-app)

Inline-styles in stap-HTML worden verwijderd als de stap getoond wordt (zie [Inline-styles](customization.nl.md#inline-styles)), dus ze kunnen de thema-overerving niet breken. Gebruik in plaats daarvan de Theming-app.

## Zie ook

- [Customization](customization.nl.md) — HTML, CSS-selectors, positionering
- [Toetsenbord-navigatie](../user/keyboard-navigation.nl.md) — toegankelijkheids-features voor gebruikers
- [Architectuur-overzicht](../architecture/overview.nl.md) — hoe de frontend integreert met Nextcloud-theming
