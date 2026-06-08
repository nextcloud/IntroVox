# IntroVox App Store Release Checklist

Follow this checklist for every release to the Nextcloud App Store.

---

## 0. Certificate Verification (CRITICAL!)

**Before every release**, verify that your signing key matches the App Store certificate!

- [ ] Verify signing key matches App Store certificate:
  ```bash
  # Hash of local signing key
  openssl rsa -in introvox.key -pubout 2>/dev/null | openssl md5

  # Hash of App Store certificate (must be IDENTICAL!)
  curl -s "https://apps.nextcloud.com/api/v1/apps.json" | \
    python3 -c "import json,sys; [print(a['certificate']) for a in json.load(sys.stdin) if a['id']=='introvox']" | \
    openssl x509 -pubkey -noout 2>/dev/null | openssl md5
  ```
- [ ] Both MD5 hashes are **IDENTICAL**
- [ ] Check certificate serial number and validity

### Certificate Warnings:
- **NEVER request a new certificate unnecessarily** - this automatically revokes the old one!
- Only request a new certificate if the private key is compromised or lost
- Keep your `.key` file safe (backup in secure location, NOT in git!)
- After certificate change: download the new certificate and store with the key

---

## 1. Code Quality & Security

- [ ] Remove all `console.log()` and debug statements from JavaScript (`src/`)
- [ ] Remove all `error_log()` and debug code from PHP (`lib/`)
- [ ] Check for hardcoded credentials, API keys, or passwords
- [ ] Ensure `.gitignore` is up-to-date (keys, certificates, .env files)
- [ ] Verify that sensitive files are NOT in the repository
- [ ] Run `npm audit` and fix critical vulnerabilities
- [ ] Check for XSS, SQL injection, and other OWASP vulnerabilities
- [ ] Review all new code for security issues
- [ ] **Check tarball for sensitive data** (see Section 9.1)

---

## 2. Translations (l10n/)

Since v1.7.0, IntroVox uses Transifex for translations (`nextcloud/introvox` resource). The Nextcloud sync bot pushes our POT and pulls translated PO/JSON files back via PRs — no need to translate strings manually before release.

- [ ] Confirm new source strings are reflected in `translationfiles/templates/introvox.pot` (the sync bot regenerates this on its side, but a local check catches missing extractions)
- [ ] Validate JSON syntax in all translation files: `for f in l10n/*.json; do python3 -m json.tool "$f" > /dev/null && echo "OK: $f" || echo "FAIL: $f"; done`
- [ ] Regenerate `.js` translation files: `python3 regenerate_js_translations.py`
- [ ] Spot-check the wizard in a non-English session to make sure no string falls back to English unexpectedly when it should have a translation

---

## 3. Version Management

- [ ] Determine new version number (semantic versioning: MAJOR.MINOR.PATCH)
- [ ] Update version in `package.json`
- [ ] Update version in `appinfo/info.xml`
- [ ] Verify both versions match
- [ ] Update `CHANGELOG.md` with all changes for this release:
  - [ ] New features
  - [ ] Bug fixes
  - [ ] Breaking changes
  - [ ] Known issues

---

## 4. Build & Testing

- [ ] Remove `node_modules/` and run `npm ci` (clean install)
- [ ] Run `npm run build` without errors or warnings
- [ ] Check bundle size (no unexpected growth)
- [ ] Test all core functionalities manually:
  - [ ] Wizard displays correctly for new users
  - [ ] Admin panel: Settings tab works
  - [ ] Admin panel: Steps tab - CRUD operations work
  - [ ] Admin panel: Statistics tab loads
  - [ ] Personal settings: restart tour works
  - [ ] Multi-language support works
  - [ ] Group-based step visibility works
  - [ ] Import/Export functionality
- [ ] Test on a clean Nextcloud installation
- [ ] Check browser console for JavaScript errors
- [ ] Test with different browsers (Chrome, Firefox, Safari, Edge)

---

## 5. Nextcloud Compatibility

