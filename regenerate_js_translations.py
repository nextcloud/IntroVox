#!/usr/bin/env python3
"""Regenerate l10n/*.js from l10n/*.json.

Dynamically discovers every language file present, so newly synced Transifex
languages (e.g. pt.json, ko.json) are picked up without code changes.
"""
import glob
import json
import os

# Plural form expressions for languages where the default rule is wrong.
# Anything not listed here falls back to DEFAULT_PLURAL.
PLURAL_OVERRIDES = {
    'fr': 'nplurals=2; plural=(n > 1);',
    'pt': 'nplurals=2; plural=(n > 1);',
    'pt_BR': 'nplurals=2; plural=(n > 1);',
    'ja': 'nplurals=1; plural=0;',
    'ko': 'nplurals=1; plural=0;',
    'zh': 'nplurals=1; plural=0;',
    'zh_CN': 'nplurals=1; plural=0;',
    'zh_TW': 'nplurals=1; plural=0;',
    'pl': 'nplurals=3; plural=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);',
    'ru': 'nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);',
    'cs': 'nplurals=3; plural=(n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2;',
    'ar': 'nplurals=6; plural=n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5;',
}
DEFAULT_PLURAL = 'nplurals=2; plural=(n != 1);'

for json_file in sorted(glob.glob('l10n/*.json')):
    lang = os.path.splitext(os.path.basename(json_file))[0]
    js_file = f'l10n/{lang}.js'
    plural_form = PLURAL_OVERRIDES.get(lang, DEFAULT_PLURAL)

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    translations = data['translations']

    js_content = 'OC.L10N.register(\n    "introvox",\n    {\n'

    entries = []
    for key, value in translations.items():
        escaped_key = key.replace('\\', '\\\\').replace('"', '\\"')
        escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
        entries.append(f'    "{escaped_key}" : "{escaped_value}"')

    js_content += ',\n'.join(entries)
    js_content += f'\n}},\n"{plural_form}");\n'

    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f'Generated {js_file} ({len(entries)} strings)')

print('All .js translation files regenerated successfully!')
