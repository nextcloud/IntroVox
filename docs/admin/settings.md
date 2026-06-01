# Admin Settings Reference

Reference for every option in **Settings → Administration → IntroVox**.

## Global Settings

### Enable Wizard for All Users

**Location:** Top of admin page under "Global settings"

**Function:** Master switch for the entire wizard.

| State | Behavior |
|---|---|
| ✅ Checked | Wizard is enabled. New users see it automatically on first login (in their enabled language). All users can restart it via personal settings. |
| ☐ Unchecked | Wizard is fully disabled. No auto-start, no manual restart. Users see "The introduction tour is currently disabled by your administrator." |

**Storage:** `appconfig` key `wizard_enabled` (`'true'` / `'false'`)

**Use case:** Useful during maintenance or when you want to temporarily disable the onboarding experience without losing your step configuration.

### Available Languages

**Location:** Below the wizard toggle in "Global settings"

**Function:** Multi-checkbox controlling which languages the wizard is available for.

**Supported languages out of the box:**

- 🇬🇧 English (`en`)
- 🇳🇱 Nederlands (`nl`)
- 🇩🇪 Deutsch (`de`)
- 🇫🇷 Français (`fr`)
- 🇩🇰 Dansk (`da`)
- 🇸🇪 Svenska (`sv`)

Additional languages appear automatically once their `l10n/<lang>.json` file is present — see [Multi-Language Support](../features/multi-language.md).

**Defaults:**

- On first installation, only **English** is enabled
- At least one language must remain enabled

**Storage:** `appconfig` key `enabled_languages` (JSON array of base language codes)

### Show Wizard to All Users

**Location:** Below "Available languages" in "Global settings"

**Function:** Force-restart the wizard for **all users**, including those who explicitly opted out.

**Effect when clicked (and confirmed):**

- Bumps the internal wizard version counter (`wizard_version`)
- Clears each user's permanent-disable preference
- Next login: wizard auto-starts for everyone

> **Warning:** This overrides all user preferences. Users who set "Permanently disable the introduction tour" will see the wizard again.

## Language Settings

### Select Language to Edit

**Location:** "Language settings" section, dropdown menu

**Function:** Picks which language's step configuration you're editing. The step list below the dropdown reloads for the selected language.

**Behavior:**

- Only enabled languages appear in the dropdown
- Changes only apply to the **selected language**
- If you switch languages with unsaved changes, you're warned

For full per-language configuration details see [Language Management](language-management.md).

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
| **🔄 Reset to default** | Restore factory defaults for the selected language | [Managing Steps → Reset](managing-steps.md#reset-to-default) |
| **💾 Save changes** | Persist all modifications | [Managing Steps → Save](managing-steps.md#save-changes) |

## Where Settings Are Stored

| Setting | Backend storage |
|---|---|
| Global enable/disable | `appconfig` → `wizard_enabled` |
| Enabled languages | `appconfig` → `enabled_languages` (JSON array) |
| Wizard version (force-show) | `appconfig` → `wizard_version` (integer) |
| Steps per language | `appconfig` → `wizard_steps_<lang>` (JSON array) |
| Per-user permanent disable | `preferences` table (user-scoped) |

See [Backend Architecture](../architecture/backend-architecture.md) for the full storage model.
