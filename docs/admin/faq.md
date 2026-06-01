# Admin FAQ

Common questions from IntroVox administrators. For user-facing questions, see the [User FAQ](../user/faq.md).

## Configuration

### How do I know which CSS selector to use?

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

> **Security note:** Step `title` and `text` are sanitized server-side via `OCP\Util::sanitizeHTML` on save/import (since v1.5.0) to prevent stored XSS.

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
window.nextcloudWizard.reset();
window.nextcloudWizard.start();
```

**Method 2 — Personal Settings:** **Personal Settings → IntroVox → Restart tour now**, then refresh the page.

### Can I use emojis in step titles and texts?

Yes, fully supported. Make sure your Nextcloud server uses UTF-8 (default).

### Can I create steps that show conditionally?

There's no built-in conditional logic, but:

- **Enable/disable toggle** lets you hide steps without deleting them
- **Group-based visibility** restricts steps to specific user groups ([Group Visibility](group-visibility.md))
- **Non-matching CSS selectors** are gracefully handled (v1.4.1+ falls back to centered display)

### How many steps should I create?

5–8 is ideal. More than 10 risks tour fatigue. See [Best Practices](best-practices.md#keep-steps-short-and-focused).

## Language Questions

### How do I add a new language?

IntroVox auto-discovers languages from `l10n/<lang>.json` — no code changes needed.

1. Contribute or download translations via [Nextcloud Transifex](https://www.transifex.com/nextcloud/nextcloud/)
2. Drop the `.json` file into the app's `l10n/` directory
3. The new language appears in **Available languages** checkboxes automatically
4. Enable it and customize steps if desired

See [Multi-Language Support](../features/multi-language.md) for the full Transifex flow.

### Can I have different steps for different languages?

Yes — that's one of the core features. Each language has its own independent `wizard_steps_<lang>` configuration.

### How do I reset one language without affecting others?

Select the language in the dropdown → click **🔄 Reset to default** → confirm. Only that language is reset.

### What if a user's language isn't enabled?

They see "*The introduction tour is not available in your language*" in personal settings and can't start the wizard. The tour does not fall back to English automatically — this is intentional, so users aren't surprised by an unfamiliar language.

### Can I mix languages in step text?

Not recommended. Each language should have its own complete translation via the language dropdown.

## Audience Control

### Can I disable the wizard for specific users?

Several options:

1. **Limit app to groups** (Nextcloud-level, recommended for full exclusion) — **Settings → Apps → IntroVox → Limit to groups**
2. **Group-based step visibility** (v1.2.0+) — restrict individual steps to groups ([Group Visibility](group-visibility.md))
3. **Per-language** — disable the user's language in **Available languages**
4. **Globally** — uncheck **Enable wizard for all users**

### Can users disable the wizard themselves?

Yes (since v1.1.0):

- **"Skip and don't show again"** button on the first step
- **"Permanently disable the introduction tour"** checkbox in personal settings
- Completing the tour (clicking **Done** on the last step)

Admins can override these with **Show wizard to all users**.

## Versioning & Compatibility

### What Nextcloud versions are supported?

As of v1.5.0, IntroVox declares compatibility with **Nextcloud 32–34** and requires **PHP 8.1+**. Check `appinfo/info.xml` for the authoritative list.

### What's the difference between closing (✕) and completing?

| Action | localStorage | Server preference | Auto-start next login? |
|---|---|---|---|
| **✕ Close** | Marked as "seen" | Not changed | Yes |
| **Done** button | Marked as completed | Permanent-disable set | No (unless admin force-shows) |
| **Skip and don't show again** | Marked as completed | Permanent-disable set | No (unless admin force-shows) |

### What's new in version X?

See [CHANGELOG.md](../../CHANGELOG.md) for the full version history. Highlights:

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

- **Global settings**: `oc_appconfig` (`wizard_enabled`, `enabled_languages`, `wizard_version`)
- **Per-language steps**: `oc_appconfig` (`wizard_steps_en`, `wizard_steps_nl`, ...)
- **User preferences** (permanent disable): `oc_preferences` (user-scoped)

See [Backend Architecture](../architecture/backend-architecture.md).

### Can I edit steps directly in the database?

Technically yes, but **not recommended**. Use the admin interface or the Import/Export feature to avoid corruption. Since v1.4.3, if `wizard_steps_<lang>` doesn't decode to a valid array, the backend falls back to defaults rather than crashing.

### Does IntroVox work with reverse proxies?

Yes. Standard Nextcloud reverse-proxy setups work; just ensure JavaScript and CSS files are served correctly through your proxy.

### Does the app collect telemetry?

Telemetry was added in v1.4.x and reports anonymous usage stats (user counts, tour-completion events) to `licenses.voxcloud.nl`. Since v1.5.0, the payload includes the configured subscription key and a `hasExtendedSupport` flag, used by the license server to verify Enterprise claims. Admins can disable telemetry in the Support tab.

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
- [Managing Wizard Steps](managing-steps.md)
- [Troubleshooting](troubleshooting.md)
- [Best Practices](best-practices.md)
- [User FAQ](../user/faq.md)
