# npm audit — verantwoording bij 1.7.7

Datum: 2026-08-26 · Audit-stand: 7 kwetsbaarheden (6 high, 1 moderate)

Dit is de "expliciet verantwoord"-notitie die de OWASP-gate (A03, Software
Supply Chain Failures) vraagt. Conclusie vooraf: **niets hiervan is fixbaar en
niets raakt IntroVox in de praktijk.** Geen release-blocker.

## Waarom `npm audit fix` niet helpt

`npm audit fix` verandert **nul** pakketten (`added: 0, removed: 0, changed: 0`)
en laat alle 7 meldingen staan. De reden is simpel: voor de twee pakketten die
er echt toe doen bestaat nog geen gepatchte versie.

| pakket | geïnstalleerd | laatste op npm | gepatcht? |
|---|---|---|---|
| `axios` | 1.19.0 | **1.19.0** | nee — advisory loopt vóór de fix uit |
| `dompurify` | 3.4.14 | **3.4.14** | nee — idem |

We draaien al op de nieuwste `@nextcloud/axios` (2.6.0) en `@nextcloud/l10n`
(3.4.1). Ook de nieuwste `@nextcloud/vue` (9.10.0) eist nog `dompurify ^3.4.14`.
Er is dus letterlijk niets om naar te upgraden.

Forceren met `--force` is bovendien een bekend risico in deze repo: dat brak de
build al eens door een `@nextcloud/dialogs`-bump (zie RELEASE_CHECKLIST.md,
"npm audit fix broke the build").

## Vier van de zeven zitten niet in de app

Geverifieerd door de gebouwde bundles te doorzoeken (`grep` op `js/*.js`):

| pakket | in `js/*.js`? | rol |
|---|---|---|
| `postcss` | **nee** | build-time CSS, via `@vue/compiler-sfc` + `css-loader` |
| `nanoid` | **nee** | transitief onder postcss |
| `fast-uri` | **nee** | webpack → schema-utils → ajv |
| `brace-expansion` | **nee** | webdav → minimatch |
| `axios` | ja | HTTP-client |
| `dompurify` | ja | via `@nextcloud/vue` / `@nextcloud/l10n` |
| `form-data` | ja | transitief onder axios |

De eerste vier draaien alleen op de buildmachine en komen nooit bij een
gebruiker terecht. Hun advisories (path traversal via sourceMappingURL, DoS bij
`{}`-expansie) vereisen dat een aanvaller je build-input beheerst — wie dat kan,
heeft al een groter probleem.

## De drie die wel meegaan, raken onze code niet

**axios** — de meeste advisories gaan over `formDataToJSON`, `FormData`-
serialisatie, `maxBodyLength` bij streamed uploads, en `NO_PROXY`/proxy-gedrag
in de **Node**-adapter. IntroVox doet 9× `axios.get` en 15× `axios.post`, allemaal
met een plat JSON-object naar de eigen app-endpoints, in de **browser**. Geen
`FormData`, geen multipart, geen streams, geen proxy-config. Geverifieerd met
grep op `src/`.

**dompurify** — IntroVox roept DOMPurify nergens zelf aan; het zit alleen
transitief in `@nextcloud/vue` en `@nextcloud/l10n`. De sanitatie van
wizard-content gebeurt server-side in PHP (`sanitizeStep()`). Wordt hier een
bypass relevant, dan is dat een Nextcloud-breed probleem dat upstream opgelost
moet worden, niet in deze app.

**form-data** — CRLF-injectie via multipart veldnamen. We versturen geen
multipart; zie axios hierboven.

## Wat er wél moet gebeuren

Niets voor 1.7.7. Bij de **volgende** release opnieuw `npm audit` draaien: zodra
`axios > 1.19.0` of `dompurify > 3.4.14` verschijnt, gewoon meenemen via een
normale `npm update` — en daarna **rebuilden én opnieuw deployen naar nc-dev
vóór het taggen**, precies zoals de checklist voorschrijft.
