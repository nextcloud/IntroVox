#!/usr/bin/env python3
"""
One-shot l10n migration for IntroVox v1.5.0 → v1.6.0.

Two transformations:

1. Step-key migration: replace the 16 `step_*` keys with the new English
   source strings as msgid (Transifex-style). The pre-migration JSON files
   carry the translated value under the old key; we move it to the new key.

2. Dutch PWA pre-population: the wizard's PWA install step + getPWAInstructions()
   in deviceDetection.js previously contained hardcoded Dutch literals. The new
   code wraps them in t('introvox', '<English msgid>'). To preserve the Dutch
   user experience until Transifex sync delivers translations, we seed nl.json
   with the original Dutch text under each new English msgid.

For de/fr/da/sv we leave the new PWA msgids absent — they fall back to English
until Transifex translators fill them.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
L10N = ROOT / 'l10n'

# ---------------------------------------------------------------------------
# 1. step_* key remapping (source: l10n/en.json values for those keys)
# ---------------------------------------------------------------------------
# Keys in pre-migration JSON → new English msgid (= value in en.json).
STEP_KEY_MAP = {
    'step_welcome_title':  '👋 Welcome to Nextcloud',
    'step_welcome_text':   '<p>Nice to have you here! This short tour will help you get started quickly.</p><p>You can close this wizard at any time and open it again later.</p>',
    'step_files_title':    '📁 Files',
    'step_files_text':     '<p>This is your main menu. Click here to view and manage all your files.</p><p>You can upload files, create folders and share with others.</p>',
    'step_calendar_title': '📅 Calendar',
    'step_calendar_text':  "<p>Here you'll find your personal calendar.</p><p>Schedule appointments, set reminders and share your calendar with others.</p>",
    'step_search_title':   '🔍 Search',
    'step_search_text':    "<p>With the search bar you can quickly find files, contacts and more.</p><p>Just type what you're looking for and press Enter.</p>",
    'step_intro_title':    '🎯 Getting started',
    'step_intro_text':     '<p><strong>Nextcloud is your personal cloud storage!</strong></p><p>Here you can:</p><ul><li>📁 Upload, share and collaborate on files</li><li>📅 Manage your calendar</li><li>✉️ Send and receive email</li><li>👥 Keep track of contacts</li></ul>',
    'step_features_title': '✨ Important features',
    'step_features_text':  '<p><strong>Navigation:</strong></p><ul><li>Use the <strong>main menu</strong> (left) to switch between apps</li><li>Click on your <strong>username</strong> (top right) for settings</li><li>Use the <strong>search bar</strong> to quickly find files</li></ul>',
    'step_tips_title':     '💡 Useful tips',
    'step_tips_text':      '<p><strong>Did you know:</strong></p><ul><li>You can upload files by dragging them to your browser</li><li>You can directly share files with a link</li><li>You can also use Nextcloud as an app on your phone</li><li>All your data is stored privately and securely</li></ul>',
    'step_complete_title': '🎉 Done!',
    'step_complete_text':  "<p>You're all set to get started!</p><p>If you want to see this tour again, you can find it in your personal settings.</p><p>Have fun with Nextcloud!</p>",
}

# ---------------------------------------------------------------------------
# 2. New Dutch PWA pre-population (English msgid → original Dutch text)
# ---------------------------------------------------------------------------
PWA_NL = {
    # wizardSteps.js PWA wrapper
    'Use Nextcloud as a real app!':
        'Gebruik Nextcloud als een echte app!',
    'You can install Nextcloud as an app on your device. It then works just like any other app:':
        'Je kunt Nextcloud installeren als app op je apparaat. Dan werkt het net als elke andere app:',
    '✨ Own app icon on your home screen/dock':
        '✨ Eigen app-icoon op je startscherm/dock',
    '⚡ Faster to open (no browser needed)':
        '⚡ Sneller openen (geen browser nodig)',
    '🎯 Full focus without browser tabs':
        '🎯 Volledige focus zonder browser-tabbladen',
    '📱 Also works offline for some features':
        '📱 Werkt ook offline voor sommige functies',
    'How to install the app:':
        'Zo installeer je de app:',
    '💡 You can also skip this step and install later whenever you want.':
        '💡 Je kunt deze stap ook overslaan en later installeren wanneer je wilt.',
    'Got it':
        'Begrepen',

    # deviceDetection.js — iOS Safari
    'Install Nextcloud on your iPhone/iPad':
        'Installeer Nextcloud op je iPhone/iPad',
    'Tap the <strong>Share</strong> icon (square with up arrow) at the bottom':
        'Tik op het <strong>Deel</strong> icoon (vierkant met pijl omhoog) onderaan',
    'Scroll down and tap <strong>"Add to Home Screen"</strong>':
        'Scroll naar beneden en tik op <strong>"Zet op beginscherm"</strong>',
    'Tap <strong>Add</strong> in the top right':
        'Tik op <strong>Toevoegen</strong> rechtsboven',
    'Nextcloud now appears as an app on your home screen!':
        'Nextcloud verschijnt nu als app op je beginscherm!',

    # macOS Safari
    'Install Nextcloud on your Mac':
        'Installeer Nextcloud op je Mac',
    'Click <strong>File</strong> in the menu bar':
        'Klik op <strong>Archief</strong> in de menubalk',
    'Select <strong>"Add to Dock"</strong>':
        'Selecteer <strong>"Voeg toe aan Dock"</strong>',
    'Nextcloud now appears in your Dock as an app!':
        'Nextcloud verschijnt nu in je Dock als app!',

    # Android Chrome/Edge + Firefox Android (shared title)
    'Install Nextcloud on your Android':
        'Installeer Nextcloud op je Android',
    'Tap the menu icon (three dots) in the top right':
        'Tik op het menu icoon (drie puntjes) rechtsboven',
    'Tap <strong>"Install app"</strong> or <strong>"Add to home screen"</strong>':
        'Tik op <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong>',
    'Tap <strong>Install</strong>':
        'Tik op <strong>Installeren</strong>',

    # Desktop Edge / Chrome (shared title)
    'Install Nextcloud on your computer':
        'Installeer Nextcloud op je computer',
    'Click the <strong>install icon</strong> in the address bar (right)':
        'Klik op het <strong>installatie icoon</strong> in de adresbalk (rechts)',
    'Or: click the menu (three dots) → <strong>"More tools"</strong> → <strong>"Apps"</strong> → <strong>"Install this site as an app"</strong>':
        'Of: klik op het menu (drie puntjes) → <strong>"Meer hulpprogramma\'s"</strong> → <strong>"Apps"</strong> → <strong>"Deze site installeren als app"</strong>',
    'Or: click the menu (three dots) → <strong>"Install Nextcloud"</strong>':
        'Of: klik op het menu (drie puntjes) → <strong>"Nextcloud installeren"</strong>',
    'Click <strong>Install</strong>':
        'Klik op <strong>Installeren</strong>',
    'Nextcloud now opens as an app in its own window!':
        'Nextcloud opent nu als app in een eigen venster!',

    # Firefox Android
    'Tap <strong>"Install"</strong>':
        'Tik op <strong>"Installeren"</strong>',
    'Tap <strong>Add to Home Screen</strong>':
        'Tik op <strong>Toevoegen aan startscherm</strong>',

    # Desktop Firefox
    'Create a shortcut in Firefox':
        'Snelkoppeling maken in Firefox',
    'Firefox currently does not support PWA installation':
        'Firefox ondersteunt momenteel geen PWA installatie',
    'You can however create a bookmark for quick access':
        'Je kunt wel een bladwijzer maken voor snelle toegang',
    'Or use Chrome/Edge for the full app experience':
        'Of gebruik Chrome/Edge voor volledige app-ervaring',

    # Opera
    'Install Nextcloud in Opera':
        'Installeer Nextcloud in Opera',
    'Click/tap the menu icon':
        'Klik/tik op het menu icoon',
    'Select <strong>"Install Nextcloud"</strong>':
        'Selecteer <strong>"Installeren Nextcloud"</strong>',
    'Click/tap <strong>Install</strong>':
        'Klik/tik op <strong>Installeren</strong>',
    'Nextcloud is now available as an app!':
        'Nextcloud is nu beschikbaar als app!',

    # Fallback
    'Use Nextcloud as an app':
        'Nextcloud als app gebruiken',
    'Your browser may support app installation':
        'Je browser ondersteunt mogelijk app-installatie',
    'Look in the menu for options like "Install" or "Add to home screen"':
        'Kijk in het menu naar opties zoals "Installeren" of "Toevoegen aan startscherm"',
    'For the best experience: use Chrome, Edge or Safari':
        'Voor de beste ervaring: gebruik Chrome, Edge of Safari',
}


def load_json(path: Path) -> dict:
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write('\n')


def migrate_step_keys(translations: dict) -> int:
    """In-place: rename step_* keys to their English source string."""
    migrated = 0
    for old_key, new_key in STEP_KEY_MAP.items():
        if old_key in translations:
            translations[new_key] = translations.pop(old_key)
            migrated += 1
    return migrated


def add_pwa_strings(translations: dict, pwa_map: dict) -> int:
    """Add new msgid:translation pairs if not already present."""
    added = 0
    for msgid, value in pwa_map.items():
        if msgid not in translations:
            translations[msgid] = value
            added += 1
    return added


def main() -> int:
    lang_files = sorted(L10N.glob('*.json'))
    if not lang_files:
        print(f'ERROR: no JSON files found in {L10N}')
        return 1

    for path in lang_files:
        data = load_json(path)
        t = data.get('translations', {})
        lang_code = path.stem  # e.g. 'nl', 'en_GB'

        step_migrated = migrate_step_keys(t)
        pwa_added = 0
        if lang_code == 'nl':
            pwa_added = add_pwa_strings(t, PWA_NL)
        elif lang_code == 'en':
            # English source — msgid IS the translation
            pwa_added = add_pwa_strings(t, {msgid: msgid for msgid in PWA_NL})

        data['translations'] = t
        write_json(path, data)
        print(f'{path.name}: migrated {step_migrated}/16 step keys; added {pwa_added} PWA msgids')

    return 0


if __name__ == '__main__':
    sys.exit(main())
