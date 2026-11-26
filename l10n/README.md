# Translations

IntroVox is translated in VoxCloud's Weblate. **Do not edit the files in this folder**: they are
generated.

## How it works

1. **Source strings live in the code**, in American English:
   - JS and Vue: `t('introvox', 'Text')` and `n('introvox', 'One item', '%n items', count)` from
     `@nextcloud/l10n`, with the app id and the text as literals;
   - PHP: `$l->t('Text')` and `$l->n('One item', '%n items', $count)`.
2. **`npm run pot`** builds `translationfiles/templates/introvox.pot` with Nextcloud's own
   translationtool (`scripts/l10n-sync.mjs pot`). Commit it with the code.
3. **Weblate** picks up the new strings once they are on `main`. At release time a translation
   maintainer has AI (Claude) make the first translation of the strings that have none yet, and
   uploads it to Weblate; people review it there (design `l10n/RULES.md` L25). Weblate writes
   `translationfiles/<lang>/introvox.po`, the source of the translations.
4. **CI builds this folder** from the `.po` files (`scripts/l10n-sync.mjs build`, translationtool's
   `convert-po-files`): `<lang>.js` for the browser and `<lang>.json` for PHP. A translation marked
   as needing editing is left out. Every language ships; a string that is not translated yet shows
   in English.

`node scripts/l10n-sync.mjs check` fails when the POT or this folder is out of date.

## Adding a string

- Use the call forms above. A helper with another name (`trans()`, `this.t()`, `$t()`) or a
  variable as the text is invisible to translationtool, so the string never reaches translators.
- A string of one or two words gets a hint on the line directly above the call:
  ```js
  // TRANSLATORS: Button that starts the tour
  t('introvox', 'Start')
  ```
  In a Vue `<template>`, use `<!-- TRANSLATORS: … -->` on the line above.
- Whole sentences with placeholders (`{name}`), never strings glued together.
- Then run `npm run pot` and commit the POT with `l10n/.source-strings.json` and
  `l10n/.source-count.json`. The build fails while they are behind the code.

## File format

```json
{
    "translations": {
        "English source text": "Translated text",
        "_%n item_::_%n items_": ["%n item", "%n items"]
    },
    "pluralForm": "nplurals=2; plural=(n != 1);"
}
```

A plural key is `_singular_::_plural_`, with one form per plural form of the language.

## Language

IntroVox uses the language set in the user's Nextcloud preferences. The steps of a tour come in that
language, else its base language (`de` for `de_DE`), else the tour's main language.

## Helping

Found a translation error, or want to help translate? Open an issue.
