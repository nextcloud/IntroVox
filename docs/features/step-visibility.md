# Step Visibility

Step visibility in IntroVox is determined by three layered controls — each of which can hide a step from a given user.

## Layer 1 — Step-Level Enable/Disable

Each step has an enable/disable toggle (✅/❌) in the admin step list.

- **Disabled steps** (`enabled: false`) are filtered out server-side and never sent to any user
- **Enabled steps** continue to the next layer

This is a simple temporary-hide mechanism for seasonal or in-development steps. See [Managing Wizard Steps](../admin/managing-steps.md#enabledisable-step).

## Layer 2 — Group-Based Visibility (v1.2.0+)

Each step has a **Visible to groups** field — a multi-select of Nextcloud groups.

- **Empty selection** (default) — step is visible to **all users**
- **One or more groups** — step is only visible to users in **at least one** of those groups

Filtering happens in [ApiController::getWizardSteps()](https://github.com/nextcloud/IntroVox/blob/main/lib/Controller/ApiController.php):

```php
$userGroups = $this->groupManager->getUserGroupIds($user);
$steps = array_filter($steps, function($step) use ($userGroups) {
    if (!isset($step['visibleToGroups']) || empty($step['visibleToGroups'])) {
        return true;  // visible to all
    }
    return !empty(array_intersect($step['visibleToGroups'], $userGroups));
});
```

Because filtering is server-side, users cannot see hidden steps via browser developer tools. See [Group-Based Visibility](../admin/group-visibility.md) for use cases and configuration.

## Layer 3 — User Preferences

Each user can control their own tour experience via personal settings.

### Permanent Disable

When set, the wizard does not auto-start for that user. They can still manually restart from personal settings.

**Set by:**

- The **"Skip and don't show again"** button on the first step
- The **"Permanently disable the introduction tour"** checkbox in **Personal Settings → IntroVox**
- Completing the tour (clicking **Done** on the last step)

**Cleared by:**

- The admin's **Show wizard to all users** button (clears the preference for everyone)
- Manually unchecking the personal-settings checkbox

### LocalStorage Completion State

The frontend uses localStorage to track per-browser tour completion:

- `seen` — user closed the tour with ✕ (will reappear next login)
- `completed` — user clicked **Done** or **Skip and don't show again** (won't auto-start)

LocalStorage is per-browser, so a user who switches browsers may see the tour again. The server-side permanent-disable preference is the authoritative state.

## Wizard Version Counter

The `wizard_version` appconfig value is bumped when admins click **Show wizard to all users**. The frontend compares it against the version it last saw and re-shows the tour if newer — even to users who completed it. This is the mechanism by which admins can force-restart the tour for everyone.

## Combining Layers

The three layers compose:

| Step state | Group restriction | User opt-out | Result |
|---|---|---|---|
| Enabled | None | No | User sees the step |
| Enabled | User in group | No | User sees the step |
| Enabled | User not in group | (irrelevant) | User does not see the step |
| Enabled | None | Permanent disable | Tour doesn't auto-start; if manually restarted, user sees the step |
| Disabled | (any) | (any) | No one sees the step |

## See Also

- [Group-Based Visibility](../admin/group-visibility.md) — configuration guide
- [Managing Wizard Steps](../admin/managing-steps.md) — enable/disable toggle
- [Personal Settings](../user/personal-settings.md) — user controls
- [API Reference](../architecture/api-reference.md) — filtering implementation