- [ ] Check min/max Nextcloud version in `appinfo/info.xml`
- [ ] Test on the minimum supported Nextcloud version (32)
- [ ] Test on the latest Nextcloud version
- [ ] Verify PHP version requirement
- [ ] Check that all Nextcloud API calls still work
- [ ] Test with the latest version of @nextcloud/vue

---

## 6. Assets & Files

- [ ] Verify all required files are in the tarball:
  - [ ] `appinfo/` (info.xml, routes.php)
  - [ ] `lib/` (PHP backend)
  - [ ] `js/` (compiled JavaScript: main.js, admin.js, personal.js)
  - [ ] `css/` (stylesheets)
  - [ ] `img/` (icons)
  - [ ] `l10n/` (translations - both .json and .js)
  - [ ] `templates/` (PHP templates)
  - [ ] `README.md`
  - [ ] `CHANGELOG.md`
  - [ ] `LICENSE`
- [ ] Verify that `src/` is NOT in the tarball (only compiled code)
- [ ] Check app icon for App Store
- [ ] Update screenshots if UI has changed

---

## 7. Git & Repository

- [ ] All changes are committed
- [ ] No uncommitted changes present
- [ ] Branch is up-to-date with main
- [ ] Merge conflicts are resolved
- [ ] Check that sensitive files are not in git history

---

## 8. Release Package

- [ ] Create the tarball
- [ ] Verify tarball contents (`tar -tzf introvox-x.x.x.tar.gz`)
- [ ] **IMPORTANT:** Verify root folder is `introvox` (lowercase, no version number)
- [ ] Push to remote(s):
  ```bash
  git push gitea main
  git push github main  # if applicable
  ```
- [ ] Create git tag:
  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  git push gitea vX.Y.Z
  ```
- [ ] Upload tarball to release
- [ ] Generate signature with the correct key:
  ```bash
  openssl dgst -sha512 -sign introvox.key introvox-x.x.x.tar.gz | openssl base64 -A
  ```
- [ ] Upload to Nextcloud App Store (see § 8.2 for the actual upload step)

### 8.1 Tarball Security Check (CRITICAL!)

**ALWAYS check** the tarball for sensitive data before uploading!

```bash
# Check for sensitive files
tar -tzf introvox-x.x.x.tar.gz | grep -iE '(internal|credential|\.key|\.env|deploy)'

# Search for IP addresses, passwords
tar -xzf introvox-x.x.x.tar.gz -O 2>/dev/null | \
  grep -iE '(password\s*=|api_key\s*=|secret\s*=|145\.|192\.168\.)' | head -20
```

**Do NOT include in tarball:**
- `src/` - Source code (only compiled js/)
- `node_modules/` - Dependencies
- `.git/` - Git history
- `*.key`, `*.crt`, `*.pem` - Certificates and keys
- `deploy.sh` - Deployment script with server details
- `Sample_files/` - Test files
- Any files containing server IPs, credentials, or usernames

### 8.2 App Store Upload — actual procedure

There are two upload routes. **Try the API first; fall back to the web UI if the token is rejected.**

The signing key is at `/Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/introvox.key` (also on USB at `/Volumes/WDS/secrets/projects/introvox/introvox.key`). The API token is at `/Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/appstore-api-token.txt`.

**Always validate the signing key first:**

```bash
# These two MD5 hashes must be identical
openssl rsa -in /Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/introvox.key -pubout 2>/dev/null | openssl md5
curl -s "https://apps.nextcloud.com/api/v1/apps.json" | \
  python3 -c "import json,sys; [print(a['certificate']) for a in json.load(sys.stdin) if a['id']=='introvox']" | \
  openssl x509 -pubkey -noout 2>/dev/null | openssl md5
```

**Generate the signature once** (regenerate if the tarball changes!):

```bash
openssl dgst -sha512 -sign /Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/introvox.key \
  introvox-X.Y.Z.tar.gz | openssl base64 -A > /tmp/introvox-X.Y.Z.sig
