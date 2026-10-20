# Admin FAQ

Common questions from IntroVox administrators. For user-facing questions, see the [User FAQ](../user/faq.md).

## Configuration

### How do I know which CSS selector to use?

Click **Pick element** next to the Element field and click the element you want to highlight; IntroVox fills in a selector for you. See [Pick an element](managing-steps.md#pick-an-element).

To find one by hand:

1. Open Nextcloud in your browser
2. Press **F12** to open Developer Tools
3. Click the **"Inspect element"** icon (cursor with square)
4. Click the element you want to highlight
5. Use the visible class/ID/attribute in your selector:
   - Class: `.classname`
   - ID: `#id-name`
   - Link with URL: `a[href*="/apps/files/"]`

For reliability, use multiple selectors separated by commas — see [Best Practices](best-practices.md#use-multiple-css-selectors-as-fallbacks).

### Can I use HTML in step text?

Yes. Supported tags include `<p>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<br>`, `<a href="...">`.

> **Security note:** Step `title` and `text` are stored as written. Where they are shown, the text keeps only the supported tags and titles are plain text, so an imported tour or a translation cannot add scripts, styles, forms or images. See [Customization](../features/customization.md#html-in-step-content).

Example:

```html
<p>Welcome to <strong>Nextcloud</strong>!</p>
<ul>
  <li>📁 Upload files easily</li>
  <li>📅 Manage your calendar</li>
</ul>
```

### What does "centered step" mean?

A centered step has no CSS selector (`attachTo` left empty). It appears as a centered modal in the middle of the screen — good for welcome/conclusion steps.

### How do I test the wizard before users see it?

**Method 1 — Browser console:**

```js
window.introVox.reset();       // clear this browser's "welcome tour done" mark
window.introVox.start();       // start the welcome tour now, on this page
window.introVox.isCompleted(); // true when this browser has it marked done
```

`start()` works even when the welcome tour is done for you or **Start tours by themselves** is off; only **Tours for everyone** off, or the **Welcome tour** switched off under **Tours**, stops it. `reset()` only clears the mark in this browser: whether the tour starts by itself at the next login also depends on the server's `wizard_disabled`.

**Method 2 — Personal Settings:** **Personal Settings → IntroVox → Restart tour now**. The tour starts on the page that opens.

For a tour for an app, use **Preview** in its ⋯ menu under **Tours**, or **Start** next to it under **Personal Settings → IntroVox → Tours**.

### Can I use emojis in step titles and texts?

Yes, fully supported. Make sure your Nextcloud server uses UTF-8 (default).

### Can I create steps that show conditionally?

There's no built-in conditional logic, but:

- **Enable/disable toggle** lets you hide steps without deleting them
- **Group-based visibility** restricts steps to specific user groups ([Group Visibility](group-visibility.md))
- **A step whose element is not on the page** waits aside in a bottom corner with its text, and **Next** goes on; once the element appears, the step moves to it

### How many steps should I create?

5–8 is ideal. More than 10 risks tour fatigue. See [Best Practices](best-practices.md#keep-steps-short-and-focused).

## Language Questions

### How do I add a new language?

You don't have to do anything. Every language that has a translation on the [Nextcloud Transifex `nextcloud/introvox` resource](https://www.transifex.com/nextcloud/nextcloud/) becomes available automatically — the sync bot pulls the translations into `l10n/<lang>.json` via PRs, and end users in that language immediately see the auto-translated tour.

If you want **custom copy** for a specific language (different from the auto-translated default), open **Tours**, click **Edit steps** on the **Welcome tour**, click **Add language override**, pick the language, edit, save.

See [Multi-Language Support](../features/multi-language.md) for the full Transifex flow.

### Can I have different steps for different languages?

Yes — that's what overrides are for. Each override-language has its own independent `wizard_steps_<lang>` configuration that replaces the auto-translated defaults for that language. Languages without an override get the defaults.

### How do I discard an override and go back to the auto-translated defaults?

Select the language in the dropdown → click **Reset** → confirm. The override row is deleted; from then on Transifex updates flow through automatically for that language.

### What if a user's language has no Transifex translation yet?

The wizard falls back to the **English** defaults for that user. (NC's per-app language detection falls back to the system default; IntroVox forces an English fallback in `DefaultStepsService` so users never see a surprise third language.)

### Can I mix languages in step text?

Not recommended. Each override-language should have its own coherent copy. Languages without an override use the auto-translated Transifex defaults.

## Audience Control

### Can I disable the wizard for specific users?

Several options:

1. **Limit app to groups** (Nextcloud-level, recommended for full exclusion) — **Settings → Apps → IntroVox → Limit to groups**
2. **Group-based step visibility** (v1.2.0+) — restrict individual steps to groups ([Group Visibility](group-visibility.md))
3. **Globally** — switch off **Tours for everyone** (this stops every tour, also tours for apps)

(Per-language opt-out was removed in v1.7.0 — that pattern doesn't scale across 80+ Transifex languages.)

To give a tour for an app to some groups only, set **Visible to** on that tour; see [Tours](tours.md).

### Can users disable the wizard themselves?

Yes. For the welcome tour only:

- **"Skip and don't show again"** button on the first step
- Completing the tour (clicking **Done** on the last step)

**Show again to everyone** on the **Welcome tour** gives the welcome tour to these users again.

For all tours: the **Start tours by themselves** switch in **Personal Settings → IntroVox**. When a user switches it off, no tour starts automatically for them, neither the welcome tour nor tours for apps. **Show again to everyone** does not change this; users can still start tours by hand from their personal settings.

## Versioning & Compatibility

### What Nextcloud versions are supported?

IntroVox supports **Nextcloud 32–35** (35 since v1.7.7) and requires **PHP 8.1+**. Check `appinfo/info.xml` for the authoritative list.

### What's the difference between closing (✕) and completing?

For the welcome tour:

| Action | localStorage | Server preference | Auto-start next login? |
|---|---|---|---|
| **✕ Close** | Marked as done in this browser | Not changed | Only in another browser |
| **Done** button | Marked as completed | `wizard_disabled` set | No (unless admin force-shows) |
| **Skip and don't show again** | Marked as completed | `wizard_disabled` set | No (unless admin force-shows) |

A tour for an app counts as seen as soon as it starts, so it doesn't start by itself again, however the user leaves it. Its first step has **Skip** instead of **Skip and don't show again**.

### What's new in version X?

See [CHANGELOG.md](https://github.com/nextcloud/IntroVox/blob/main/CHANGELOG.md) for the full version history. Highlights:

- **v2.0.0** — tours: besides the welcome tour, tours for apps, pages or anywhere, each with its own steps, languages, groups and timing; built-in tours for Files, Talk, Deck and Calendar; statistics per tour, with how far people get; export and import a whole tour; share a tour with a link; translate or write steps with AI; images and videos in steps; steps that wait for the user; a "Getting started" checklist on the Dashboard; **Pick element**, **Preview tour**, and steps edited in a dialog
- **v1.7.9** — the admin and personal settings pages are translated (they were stuck in English); Indonesian and Slovak
- **v1.7.8** — default steps an admin deleted no longer come back in the tour; the account step points at the avatar on Nextcloud 32 and 33
- **v1.7.7** — Nextcloud 35 support; IntroVox is free, and the Support tab says so
- **v1.7.6** — repairs for garbled accents in imported steps and for escaped HTML from 1.6.x; an upgrade no longer deletes a customized tour
- **v1.7.4** — steps point at the right header elements on Nextcloud 34; Files and Calendar merged into one Files & apps step
- **v1.7.1–1.7.3** — Nextcloud 34 compatibility, translations for 89 languages from Transifex, an App Store signature fix, Enterprise detection in telemetry
- **v1.7.0** — Transifex-driven language model: every translated language available automatically, admin UI shifts from "enable languages" to "manage overrides", `enabled_languages` concept dropped; fixes for HTML-escape, wrong-language fallback, client-side re-translation; #17 and #18 closed
- **v1.6.1** — fix for previously-shown steps stacking behind the current step
- **v1.6.0** — Transifex translation infrastructure, auto-discovery of language display names, ~50 new translatable strings for PWA install instructions
- **v1.5.0** — Enterprise subscription support, NC 34 support, CSRF + XSS hardening
- **v1.4.3** — defensive `is_array()` guard preventing HTTP 500 on corrupt config
- **v1.4.2** — fallback selectors and 10s timeout for app-menu readiness
- **v1.4.1** — steps with missing target elements now fall back to centered display
- **v1.2.0** — group-based step visibility
- **v1.1.0** — user control (permanent disable), Import/Export, dynamic language detection
- **v1.0.6** — multi-language autostart, multi-selector fallbacks, ID-based step ordering

## Technical Questions

### Where are wizard configurations stored?

- **Global settings**: `oc_appconfig` (`wizard_enabled`, `wizard_version`)
- **Per-language overrides**: `oc_appconfig` (`wizard_steps_<lang>` — only present when an admin saved an override)
- **Tours for apps**: `oc_appconfig` (`tours`, and `tour_steps_<tour>_<lang>` for their steps)
- **Images and videos of steps, and backups of the last ten deleted tours**: the app data folder (`appdata_<instanceid>/introvox`)
- **User preferences**: `oc_preferences` (user-scoped): `wizard_disabled` (welcome tour done), `tours_disabled` (**Start tours by themselves** off), `tour_<tour>_seen`

> 1.6.x installs may still carry a stale `enabled_languages` row. The 1.7.0 code ignores it; it's harmless and left in place for downgrade safety.

See [Backend Architecture](../architecture/backend-architecture.md).

### Can I edit steps directly in the database?

Technically yes, but **not recommended**. Use the admin interface or the Import/Export feature to avoid corruption. Since v1.4.3, if `wizard_steps_<lang>` doesn't decode to a valid array, the backend falls back to defaults rather than crashing.

### Does IntroVox work with reverse proxies?

Yes. Standard Nextcloud reverse-proxy setups work; just ensure JavaScript and CSS files are served correctly through your proxy.

### Does the app collect telemetry?

Telemetry was added in v1.4.x and reports anonymous usage stats (user counts, tour-completion events) to `licenses.voxcloud.nl`. Since v1.5.0, the payload includes the configured subscription key and whether this Nextcloud has an Enterprise subscription (`hasValidSubscription`, and `hasExtendedSupport` for the add-on), used by the license server to verify Enterprise claims. Since 2.0.0 nothing is sent until an admin has been asked: the admin tour ends with the question. Admins can switch telemetry off at any time in the Statistics tab; see [Telemetry](telemetry.md).

## Best Practice Questions

### How often should I update wizard content?

After every major Nextcloud upgrade, when adding new essential apps, and based on user feedback (quarterly is a reasonable cadence). See [Best Practices → Review Quarterly](best-practices.md#review-quarterly).

### Should I attach every step to an element?

No — mix it up:

- **Centered steps** for welcome, transitions, and conclusion
- **Attached steps** for specific UI elements you want to highlight

### Can I A/B test different wizard configurations?

Not built-in. You can manually swap exports for different time periods and gather user feedback, but there's no built-in cohorting.

## See Also

- [Admin Guide](guide.md)
- [Managing Tour Steps](managing-steps.md)
- [Troubleshooting](troubleshooting.md)
- [Best Practices](best-practices.md)
- [User FAQ](../user/faq.md)
