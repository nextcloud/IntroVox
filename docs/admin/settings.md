# Admin Settings Reference

Reference for every option in **Settings → Administration → IntroVox**.

## Global Settings

### Enable Wizard for All Users

**Location:** Top of admin page under "Global settings"

**Function:** Master switch for the entire wizard.

| State | Behavior |
|---|---|
| ✅ Checked | Wizard is enabled. New users see it automatically on first login, in their Nextcloud language. All users can restart it via personal settings. |
| ☐ Unchecked | Wizard is fully disabled. No auto-start, no manual restart. Users see "The introduction tour is currently disabled by your administrator." |

**Storage:** `appconfig` key `wizard_enabled` (`'true'` / `'false'`)

**Use case:** Useful during maintenance or when you want to temporarily disable the onboarding experience without losing your step configuration.

### Language Coverage

**Location:** A read-only hint line under the wizard toggle

**Function:** Tells you how many languages currently have an admin override. There is no per-language opt-in; every Nextcloud-supported language is automatically available to end users via the Transifex-translated defaults (`nextcloud/introvox` resource). Override management itself happens on the **Steps** tab — see [Language Management](language-management.md).

### Show Wizard to All Users

**Location:** Below the wizard toggle in "Global settings"

**Function:** Force-restart the wizard for **all users**, including those who explicitly opted out.

**Effect when clicked (and confirmed):**

- Bumps the internal wizard version counter (`wizard_version`)
- Clears each user's permanent-disable preference
- Next login: wizard auto-starts for everyone

> **Warning:** This overrides all user preferences. Users who set "Permanently disable the introduction tour" will see the wizard again.

## Override Picker (Steps tab)

### Select Language to Edit

**Location:** Top of the **Steps** tab

**Function:** Picks which language's override you're editing. The step list below the dropdown reloads with that language's override content (or the auto-translated defaults if no override exists yet).

**Behavior:**

- The dropdown lists English plus every language that currently has an admin override row
- The **+ Add language override** button opens a searchable picker over the full Nextcloud language list; no DB row is written until you save
- Changes only apply to the **selected language**
- If you switch languages with unsaved changes, you're warned

For full override workflow see [Language Management](language-management.md).

## Step Management

The step management section is detailed in [Managing Wizard Steps](managing-steps.md). The available controls are:

| Control | Action | Reference |
|---|---|---|
| **➕ Add new step** | Create a new wizard step | [Managing Steps → Add](managing-steps.md#add-new-step) |
| **✏️ Edit** | Modify an existing step | [Managing Steps → Edit](managing-steps.md#edit-step) |
| **🗑️ Delete** | Remove a step | [Managing Steps → Delete](managing-steps.md#delete-step) |
| **☰** drag handle | Reorder steps | [Managing Steps → Reorder](managing-steps.md#reorder-steps) |
| **✅ / ❌** toggle | Enable/disable individual steps | [Managing Steps → Enable/Disable](managing-steps.md#enabledisable-step) |
| **📥 Export** | Download steps as JSON | [Import/Export](import-export.md#exporting-wizard-steps) |
| **📤 Import** | Upload steps from JSON | [Import/Export](import-export.md#importing-wizard-steps) |
| **🔄 Reset** | Delete the current language's override row; next request serves auto-translated defaults | [Managing Steps → Reset](managing-steps.md#reset-to-default) |
| **💾 Save changes** | Persist all modifications | [Managing Steps → Save](managing-steps.md#save-changes) |

## Where Settings Are Stored

| Setting | Backend storage |
|---|---|
| Global enable/disable | `appconfig` → `wizard_enabled` |
| Wizard version (force-show) | `appconfig` → `wizard_version` (integer) |
| Per-language overrides | `appconfig` → `wizard_steps_<lang>` (JSON array, only present when admin saved an override) |
| Per-user permanent disable | `preferences` table (user-scoped) |

> Installs upgraded from 1.6.x may still carry a stale `enabled_languages` appconfig row. The 1.7.0 code ignores it; it's left in place for downgrade safety and can be removed with `occ config:app:delete introvox enabled_languages`.

See [Backend Architecture](../architecture/backend-architecture.md) for the full storage model.
