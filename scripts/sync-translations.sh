#!/bin/bash
#
# sync-translations.sh — pull translations from Transifex and regenerate l10n/.
#
# Run this BEFORE cutting a release so the bundled l10n/*.js|*.json reflect the
# latest Transifex state. The Nextcloud Transifex bot pushes the *source* (.pot)
# automatically; this script pulls the *translations* back into the repo.
#
# Requirements:
#   - tx CLI (https://github.com/transifex/cli)  ->  brew install transifex/tap/tx
#   - TX_TOKEN environment variable with a Transifex API token that can read the
#     nextcloud:introvox resource. Do NOT hardcode the token in this file.
#
# Usage:
#   export TX_TOKEN="1/xxxxxxxx"      # or put it in ~/.zshrc / a gitignored .env
#   ./scripts/sync-translations.sh
#
set -e

cd "$(dirname "$0")/.."

if [ -z "${TX_TOKEN:-}" ]; then
    echo "❌ TX_TOKEN is not set. Export your Transifex API token first:"
    echo "   export TX_TOKEN=\"1/xxxxxxxx\""
    exit 1
fi

if ! command -v tx >/dev/null 2>&1; then
    echo "❌ tx CLI not found. Install with: brew install transifex/tap/tx"
    exit 1
fi

echo "📥 Pulling translations from Transifex (all languages, min 1%)..."
tx pull -a --minimum-perc=1

echo "🔄 Converting .po -> l10n/*.js + *.json ..."
python3 scripts/po2l10n.py

echo ""
echo "✅ Translations synced. Review the diff before committing:"
echo "     git status --short l10n/"
echo "     git diff --stat l10n/"
echo ""
echo "ℹ️  Remember to bump the version (info.xml + package.json) so Nextcloud's"
echo "   md5(appVersion) cache-buster picks up the new translation assets."
