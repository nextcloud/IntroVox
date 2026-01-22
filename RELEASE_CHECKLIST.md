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

- [ ] Check that all new strings are translated in all supported languages (EN, NL, DE, FR, DA, SV)
- [ ] Validate JSON syntax in all translation files (`l10n/*.json`)
- [ ] Regenerate `.js` translation files: `python3 regenerate_js_translations.py`
- [ ] Test the application in each language for missing or truncated text

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
- [ ] Upload to Nextcloud App Store:
  - [ ] Download URL (lowercase!)
  - [ ] Signature (regenerate after any tarball change!)
  - [ ] Release notes

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

### 3. Create Tag
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z - [Description]"
git push gitea vX.Y.Z
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
openssl dgst -sha512 -sign introvox.key introvox-X.Y.Z.tar.gz | openssl base64 -A
```

### 6. App Store Upload
- **URL:** Download URL for tarball (lowercase!)
- **Signature:** Output from step 5

**Note:** Regenerate signature after any tarball change!

---

## Notes

- **Minimum Nextcloud version:** 32 (check `appinfo/info.xml`)
- **Supported languages:** EN, NL, DE, FR, DA, SV
- **App Store:** https://apps.nextcloud.com
- **Gitea:** https://gitea.rikdekker.nl/rik/IntroVox

---

## TODO for Future Versions

- [ ] v1.3: Re-enable telemetry error logging once license server is stable
- [ ] v1.3: Add retry logic with exponential backoff for telemetry
- [ ] Consider adding health check endpoint for telemetry server status

---

*Last updated: January 2026*
