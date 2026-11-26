#!/bin/bash
#
# release-check.sh — assert a release is actually releasable, and actually released.
#
# Two modes, run at the two moments things went wrong before:
#
#   ./scripts/release-check.sh pre   [version]   before tagging
#   ./scripts/release-check.sh post  [version]   after uploading
#
# Without a version it reads appinfo/info.xml.
#
# Why this exists: 1.7.9 sat in the repo for four days looking finished —
# version bumped, CHANGELOG written, everything pushed — while the App Store
# still served 1.7.8. Nothing checked, so nobody noticed. IntraVox lost two
# whole releases the same way. The checklist has the same steps in prose; this
# is the part a script can assert.
#
# Exit code is the number of failures, so CI or a shell can branch on it.

set -uo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"
V="${2:-$(grep -oE '<version>[^<]+' appinfo/info.xml | sed 's/<version>//')}"

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; NC=$'\033[0m'
FAILED=0
ok()   { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
bad()  { printf "  ${RED}✗${NC} %s\n" "$1"; FAILED=$((FAILED+1)); }
warn() { printf "  ${YELLOW}!${NC} %s\n" "$1"; }

case "$MODE" in
  pre)
    echo "Pre-release checks for ${V}"
    echo

    # --- version consistency -------------------------------------------------
    PKG=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
    [ "$PKG" = "$V" ] && ok "package.json and info.xml agree ($V)" \
                      || bad "version drift: info.xml=$V package.json=$PKG"

    # --- the tree must be clean and match what you are about to tag ----------
    [ -z "$(git status --porcelain)" ] && ok "working tree clean" \
                                       || bad "working tree dirty — commit or stash first"

    git rev-list -n1 "v$V" >/dev/null 2>&1 \
      && bad "tag v$V already exists — bump the version or delete the tag" \
      || ok "tag v$V is free"

    # --- CHANGELOG must describe THIS version, not the previous one ----------
    if grep -q "^## \[$V\]" CHANGELOG.md; then
      ok "CHANGELOG has a section for $V"
      DATE=$(grep "^## \[$V\]" CHANGELOG.md | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
      TODAY=$(date +%F)
      [ "$DATE" = "$TODAY" ] && ok "CHANGELOG date is today ($DATE)" \
        || warn "CHANGELOG says $DATE, today is $TODAY — stale date if you release now"
    else
      bad "CHANGELOG has no section for $V"
    fi

    # --- everything CI runs, so a release is never cut on a red pipeline -----
    if find lib templates appinfo -name '*.php' -print0 2>/dev/null \
         | xargs -0 -n1 php -l 2>&1 | grep -qv 'No syntax errors'; then
      bad "PHP syntax errors"
    else
      ok "PHP syntax clean"
    fi

    for s in l10n:lint lint:l10n test:js test:php build; do
      if npm run "$s" >/dev/null 2>&1; then ok "npm run $s"; else bad "npm run $s"; fi
    done

    # --- translations: how much of this release ships in English? -----------
    # Not a gate. New strings shipping untranslated is normal and expected;
    # the checklist explains when it is worth waiting instead.
    # Counted against the POT, with the keys l10n/<lang>.json uses (a plural is
    # _singular_::_plural_). Not l10n/en.json: that one is generated, gitignored,
    # and writes plurals under other keys, so no language ever counted as complete.
    node --input-type=module <<'JS'
import fs from 'node:fs'
import { parsePot } from './scripts/l10n-audit.mjs'
const pot = parsePot(fs.readFileSync('translationfiles/templates/introvox.pot', 'utf8'), '.')
const keys = pot.map((e) => (e.plural ? `_${e.msgid}_::_${e.plural}_` : e.msgid))
const rows = []
for (const f of fs.readdirSync('l10n').filter((f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'en.json').sort()) {
  const tr = JSON.parse(fs.readFileSync(`l10n/${f}`, 'utf8')).translations
  const n = keys.filter((k) => [].concat(tr[k] ?? '').some((s) => String(s).trim())).length
  rows.push({ lang: f.slice(0, -5), n, p: (100 * n) / keys.length })
}
rows.sort((a, b) => b.p - a.p || a.lang.localeCompare(b.lang))
const full = rows.filter((r) => r.n === keys.length).map((r) => r.lang)
console.log(`  · ${full.length}/${rows.length} languages complete (${keys.length} strings): ${full.join(' ') || '(none)'}`)
for (const r of rows.filter((r) => r.n < keys.length)) console.log(`    ${r.lang.padEnd(7)} ${r.p.toFixed(1).padStart(5)}%  (${keys.length - r.n} untranslated)`)
JS

    echo
    [ "$FAILED" -eq 0 ] && printf "${GREEN}Ready to tag v%s${NC}\n" "$V" \
                        || printf "${RED}%d check(s) failed${NC}\n" "$FAILED"
    ;;

  post)
    echo "Post-release verification for ${V}"
    echo

    git rev-list -n1 "v$V" >/dev/null 2>&1 && ok "tag exists locally" || bad "no local tag v$V"
    git ls-remote --tags origin "v$V" 2>/dev/null | grep -q . \
      && ok "tag on Forgejo" || bad "tag not pushed to Forgejo"
    git ls-remote --tags github "v$V" 2>/dev/null | grep -q . \
      && ok "tag on GitHub"  || bad "no tag on GitHub: gh release create makes it (never push the Forgejo tag)"

    # A draft release makes the App Store download GitHub's 404 page — nine
    # bytes — and report "not a valid tar.gz archive".
    if command -v gh >/dev/null 2>&1; then
      STATE=$(gh release view "v$V" --repo nextcloud/IntroVox \
                --json isDraft,assets -q '"\(.isDraft) \(.assets[0].state)"' 2>/dev/null)
      case "$STATE" in
        "false uploaded") ok "GitHub release published, asset uploaded" ;;
        "true "*)         bad "GitHub release is still a DRAFT — gh release edit v$V --draft=false" ;;
        "")               bad "no GitHub release for v$V" ;;
        *)                bad "GitHub release state: $STATE" ;;
      esac
    else
      warn "gh not installed — cannot check the GitHub release"
    fi

    HTTP=$(curl -s -o /dev/null -w "%{http_code} %{size_download}" -L \
      "https://github.com/nextcloud/IntroVox/releases/download/v$V/introvox-$V.tar.gz")
    case "$HTTP" in
      200\ *) ok "tarball downloadable ($HTTP)" ;;
      *)      bad "tarball not downloadable ($HTTP) — 404 + 9 bytes means still a draft" ;;
    esac

    # Cache-buster is required; without it the API serves a stale answer.
    LIVE=$(curl -s -H "Accept: application/json" \
      "https://apps.nextcloud.com/api/v1/platform/32.0.0/apps.json?t=$(date +%s)" \
      | python3 -c "import json,sys
a=[x for x in json.load(sys.stdin) if x['id']=='introvox']
print(a[0]['releases'][0]['version'] if a else 'none')" 2>/dev/null)
    [ "$LIVE" = "$V" ] && ok "App Store serves $V" \
                       || bad "App Store still serves $LIVE — upload not done"

    echo
    [ "$FAILED" -eq 0 ] && printf "${GREEN}%s is fully released${NC}\n" "$V" \
                        || printf "${RED}%d check(s) failed — %s is NOT fully released${NC}\n" "$FAILED" "$V"
    ;;

  *)
    echo "usage: $0 {pre|post} [version]"
    exit 2
    ;;
esac

exit "$FAILED"
