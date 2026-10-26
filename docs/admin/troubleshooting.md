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
| A dialog is open, such as Nextcloud's own first-run wizard | Expected: the tour waits until the first-run wizard is closed, and until no other dialog is open (at most 15 seconds), then starts |
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
| Step disabled in admin panel | Switch the step on with its switch in the step list |
| Element isn't on the page | The step waits aside in the bottom right corner (bottom left while a dialog is open) with its text, and moves to the element once it appears; **Next** still goes on. Check the selector with **Test this step**, pick it again with **Pick element**, or use **Remove element** for a centered step |
| Element only appears after the user does something | Expected: the step waits until it is there. Lead the way with one step per click, see [Steps that wait for the user](managing-steps.md#steps-that-wait-for-the-user) |
| On a phone: the element is in the app's navigation, which is closed | Expected: the step waits aside until the user opens the navigation |
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
| App not rebuilt after `l10n` change | If developing, run `python3 scripts/po2l10n.py` then `npm run build` |
| Hidden steps stacked under current step (v1.4.0–v1.6.0) | Upgrade to v1.6.1+, which adds `.nextcloud-wizard-step[hidden] { display: none }` |

## Import/Export Issues

**Symptom:** Import fails or exports look empty.

| Possible cause | Solution |
|---|---|
| Invalid JSON format | Validate at jsonlint.com; check the file has the expected structure |
| Missing required fields | The file needs `language` and `steps`, and each step an `id` and a `title`. See the [Import/Export](import-export.md) JSON example |
| Wrong language code | `language` in the file must be a Nextcloud language code: two letters, optionally with a region, such as `en`, `nl` or `pt_BR`. The steps go to that language, whichever language the editor shows |

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

## CSRF Errors from Scripts or Old Tooling

**Symptom:** A script or custom tool that calls IntroVox's routes gets HTTP 412 ("CSRF check failed") or 404.

**Cause:** Since 2.0.0 every route needs the CSRF request token, also the ones that only read: the admin `GET` routes, the personal settings and `POST /api/wizard/{start,complete,skip}`. `GET /api/steps` also needs a logged-in user; it used to be public. Only two routes do without the token, because they cannot send one: `GET /media/{file}` (loaded by an image or video in a step) and `GET /tour/{id}` (a tour's share link). `POST /admin/step`, `PUT /admin/step/{id}` and `DELETE /admin/step/{id}` no longer exist.

**Fix:** Send the `requesttoken` header with every call, from a logged-in session. To save steps, send the whole list of a language to `POST /admin/steps`. In the admin page itself, reload the page when the session has expired. See the [API Reference](../architecture/api-reference.md).

## AI Buttons Missing

**Symptom:** The step editor has no **Translate with AI** or **Write steps with AI**.

**Cause:** They only show when Nextcloud has a provider for free prompts (task type `core:text2text`), set up under **Administration settings → Artificial intelligence**. See [Write or translate steps with AI](tours.md#write-or-translate-steps-with-ai).

**Fix:** Install and configure a provider, such as the OpenAI and LocalAI integration or a local model, and reload the step editor. When an answer is slow, check that Nextcloud's background workers for AI tasks run.

## Share Link Starts Nothing

**Symptom:** A link from **Copy link** opens Files, but no tour starts. **Copy link** said "The tour is switched off: the link starts it once you switch it on."

| Possible cause | Solution |
|---|---|
| The tour is switched off | Switch it on under **Tours**; the link you copied works from then on |
| **Tours for everyone** is off | Switch it on under **Settings** |
| The person is not in the tour's groups, or cannot open its app | Expected: the link only starts the tour for people who may get it |

See [Share a tour with a link](tours.md#share-a-tour-with-a-link).

## Share Link Opens Nothing (2.0.0, Pretty URLs)

**Symptom:** On a Nextcloud with pretty URLs (no `index.php` in its addresses), a link from **Copy link** opens nothing: the browser goes to an address that starts with `//apps/`, which it reads as another website. The links in the **Getting started** checklist on the Dashboard got the same double slash.

**Fix:** Update IntroVox to the release after 2.0.0; links copied before then work again without copying them anew.

## Image or Video Refused

**Symptom:** Adding an image or video to a step fails with a message.

| Message | Solution |
|---|---|
| "This file type is not supported…" | Use PNG, JPEG, GIF, MP4 or WebM (captions: WebVTT). SVG and WebP are refused; the real file type counts, not the name |
| "The file is too large. The limit is …" / "The image is too large: at most … megapixels." | Make the file smaller, or raise the limit; see [Image or video](managing-steps.md#image-or-video) |
| "The file is larger than this server accepts for uploads…" | Put the file in your Files and use **Choose from Files** |
| "IntroVox has no room for more media…" | Remove media from steps that no longer need it, or raise `media_quota_bytes` / `media_max_files` |
| "This video has a track with extra data…" | Export the video again without metadata |
| "This file is shared with you for viewing only…" | Use a copy you may download |

See the [threat model](../security/media.md) for what IntroVox checks and why.

## Checklist Not on the Dashboard

**Symptom:** Users don't see **Getting started** on their Dashboard.

| Possible cause | Solution |
|---|---|
| The checklist is off | Switch on **Show "Getting started" on the Dashboard** under **Settings** |
| The user arranged their own Dashboard, or removed the widget | Expected: **Put it on every Dashboard** only changes the default layout. The user adds it again under **Customize** on the Dashboard |
| A task is missing from the list | Some tasks only show where they apply: **Take the welcome tour** while the welcome tour is on, **Send a message in Talk** for people who can use Talk, **Secure your account** when an app for two-factor authentication is installed |

See [Checklist on the Dashboard](settings.md#checklist-on-the-dashboard).

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
