# Admin Troubleshooting

Common issues and resolutions for IntroVox administrators. For user-facing issues, see [User Troubleshooting](../user/troubleshooting.md).

## Welcome Tour Not Showing

**Symptom:** Users don't get the welcome tour on first login.

| Possible cause | Solution |
|---|---|
| Tours switched off for everyone | Switch on **Tours for everyone** in **Settings → Administration → IntroVox** |
| The welcome tour is switched off | Switch it on in the **Tours** list |
| No step of the welcome tour is for this user | Every step is switched off, or limited to groups the user isn't in. Check **Visible to groups**, or use **Preview as** in **Preview tour** |
| User finished or skipped the welcome tour, or closed it in this browser | Use **Show again to everyone** in the welcome tour's ⋯ menu under **Tours** to give it to everyone again |
| User switched off **Start tours by themselves** | Only the user can switch it back on, in **Personal Settings → IntroVox**; **Show again to everyone** does not change it. They can still start tours by hand there |
| JavaScript errors | Check the browser console (F12); verify IntroVox version is compatible with your Nextcloud version |
| App-menu readiness timeout | Pre-v1.4.2 versions could hang on some NC versions; upgrade to v1.4.2+ which adds fallback selectors and a 10s timeout |

## Tour for an App Not Starting

**Symptom:** Users open an app that has a tour, but the tour doesn't start.

| Possible cause | Solution |
|---|---|
| The tour is switched off | Switch it on under **Tours**; that works once it has a step in its main language |
| **Tours for everyone** is off | Switch it on under **Settings** |
| User is not in the tour's groups, or can't open the app | Check **Visible to** under **Tour settings**, and the app's own group limits |
| User saw the tour already, in any browser | Expected: it starts by itself once. Use **Show again to everyone** on the tour, or the user clicks **Start again** in **Personal Settings → IntroVox** |
| User hasn't had the welcome tour yet | Expected: the welcome tour comes first, the app tour on a later visit |
| **Who gets it** is **New accounts only**, and the user's first login was before the tour was first switched on | Set **Who gets it** to **Everyone** under **Tour settings** |
| User switched off **Start tours by themselves** | The user can still start the tour with **Start** in **Personal Settings → IntroVox** |

See [Tours](tours.md) for when a tour starts.

## Steps Missing or Waiting in the Corner

**Symptom:** Some steps don't appear during the tour, or a step stands in the bottom right corner instead of at its element.

| Possible cause | Solution |
|---|---|
| Step disabled in admin panel | Toggle the step to **✅** enabled |
| Element isn't on the page | The step waits aside in the bottom right corner (bottom left while a dialog is open) with its text, and moves to the element once it appears; **Next** still goes on. Check the selector with **Test this step**, pick it again with **Pick element**, or use **Remove element** for a centered step |
| Element only appears after the user does something | Expected: the step waits until it is there. Lead the way with one step per click, see [Steps that wait for the user](managing-steps.md#steps-that-wait-for-the-user) |
| The step's **Page** is an app the user can't open | The step is left out for that user. Limit it with **Visible to groups** to people who have the app |
| Selector broke after a Nextcloud upgrade | Inspect the new DOM and update the selector. Use multiple comma-separated fallbacks; the tour tries them in the order written |
| Pre-v1.4.1 timing issue | Steps could be skipped if Vue hadn't rendered yet; now a step waits for its element instead |
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

## Checking a Step

IntroVox writes nothing to the browser console. To see what a step does:

- **Test this step** in the step editor shows that one step, unsaved changes included. **Preview tour** runs the whole tour; **Preview as** shows what members of one group get.
- A step that stands in the bottom right corner instead of at its element has not found that element. It waits there until the element appears.
- To check a selector by hand, open the browser console (F12 → Console) and test each selector of the list on its own with `document.querySelector('…')`.
- Errors, such as a request that failed, still show in the console and under F12 → Network.

## See Also

- [User Troubleshooting](../user/troubleshooting.md) — user-facing issues
- [FAQ](faq.md) — common admin questions
- [Best Practices](best-practices.md) — preventive recommendations
