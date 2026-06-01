# Release Process

The release process for IntroVox covers version management, build, GitHub release, and App Store upload. For the authoritative per-release checklist see [RELEASE_CHECKLIST.md](https://github.com/nextcloud/IntroVox/blob/main/RELEASE_CHECKLIST.md) in the repository root.

## Versioning

IntroVox follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — breaking API or storage-format changes
- **MINOR** — backwards-compatible features
- **PATCH** — backwards-compatible bug fixes

## Version Synchronization

Two files declare the IntroVox version and **must stay in sync**:

| File | Field |
|---|---|
| `package.json` | `version` |
| `appinfo/info.xml` | `<version>` |

Verify they match before every release:

```bash
grep '"version"' package.json
grep '<version>' appinfo/info.xml
```

## Release Flow

### 1. Prepare

```bash
# Verify versions match
grep version package.json appinfo/info.xml

# Production build
npm run build

# Regenerate translations if l10n/*.json changed
python3 regenerate_js_translations.py
```

### 2. Update the CHANGELOG

Add a new section at the top of `CHANGELOG.md` following the existing pattern:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature (#NUMBER)

### Changed
- Behavior change

### Fixed
- Bug fix (#NUMBER)

### Security
- Security improvement
```

Every entry that maps to a GitHub issue should include a markdown link to that issue — e.g. `([#16](https://github.com/nextcloud/IntroVox/issues/16))`.

### 3. Commit and Push

```bash
git add -A
git commit -m "Release vX.Y.Z - [Description]"
git push gitea main
git push github main
```

### 4. Tag and Push the Tag

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z - [Description]"
git push gitea vX.Y.Z
git push github vX.Y.Z
```

### 5. Build the Tarball

The tarball's root folder must be `introvox` (lowercase, no version suffix):

```bash
TEMP_DIR=$(mktemp -d) && \
mkdir -p "$TEMP_DIR/introvox" && \
cp -r appinfo lib l10n templates css img js "$TEMP_DIR/introvox/" && \
cp CHANGELOG.md LICENSE README.md "$TEMP_DIR/introvox/" && \
cd "$TEMP_DIR" && \
tar -czf introvox-X.Y.Z.tar.gz introvox && \
mv introvox-X.Y.Z.tar.gz /path/to/IntroVox/ && \
rm -rf "$TEMP_DIR"
```

**Exclude:** `src/`, `node_modules/`, `.git/`, `*.key`, `deploy.sh`, any sample files.

### 6. Sign the Tarball

```bash
openssl dgst -sha512 -sign /path/to/introvox.key introvox-X.Y.Z.tar.gz \
  | openssl base64 -A > introvox-X.Y.Z.sig
```

### 7. Create the GitHub Release

```bash
gh release create vX.Y.Z introvox-X.Y.Z.tar.gz \
  --repo nextcloud/IntroVox \
  --title "vX.Y.Z - [Description]" \
  --notes "$(sed -n '/^## \[X.Y.Z\]/,/^## \[/p' CHANGELOG.md | head -n -1)"
```

The resulting download URL:

```
https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz
```

### 8. Submit to the App Store

See [App Store Submission](app-store-submission.md) for the full flow. TL;DR — try the API first, fall back to the web UI if the token returns HTTP 403.

```bash
TOKEN=$(tr -d '[:space:]' < /path/to/appstore-api-token.txt)
SIG=$(cat introvox-X.Y.Z.sig)

curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"download\":\"https://github.com/nextcloud/IntroVox/releases/download/vX.Y.Z/introvox-X.Y.Z.tar.gz\",\"signature\":\"$SIG\",\"nightly\":false}" \
  https://apps.nextcloud.com/api/v1/apps/releases
```

### 9. Post-Release Verification

- Install the app from the App Store on a test server (wait for it to appear after approval)
- Verify the version is displayed correctly in **Settings → Apps**
- Test the upgrade path from the previous version (no broken configurations)
- Sync all git remotes
- Make a release announcement if it's a major version

## Lessons Learned

These are real incidents from past releases — keep them in mind:

### API Token Expires Silently (v1.4.3, May 2026)

The IntroVox App Store API token has expired without notification at least once. The release returned HTTP 403 from Route A, and the `account/api-token` URL was 404 at the time, requiring a hunt through the user menu to find the token page. **Workaround:** always have Route B (web UI) ready.

### Defensive `is_array()` Guard (v1.4.3)

A corrupt or legacy `wizard_steps_<lang>` config blob caused `array_filter()` to crash with HTTP 500 on every `GET /api/steps` call, breaking onboarding for all users. The fix was a one-line `is_array($steps)` guard. Mirror this defensive pattern when reading any app config blob you don't fully control.

### `apps.nextcloud.com/api/v1/apps.json` 302 Redirect (v1.5.0, May 2026)

The cert-verification endpoint now redirects to `garm2.nextcloud.com`. Use `curl -sL` (follow redirects) — without `-L`, the MD5 comparison silently compares against an empty string and gives a false positive of `d41d8cd98f00b204e9800998ecf8427e`.

### False-Positive Tarball Content Scans (v1.5.0)

The "sensitive content" grep in §8.1 of the checklist matched webpack-minified bundle bytes by coincidence — `Math.pow(2,...)` contains the literal characters that trip an `api_key=` regex. **Extract the tarball first**, then `grep -r` per text-file extension. Don't pipe `tar -xzf -O` into one big binary blob.

### Mixed sync/async chunk-race (general lesson)

Mixed sync/async imports of `.vue` components have caused webpack chunk-race runtime `TypeError`s in other Vox apps. If you see "Cannot read property of undefined" after deploy, check for inconsistent import styles. (Not specific to IntroVox yet, but worth watching.)

## Quick Commands Reference

```bash
# Regenerate translations
python3 regenerate_js_translations.py

# Production build
npm run build

# Security audit
npm audit

# Deploy to test/dev (not production)
./deploy.sh
```

## TODO for Future Versions

- Re-enable telemetry error logging once the license server is stable
- Add retry logic with exponential backoff for telemetry
- Consider a health-check endpoint for telemetry server status

## See Also

- [RELEASE_CHECKLIST.md](https://github.com/nextcloud/IntroVox/blob/main/RELEASE_CHECKLIST.md) — authoritative per-release checklist
- [App Store Submission](app-store-submission.md) — submission details
- [Installation](installation.md) — installing IntroVox
