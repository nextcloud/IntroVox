# Managing Wizard Steps

This guide covers the CRUD operations for wizard steps: add, edit, delete, reorder, enable/disable, reset, and save.

## Overview of the Step List

After selecting a language under **Language settings**, you see the list of steps for that language. Each row shows:

| Column | Description |
|---|---|
| **☰** | Drag handle for reordering |
| **#** | Sequential step number |
| **Title** | The step heading users see |
| **ID** | Unique identifier (not editable after creation) |
| **Visible to** | Groups that can see this step (or "All users") |
| **✅ / ❌** | Enable/disable toggle |
| **✏️** | Edit button |
| **🗑️** | Delete button |

## Add New Step

1. Click **➕ Add new step** at the top of the list
2. Fill in the form

### Form Fields

| Field | Required | Description | Example |
|---|---|---|---|
| **ID** | Yes (auto-generated) | Unique step identifier, timestamp-based for new steps | `new_1731600000000` |
| **Title** | Yes | Step heading, supports emoji | `👋 Welcome to Nextcloud` |
| **Text (HTML)** | Yes | Step body, supports HTML | `<p>Nice to have you here!</p>` |
| **Element (CSS selector)** | No | Element to highlight; empty = centered modal | `a[href*="/apps/files/"]` |
| **Position** | If Element is set | Tooltip position relative to the element | `right`, `left`, `top`, `bottom` |
| **Visible to groups** | No | Groups that can see this step; empty = all users | `Administrators` |

### CSS Selector Examples

```css
/* Link to Files app — multiple fallbacks for better detection */
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]

/* Search bar — language-independent selectors (recommended) */
.unified-search__trigger, .header-menu__trigger

/* Calendar app */
[data-id="calendar"], a[href*="/apps/calendar"]

/* User menu */
#user-menu

/* Centered step (leave empty) */
```

**Tips for reliable selectors:**

- **Avoid language-specific attributes** like `aria-label="Unified search"` — these break in other languages. Use CSS classes like `.unified-search__trigger`.
- **Use multiple fallbacks** separated by commas. Default steps use this pattern (e.g., `[data-id="files"], a[href*="/apps/files"]`) to survive Nextcloud UI changes.
- **Inspect first**: open DevTools (F12), click "Inspect element", then click the target to see its classes and attributes.
- **Test in the console**: `document.querySelector('your-selector')` should return the element.

### Position Guide

| Position | Best for |
|---|---|
| `right` | Left sidebar elements (Files, Calendar) |
| `left` | Right sidebar elements (user menu) |
| `top` | Bottom navigation |
| `bottom` | Top navigation (header, search) |

### Saving

1. Click **💾 Save** in the form to add the step to the list
2. Click the green **💾 Save changes** button at the top of the list to persist all modifications

## Edit Step

1. Click **✏️ Edit** next to the step
2. Change fields as needed
3. Click **💾 Save** to confirm, or **❌ Cancel** to discard
4. Click **💾 Save changes** to persist

## Delete Step

1. Click **🗑️ Delete**
2. Confirm in the dialog
3. The step is immediately removed from the list
4. Click **💾 Save changes** to persist

> **Note:** Consider [disabling](#enabledisable-step) instead of deleting if you might want the step back later.

## Reorder Steps

1. Click and hold the **☰** drag handle on the left of a step
2. Drag to the new position
3. Release to drop
4. Click **💾 Save changes** to persist

**Important:** Since v1.0.6, step order is tracked by step **ID** (not by position), so enabling/disabling steps after reordering works correctly. You must click **Save changes** for the new order to persist.

## Enable/Disable Step

Each step has an enable/disable toggle:

- **✅ Enabled** — shown to users
- **❌ Disabled** — hidden (grayed out, with strikethrough)

Disabled steps remain in your configuration. Use this for:

- Temporarily hiding steps without deleting them
- Seasonal or conditional content
- Testing different tour configurations

## Reset to Default

The **🔄 Reset to default** button restores factory defaults for the **selected language only**.

1. Select the language to reset
2. Click **🔄 Reset to default**
3. Confirm in the dialog

**Warnings:**

- **Cannot be undone** — export first if you want a backup
- **Only the selected language** is reset; other languages remain unchanged
- All custom steps for that language are deleted

The default steps cover: Welcome to Nextcloud → File management → Calendar → Search → Important features → Useful tips → Conclusion.

## Save Changes

The green **💾 Save changes** button at the top of the steps list persists all modifications: adds, edits, deletes, reorders, and enable/disable toggles.

- Only active (not gray) when there are unsaved changes
- Switching languages with unsaved changes triggers a warning
- After saving you'll see "Steps saved successfully!"

## Group-Based Visibility

The **Visible to groups** field in the step editor restricts a step to specific Nextcloud groups. Empty = visible to all users. See [Group-Based Visibility](group-visibility.md) for the full guide.

## See Also

- [Group-Based Visibility](group-visibility.md) — restrict steps to user groups
- [Import/Export](import-export.md) — share configurations
- [Customization](../features/customization.md) — HTML in step content, CSS selectors
- [Best Practices](best-practices.md) — content guidelines
