# Admin Troubleshooting

Common issues and resolutions for IntroVox administrators. For user-facing issues, see [User Troubleshooting](../user/troubleshooting.md).

## Wizard Not Showing

**Symptom:** Users don't see the wizard on first login.

| Possible cause | Solution |
|---|---|
| Wizard globally disabled | Enable in **Settings → Administration → IntroVox** |
| User previously disabled the wizard | Use **Show wizard to all users** to reset preferences |
| JavaScript errors | Check the browser console (F12); verify IntroVox version is compatible with your Nextcloud version |
| App-menu readiness timeout | Pre-v1.4.2 versions could hang on some NC versions; upgrade to v1.4.2+ which adds fallback selectors and a 10s timeout |

## Steps Being Skipped

**Symptom:** Some steps don't appear during the tour.

| Possible cause | Solution |
|---|---|
| Step disabled in admin panel | Toggle the step to **✅** enabled |
| Element doesn't exist | Console shows `Wizard: Skipping step 'X' - element not found`. Update the CSS selector or remove `attachTo` to make it centered |
| App not installed | If a Calendar step targets an element that only exists when Calendar is enabled, either add a fallback selector or only enable the step when Calendar is installed |
| Selector broke after a Nextcloud upgrade | Inspect the new DOM and update the selector. Use multiple comma-separated fallbacks |
| Pre-v1.4.1 timing issue | Steps could be skipped if Vue hadn't rendered yet; v1.4.1+ falls back to centered display instead |
| User not in required groups | Check the step's **Visible to groups** — empty means visible to all |

## Translations Not Working

**Symptom:** Text appears in the wrong language or shows translation keys.

| Possible cause | Solution |
|---|---|
| Browser cache | Hard-refresh: `Cmd+Shift+R` / `Ctrl+Shift+R` |
| Language not selected in Nextcloud | Verify in user's **Personal Settings → Language** |
| Translation file missing | Verify `l10n/<lang>.json` exists in the IntroVox app directory |
| App not rebuilt after `l10n` change | If developing, run `python3 regenerate_js_translations.py` then `npm run build` |
| Hidden steps stacked under current step (v1.4.0–v1.6.0) | Upgrade to v1.6.1+, which adds `.nextcloud-wizard-step[hidden] { display: none }` |

## Import/Export Issues

**Symptom:** Import fails or exports look empty.

| Possible cause | Solution |
|---|---|
| Invalid JSON format | Validate at jsonlint.com; check the file has the expected structure |
| Missing required fields | Each step must have `id`, `title`, `text`. See the [Import/Export](import-export.md) JSON example |
| Wrong language code | Make sure the language code in the file (e.g., `en`, `nl`) matches one of your enabled languages |
| Server file permissions | Verify Nextcloud has write access to its config directory |

## Hidden Wizard Steps Stack Behind Current Step (v1.6.1 fix)

**Symptom:** Previously-shown steps remain visible underneath the active step.

**Cause:** Between v1.4.0 and v1.6.0, `.nextcloud-wizard-step { display: flex }` overrode the browser-default `[hidden] { display: none }`, leaving Shepherd-hidden steps still rendered on top of each other.

**Fix:** Upgrade to v1.6.1+, which adds the explicit `.nextcloud-wizard-step[hidden] { display: none }` rule.

## `array_filter()` Null Error on `getWizardSteps` (v1.4.3 fix)

**Symptom:** Logged-in users get HTTP 500 on `GET /apps/introvox/api/steps`; tour never starts; onboarding broken globally.

**Cause:** Pre-v1.4.3, if the `wizard_steps_<lang>` appconfig blob existed but did not decode to a JSON array (corrupt or legacy non-array value), `ApiController::getWizardSteps()` crashed.

**Fix:** Upgrade to v1.4.3+. The defensive `is_array()` guard makes the frontend fall back to built-in defaults if the config blob is unusable.

**Workaround if you can't upgrade immediately:** Delete the offending `wizard_steps_<lang>` row from the `oc_appconfig` table to force fallback to defaults.

## Mobile Users Trapped in Long Steps (v1.5.0 fix)

**Symptom:** On phones, when a step's content exceeds the screen height, the overlay blocks page scroll but the step itself doesn't scroll either, leaving the close button unreachable.

**Cause:** Pre-v1.5.0, the step container had no `max-height` and the body had no internal scroll.

**Fix:** Upgrade to v1.5.0+. The step now has `max-height: calc(100vh - 32px)` (or `100dvh - 16px` on mobile), the header/footer are pinned via `flex-shrink: 0`, and the body scrolls internally.

## Tour Hangs Indefinitely on Some Nextcloud Versions (v1.4.2 fix)

**Symptom:** Tour never starts on certain Nextcloud versions; users see no wizard at all.

**Cause:** Pre-v1.4.2, the app-menu readiness check used CSS selectors that didn't match every Nextcloud version.

**Fix:** Upgrade to v1.4.2+. Multiple fallback selectors plus a 10-second timeout ensure the tour either starts or fails gracefully.

## CSRF Errors on State-Changing Admin Endpoints

**Symptom:** Save/reset/import/export admin actions fail with CSRF errors.

**Cause:** v1.5.0 restored CSRF protection on 7 POST endpoints (`saveSteps`, `resetToDefault`, `saveSettings`, `exportSteps`, `importSteps`, `toggleTelemetry`, `sendTelemetryNow`) that were previously vulnerable.

**Fix:** Ensure your admin panel session is fresh and you're using the latest IntroVox version. If you've built custom tooling that calls these endpoints directly, include the CSRF token.

## Debug Logging

To diagnose issues:

1. Open the browser console (F12 → Console tab)
2. Look for:

| Log | Meaning |
|---|---|
| `🎨 Nextcloud First Use Wizard (Vue 3) initialized` | App loaded successfully |
| `✅ Wizard initialized with X active steps` | Steps loaded for this user/language |
| `⚠️ Wizard: Skipping step 'X' - element not found` | CSS selector didn't match (pre-v1.4.1) or step fell back to centered (v1.4.1+) |

## See Also

- [User Troubleshooting](../user/troubleshooting.md) — user-facing issues
- [FAQ](faq.md) — common admin questions
- [Best Practices](best-practices.md) — preventive recommendations