```

#### Route A — API upload (preferred when the token works)

```bash
TOKEN=$(tr -d '[:space:]' < /Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/appstore-api-token.txt)
SIG=$(cat /tmp/introvox-X.Y.Z.sig)
DOWNLOAD_URL="https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz"

curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"download\":\"$DOWNLOAD_URL\",\"signature\":\"$SIG\",\"nightly\":false}" \
  https://apps.nextcloud.com/api/v1/apps/releases
```

HTTP 200 = success. **HTTP 403 "You do not have permission"** means the token is expired/revoked — go to Route B and refresh the token afterwards.

#### Route B — Web UI upload (fallback, always works)

1. Log in at https://apps.nextcloud.com
2. Go to your developer dashboard → IntroVox → "New Release"
   (URL pattern: `https://apps.nextcloud.com/developer/apps/introvox/releases/new` — only reachable when logged in as the app owner)
3. Paste:
   - **Download URL**: `https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz`
   - **Signature**: contents of `/tmp/introvox-X.Y.Z.sig`
   - **Release notes**: copy the relevant section from `CHANGELOG.md`

#### When the API token is rejected — refreshing it

The API-token page used to be at `https://apps.nextcloud.com/account/api-token` but that URL has 404'd at least once (May 2026). To find a fresh token:

1. Log in at https://apps.nextcloud.com
2. Click your username top-right → look for "API Token" / "Account" / "Profile" — the exact path moves around
3. Generate a new token, copy it, and overwrite `appstore-api-token.txt`:
   ```bash
   echo -n "<new-token>" > /Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/appstore-api-token.txt
   ```
4. Retry Route A — should now return HTTP 200

#### Lessons learned (v1.4.3, May 2026)

- The `/account/api-token` URL was dead and the existing token (28 March 2026) returned HTTP 403 — token had silently expired. Web UI upload was the only working route that day.
- The signing key on the USB drive is identical to the local copy in `Keys/`; you don't need the USB mounted to sign.
- The `is_array($steps)` defensive guard in `ApiController::getWizardSteps()` was the actual bug fix for v1.4.3 — keep mirroring `TelemetryService`'s defensive patterns when reading `wizard_steps_<lang>` config.

#### Lessons learned (v1.5.0, 21 May 2026)

- API token is **still HTTP 403** — was never refreshed after v1.4.3. Web UI upload remains the only working path until the token at `appstore-api-token.txt` is replaced.
- The `apps.nextcloud.com/api/v1/apps.json` cert-verification endpoint now returns HTTP 302 → `garm2.nextcloud.com`. Use `curl -sL` (follow redirects) in the §0 cert-check command, otherwise the MD5 comparison silently fails on empty input (gives `d41d8cd98f00b204e9800998ecf8427e` — the MD5 of an empty string).
- The "sensitive content" grep in §8.1 (`grep -iE '(password=|api_key=|...)'`) matches webpack-minified bundle bytes by coincidence (`Math.pow(2,...)` etc. contains the literal characters). Extract the tarball and `grep -r` per text-file extension instead of piping `tar -xzf -O` into one big blob.

---

## 9. Post-Release Verification

- [ ] Install the app from the App Store on a test server
- [ ] Verify the app works correctly after installation
- [ ] Check that the version is displayed correctly
- [ ] Test the upgrade path from the previous version
- [ ] Sync all remotes
- [ ] Make a release announcement if major release

---

## 10. Rollback Plan

- [ ] Backup of the previous release is available
- [ ] Rollback procedure is tested
- [ ] Test server available for emergencies

---

## Quick Commands

```bash
# Regenerate translations
python3 regenerate_js_translations.py

# Production build
npm run build

# Security audit
npm audit

# Deploy to test server
./deploy.sh
```

---

## Quick Release Flow

### 1. Preparation
```bash
# Verify versions match
grep version package.json appinfo/info.xml

# Build
npm run build

# Regenerate translations if needed
python3 regenerate_js_translations.py
```

### 2. Commit & Push
```bash
git add -A
git commit -m "Release vX.Y.Z - [Description]"
git push gitea main
```

