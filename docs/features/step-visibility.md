# Step Visibility

Step visibility in IntroVox is determined by three layered controls — each of which can hide a step from a given user.

## Layer 1 — Step-Level Enable/Disable

Each step has a switch in the step list.

- **Disabled steps** (`enabled: false`) are filtered out server-side and never sent to any user
- **Enabled steps** continue to the next layer

This is a simple temporary-hide mechanism for seasonal or in-development steps. See [Managing Tour Steps](../admin/managing-steps.md#enabledisable-step).

## Layer 2 — Group-Based Visibility (v1.2.0+)

Each step has a **Visible to groups** field — a multi-select of Nextcloud groups.

- **Empty selection** (default) — step is visible to **all users**
- **One or more groups** — step is only visible to users in **at least one** of those groups

Filtering happens on the server, in [StepValidator::visibleTo()](https://github.com/nextcloud/IntroVox/blob/main/lib/Service/StepValidator.php), for the welcome tour and for tours for apps alike:

```php
foreach ($steps as $step) {
    $groups = is_array($step) ? ($step['visibleToGroups'] ?? []) : null;
    if (!self::isEnabled($step) || !is_array($groups) || ($groups !== [] && array_intersect($groups, $groupIds) === [])) {
        continue;  // switched off, a malformed group list, or not for this user's groups
    }
    unset($step['visibleToGroups']);  // the group ids stay on the server
    $visible[] = $step;
}
```

Because filtering is server-side, users cannot see hidden steps via browser developer tools, and the group ids never reach the browser. A step with a malformed group list stays out. See [Group-Based Visibility](../admin/group-visibility.md) for use cases and configuration.

A tour for an app can also be limited to groups as a whole, with **Visible to** in its settings. Users outside those groups don't get the tour at all. See [Tours](../admin/tours.md).

## Layer 3 — User Preferences

Each user can control their own tour experience via personal settings.

### Welcome Tour Done (`wizard_disabled`)

When set, the welcome tour does not auto-start for that user. They can still manually restart it from personal settings. It does not affect tours for apps.

**Set by:**

- The **"Skip and don't show again"** button on the first step
- Completing the tour (clicking **Done** on the last step)
- Switching off **Start tours by themselves** in **Personal Settings → IntroVox**

**Cleared by:**

- **Show again to everyone** on the **Welcome tour** (clears the preference for everyone)
- **Restart tour now** in personal settings

### Start Tours by Themselves (`tours_disabled`)

A switch in **Personal Settings → IntroVox**, on by default. When the user switches it off, no tour starts automatically for them: not the welcome tour, and not the tours for apps. They can still start each tour by hand from personal settings. Only the user can switch it back on; **Show again to everyone** does not change it.

### LocalStorage Completion State

The frontend keeps the welcome tour's state per browser, in localStorage:

- `introvox_completed`: the user finished the tour with **Done**, skipped it with **Skip and don't show again**, or closed it with ✕, in this browser. It does not start by itself here again
- `introvox_version`: the `wizard_version` at that moment. A newer version on the server shows the tour again

Only **Done** and **Skip and don't show again** also set `wizard_disabled` on the server. A user who closed the tour with ✕ gets it again in another browser. The server-side `wizard_disabled` preference is the authoritative state.

A tour for an app is tracked on the server only, per user: once it has started, it does not start by itself again, in any browser, until an admin uses **Show again to everyone** on that tour.

## Wizard Version Counter

The `wizard_version` appconfig value is bumped when an admin uses **Show again to everyone** on the **Welcome tour**. The frontend compares it against the version it last saw and re-shows the tour if newer — even to users who completed it. This is the mechanism by which admins can force-restart the tour for everyone, except users who switched off **Start tours by themselves**.

## Combining Layers

The three layers compose:

| Step state | Group restriction | User opt-out | Result |
|---|---|---|---|
| Enabled | None | No | User sees the step |
| Enabled | User in group | No | User sees the step |
| Enabled | User not in group | (irrelevant) | User does not see the step |
| Enabled | None | Welcome tour done, or **Start tours by themselves** off | Tour doesn't auto-start; if manually restarted, user sees the step |
| Disabled | (any) | (any) | No one sees the step |

## See Also

- [Group-Based Visibility](../admin/group-visibility.md) — configuration guide
- [Managing Tour Steps](../admin/managing-steps.md) — the switch of a step
- [Personal Settings](../user/personal-settings.md) — user controls
- [API Reference](../architecture/api-reference.md) — filtering implementation
