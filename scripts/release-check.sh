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

    for s in l10n:lint lint:l10n test:js build; do
      if npm run "$s" >/dev/null 2>&1; then ok "npm run $s"; else bad "npm run $s"; fi
    done

    # --- translations: how much of this release ships in English? -----------
    # Not a gate. New strings shipping untranslated is normal and expected;
    # the checklist explains when it is worth waiting instead.
    python3 - "$V" <<'PY'
import json, glob, os, sys
src = json.load(open('l10n/en.json'))['translations']
total = len(src)
rows = []
for f in sorted(glob.glob('l10n/*.json')):
    lang = os.path.basename(f)[:-5]
    if lang.startswith('.') or lang == 'en':
        continue
    tr = json.load(open(f))['translations']
    n = sum(1 for k in src if str(tr.get(k, '')).strip())
    rows.append((100 * n / total, lang, n))
rows.sort(reverse=True)
full = [l for p, l, _ in rows if p >= 99.5]
print(f"  · {len(full)}/{len(rows)} languages complete: {' '.join(full) or '(none)'}")
for p, l, n in rows:
    if p < 99.5:
        print(f"    {l:<7} {p:5.1f}%  ({total - n} untranslated)")
PY

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
      && ok "tag on GitHub"  || bad "tag not pushed to GitHub"

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
