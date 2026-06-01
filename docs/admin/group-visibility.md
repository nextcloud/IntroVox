# Group-Based Step Visibility

*Introduced in v1.2.0.*

Group-based step visibility lets you restrict individual wizard steps to specific Nextcloud groups, enabling **role-based onboarding** — different tours for different roles, without maintaining separate configurations.

## How It Works

Each step has a **Visible to groups** field (multi-select dropdown of all Nextcloud groups):

- **Empty selection (default)** — step is visible to **all users**
- **One or more groups selected** — step is only visible to users who are members of **at least one** of those groups

Filtering happens **server-side** in [ApiController::getWizardSteps()](../../lib/Controller/ApiController.php), so users cannot see hidden steps even via browser developer tools.

## Configuring Group Visibility

1. Click **✏️ Edit** on any step
2. Find the **Visible to groups** dropdown below the Position selector
3. Select one or more Nextcloud groups
4. Click **💾 Save** in the form
5. Click **💾 Save changes** at the top of the steps list to persist

## Use Cases

### Role-Based Onboarding

| Step | Visible to Groups | Audience |
|---|---|---|
| Welcome | *(empty)* | All users |
| Files Overview | *(empty)* | All users |
| Admin Panel | `Administrators` | Admins only |
| Advanced Search | `Power Users`, `Administrators` | Power users and admins |
| HR Self-Service | `HR` | HR team |
| Dev Tools | `Developers` | Developer team |

### Department-Specific Tours

Create one tour with section-specific steps:

- General steps visible to all
- HR-specific steps restricted to the `HR` group
- IT-specific steps restricted to the `IT` group
- Marketing-specific steps restricted to the `Marketing` group

### Pilot Group Rollouts

When testing new wizard content:

1. Create the new steps
2. Restrict them to a `Pilot` group while gathering feedback
3. Once validated, clear the group restriction to roll out to everyone

### Training Levels

- **Basic steps** (empty groups) — everyone sees them
- **Advanced steps** (restricted to `Power Users`) — only experienced users

## How Filtering Works Internally

When the frontend requests `GET /apps/introvox/api/steps`:

1. Backend loads the step configuration from `wizard_steps_<lang>`
2. Backend reads the current user's groups via `IGroupManager::getUserGroupIds()`
3. For each step, checks if `visibleToGroups` is empty (visible to all) or intersects with the user's groups
4. Returns only the matching steps

This means:

- Users **never receive** hidden step content over the wire — protection is at the API layer
- If a user is added to a group later, they see the relevant steps on their next wizard view (no caching of step lists per user)

## Notes and Edge Cases

- **Export/Import preserves group settings** — `visibleToGroups` is included in the JSON payload
- **Group changes take effect immediately** — no cache to flush, no admin action needed
- **Empty `visibleToGroups: []`** in imported JSON means visible to all (same as the field being absent)
- **Group IDs vs. display names** — IntroVox uses group **IDs**, not display names. Most installations have these aligned, but verify in **Settings → Users**.

## Best Practices

1. **Start permissive, restrict later** — leave new steps visible to all initially, then add group restrictions once you know who needs what. Easier than the reverse.
2. **Document your group usage** — keep a note of which groups gate which steps so future admins understand the structure.
3. **Test with a non-admin account** — group filtering works server-side, but only by logging in as a non-member can you confirm the user experience.
4. **Combine with language separation** — group-based filtering applies *within* a language. To target both a language and a group, configure that language's steps with the relevant group restrictions.

## Alternatives to Step-Level Group Restriction

| Goal | Approach |
|---|---|
| Hide the entire app from certain users | **Settings → Apps → IntroVox → Limit to groups** (Nextcloud-level) |
| Disable the wizard for all users in a language | Uncheck the language in **Available languages** |
| Disable the wizard globally | Uncheck **Enable wizard for all users** |
| Show different steps per user role | **Group-based visibility** (this page) |

## See Also

- [Managing Wizard Steps](managing-steps.md) — Step CRUD
- [Step Visibility](../features/step-visibility.md) — Group filters + user preferences
- [API Reference](../architecture/api-reference.md) — `getWizardSteps` endpoint with filtering
