# Translations / Vertalingen

IntroVox uses Nextcloud's localization system to support multiple languages.

## How it works

1. **PHP templates** use `$l->t('string')` for translations
2. **Vue components** use `t('introvox', 'string')` from `@nextcloud/l10n`
3. **Translation files** are stored in the `l10n/` directory as JSON files

## Available languages

Currently available:
- English (en.json) - source language
- Nederlands (nl.json) - Dutch translation

## Contributing translations

IntroVox uses **Transifex** for community translations. To contribute:

1. Visit the Nextcloud Transifex project: https://www.transifex.com/nextcloud/nextcloud/
2. Find the `introvox` resource
3. Select your language and start translating

## For developers

### Adding new translatable strings

**In PHP:**
```php
<?php p($l->t('Your string here')); ?>
```

**In Vue components:**
```vue
<template>
  <div>{{ t('Your string here') }}</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

export default {
  setup() {
    const trans = (key) => t('introvox', key)
    return { t: trans }
  }
}
</script>
```

### Updating translation files

After adding new strings:
1. Update `l10n/en.json` with the English source text
2. Update `l10n/nl.json` (or other languages) with translations
3. Push to Transifex: `tx push -s` (uploads source)
4. Pull from Transifex: `tx pull -a` (downloads all translations)

## Translation file format

```json
{
    "translations": {
        "English source text": "Translated text",
        "Another string": "Another translation"
    }
}
```

## Nextcloud language detection

IntroVox automatically uses the language set in the user's Nextcloud preferences. No manual language selection is needed.
