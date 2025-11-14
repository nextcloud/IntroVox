#!/usr/bin/env python3
import json
import os

# Language configurations
languages = {
    'en': 'nplurals=2; plural=(n != 1);',
    'nl': 'nplurals=2; plural=(n != 1);',
    'de': 'nplurals=2; plural=(n != 1);',
    'fr': 'nplurals=2; plural=(n > 1);',
    'da': 'nplurals=2; plural=(n != 1);',
    'sv': 'nplurals=2; plural=(n != 1);'
}

for lang, plural_form in languages.items():
    json_file = f'l10n/{lang}.json'
    js_file = f'l10n/{lang}.js'
    
    # Read JSON file
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    translations = data['translations']
    
    # Generate JS content
    js_content = 'OC.L10N.register(\n    "introvox",\n    {\n'
    
    entries = []
    for key, value in translations.items():
        # Escape special characters for JavaScript
        escaped_key = key.replace('\\', '\\\\').replace('"', '\\"')
        escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
        entries.append(f'    "{escaped_key}" : "{escaped_value}"')
    
    js_content += ',\n'.join(entries)
    js_content += f'\n}},\n"{plural_form}");\n'
    
    # Write JS file
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f'Generated {js_file}')

print('All .js translation files regenerated successfully!')