### 3. Create Tag & Push to Remotes
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z - [Description]"
git push gitea main --tags
git push github main --tags
```

### 4. Create Tarball
**IMPORTANT:** Root folder must be `introvox` (lowercase, no version number)

```bash
TEMP_DIR=$(mktemp -d) && \
mkdir -p "$TEMP_DIR/introvox" && \
cp -r appinfo lib l10n templates css img js "$TEMP_DIR/introvox/" && \
cp CHANGELOG.md LICENSE README.md "$TEMP_DIR/introvox/" && \
cd "$TEMP_DIR" && \
tar -czf introvox-X.Y.Z.tar.gz introvox && \
mv introvox-X.Y.Z.tar.gz /Users/rikdekker/Documents/Development/IntroVox/ && \
rm -rf "$TEMP_DIR"
```

**Exclude:** src/, node_modules/, .git/, *.key, deploy.sh, Sample_files/

### 5. Generate Signature (for App Store)
```bash
# First decrypt secrets on USB drive (requires GPG passphrase):
cd /Volumes/WDS && gpg --decrypt secrets.gpg | tar xzf -

# Then generate signature:
openssl dgst -sha512 -sign /Volumes/WDS/secrets/projects/introvox/introvox.key introvox-X.Y.Z.tar.gz | openssl base64 -A

# After signing, remove decrypted files:
rm -rf /Volumes/WDS/secrets
```

### 6. Create GitHub Release
```bash
gh release create vX.Y.Z introvox-X.Y.Z.tar.gz \
  --title "vX.Y.Z - [Description]" \
  --notes "## What's New in vX.Y.Z

### New Features
- Feature 1
- Feature 2

### Improvements
- Improvement 1

Full changelog: https://github.com/nextcloud/IntroVox/blob/main/CHANGELOG.md"
```

**Download URL after release:**
```
https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz
```

### 7. App Store Upload

See § 8.2 for the full procedure (API + web-UI fallback). TL;DR:

```bash
# Try the API first
TOKEN=$(tr -d '[:space:]' < /Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/appstore-api-token.txt)
SIG=$(cat /tmp/introvox-X.Y.Z.sig)
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"download\":\"https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz\",\"signature\":\"$SIG\",\"nightly\":false}" \
  https://apps.nextcloud.com/api/v1/apps/releases
```

If HTTP 403 → token is expired, fall back to web UI at https://apps.nextcloud.com/developer/apps/introvox/releases/new (login required), then refresh the token (see § 8.2).

**Note:** Regenerate signature after any tarball change!

---

## Notes

- **Minimum Nextcloud version:** 32 (check `appinfo/info.xml`)
- **Supported languages:** every language Nextcloud supports — translations come from Transifex (`nextcloud/introvox` resource); whatever exists in `l10n/` ships, languages without a translation file fall back to English at runtime
- **App Store:** https://apps.nextcloud.com
- **App Store dev page:** https://apps.nextcloud.com/developer/apps/introvox
- **App Store new-release (web UI):** https://apps.nextcloud.com/developer/apps/introvox/releases/new (login required)
- **Gitea:** https://gitea.rikdekker.nl/rik/IntroVox
- **GitHub:** https://github.com/nextcloud/IntroVox
- **Signing key (local, primary):** `/Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/introvox.key`
- **Signing key (USB backup, encrypted):** `/Volumes/WDS/secrets/projects/introvox/introvox.key`
- **API token:** `/Users/rikdekker/Documents/Development/.claude/NextcloudApps/Keys/appstore-api-token.txt` (40-char DRF token; expires periodically — see § 8.2 for refresh)

---

## TODO for Future Versions

- [ ] v1.3: Re-enable telemetry error logging once license server is stable
- [ ] v1.3: Add retry logic with exponential backoff for telemetry
- [ ] Consider adding health check endpoint for telemetry server status

---

*Last updated: 2026-05-05 (after v1.4.3 release — added § 8.2 with both upload routes after API token returned HTTP 403)*
