# IntroVox - Administrator Guide

**Version 1.2.0** | Complete administrative guide for IntroVox

This guide describes all administrative functions of the IntroVox app for Nextcloud.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Administrator Settings](#accessing-administrator-settings)
3. [Global Settings](#global-settings)
4. [Language Settings](#language-settings)
5. [Managing Wizard Steps](#managing-wizard-steps)
6. [Import/Export Functionality](#importexport-functionality)
7. [User Control Features](#user-control-features)
8. [End User Experience](#end-user-experience)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Overview

IntroVox is an interactive onboarding wizard that helps new Nextcloud users get started quickly. The app provides a step-by-step tour through Nextcloud's key features.

### Key Features for Version 1.2.0:

**User Experience:**
- ✅ Users can permanently disable the wizard
- ⏭️ "Skip and don't show again" button on first step
- 👤 Personal settings for full user control
- 🔄 Restart tour anytime

**Multi-Language Support:**
- 🌍 6 languages included (EN, NL, DE, DA, FR, SV)
- 🔧 Dynamic language detection via translation files
- 📝 Per-language wizard configuration
- 🌐 Transifex-ready for community translations
- 👥 Selective language enable/disable

**Admin Configuration:**
- ✅ Fully customizable wizard steps
- 📦 Import/Export wizard configurations
- 🎯 Target specific page elements for highlighting
- 📝 HTML support for rich text formatting
- 🔄 Drag-and-drop to reorder steps
- ⚙️ Configure steps independently per language
- 🔀 "Show wizard to all users" override
- 👥 **NEW:** Group-based step visibility (show steps only to specific user groups)

**Technical:**
- 🎨 Nextcloud design system integration
- 📱 Mobile responsive
- 🌓 Dark mode support
- ♿ Accessibility features

---

## Accessing Administrator Settings

### Step 1: Login as Administrator
Log in to Nextcloud with an account that has administrator privileges.

### Step 2: Navigate to Settings
1. Click on your **user avatar** in the top right
2. Select **Settings** (gear icon ⚙️)
3. Scroll in the left menu to **Administration**
4. Click on **IntroVox**

You are now on the IntroVox administration page.

---

## Global Settings

Global settings determine whether and for which languages the wizard is available.

### 🌍 Enable Wizard for All Users

**Location:** Top of the admin page under "Global settings"

**Function:** This checkbox controls whether the wizard is available for users.

**Options:**
- ✅ **Checked**: Wizard is enabled and available for all users (in their enabled language)
  - New users see the wizard automatically on first login
  - All users can restart the wizard via their personal settings
- ☐ **Unchecked**: Wizard is completely disabled for everyone
  - The wizard does **not** start automatically for new users
  - Users **cannot** start the wizard manually via their personal settings
  - Users see a message: "The introduction tour is currently disabled by your administrator."

**Usage:**
1. Check or uncheck the checkbox
2. The setting is saved automatically

**Important:** When unchecked, the wizard is completely unavailable to all users. This is useful during maintenance or when you want to temporarily disable the onboarding experience.

---

### 🌐 Available Languages

**Location:** Below the wizard toggle in "Global settings"

**Function:** Select which languages the wizard should be available for.

**Supported Languages:**
- 🇬🇧 English
- 🇳🇱 Nederlands
- 🇩🇪 Deutsch
- 🇫🇷 Français
- 🇩🇰 Dansk
- 🇸🇪 Svenska

**Usage:**
1. Check the languages you want to make available
2. Unchecked languages are not available for users
3. The setting is saved automatically with each change

**Default Setting:** On first installation, only **English** is enabled.

**Note:**
- Users with a disabled language cannot see or start the wizard
- In their personal settings, they see a message that the wizard is not available in their language
- You must keep at least one language enabled

---

## Language Settings

IntroVox supports completely separate wizard steps per language. This means you can configure different steps for each language.

### 🌐 Select Language to Edit

**Location:** "Language settings" section with dropdown menu

**Function:** Select the language for which you want to edit wizard steps.

**Usage:**
1. Click on the dropdown menu under "Select language to edit"
2. Choose a language (only enabled languages are visible)
3. The steps for the selected language are loaded

**Important:**
- Changes only apply to the **selected language**
- Each language has its own set of wizard steps
- If you switch between languages with unsaved changes, you will be warned

**Example:**
- Dutch users see the steps you configure under "Nederlands"
- German users see the steps you configure under "Deutsch"
- These are completely independent configurations

---

## Managing Wizard Steps

### Overview of Steps

After selecting a language, you see a list of all wizard steps for that language.

**Step Information Includes:**
- **ID**: Unique identifier (not editable)
- **Title**: The step title
- **Text Preview**: A short preview of the step text
- **Element**: CSS selector of the highlighted element (if applicable)
- **Position**: Where the tooltip appears (left, right, top, bottom)
- **Status**: Whether the step is enabled (✅) or disabled (❌)
- **Visible to**: Which user groups can see this step (or "All users" if no groups are selected)

### ➕ Add New Step

**Button:** "➕ Add new step"

**Steps:**
1. Click the "➕ Add new step" button
2. A new form appears with the following fields:

**Form Fields:**

| Field | Description | Required | Example |
|-------|-------------|----------|---------|
| **ID** | Unique identifier for the step | Yes | `welcome`, `files`, `settings` |
| **Title** | The title users will see | Yes | `Welcome to Nextcloud` |
| **Text (HTML)** | The main text of the step (HTML allowed) | Yes | `<p>This is the <strong>first step</strong>!</p>` |
| **Element (CSS selector)** | The element to highlight | No | `a[href*="/apps/files/"]` |
| **Position** | Where the tooltip appears | Yes | `right`, `left`, `top`, `bottom` |
| **Visible to groups** | User groups that can see this step | No | Select groups or leave empty for all users |

**CSS Selector Examples:**
```css
/* Link to Files app - multiple fallbacks for better detection */
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]

/* Search bar - language-independent selectors (recommended) */
.unified-search__trigger, .header-menu__trigger

/* Calendar app */
[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]

/* User menu */
#user-menu

/* Specific button */
button.primary

/* Centered step (leave empty) */

```

**Important Notes:**
- **Language-independent selectors:** Avoid using `aria-label` or other language-specific attributes (e.g., `button[aria-label="Unified search"]`), as these will only work in one language. Instead, use CSS classes like `.unified-search__trigger` or `.header-menu__trigger` that work across all languages.
- **Multiple fallbacks:** Since version 1.0.6, default steps use multiple CSS selectors with fallbacks to ensure steps are shown even if one selector doesn't match. This prevents steps from being skipped due to "element not found" errors.

3. Click **💾 Save** to save the step
4. Click **❌ Cancel** to stop without saving

**Note:** Don't forget to click the green **💾 Save changes** button at the top of the steps list to save all changes permanently!

---

### ✏️ Edit Step

**Usage:**
1. Click the **✏️ Edit** button next to the step you want to modify
2. Change the desired fields
3. Click **💾 Save** to save the changes
4. Click **❌ Cancel** to discard the changes

---

### 🗑️ Delete Step

**Usage:**
1. Click the **🗑️ Delete** button next to the step you want to remove
2. Confirm the deletion in the dialog
3. The step is immediately removed from the list

**Note:** This action cannot be undone. Make sure you're deleting the correct step!

---

### 🔄 Reorder Steps

**Function:** Change the order in which steps are shown to users.

**Usage:**
1. Click and hold the **☰** drag icon on the left side of a step
2. Drag the step to the desired position
3. Release to place the step
4. The order is automatically updated
5. Click **💾 Save** to permanently save the new order

**Important:** Since version 1.0.6, you must click the **💾 Save changes** button at the top of the steps list to persist the new order. The order is tracked by step ID, not by position, ensuring that enabling/disabling steps after reordering works correctly.

---

### ✅ Enable/Disable Step

**Function:** Temporarily enable or disable individual steps without deleting them.

**Usage:**
1. Click the **✅** (enabled) or **❌** (disabled) toggle next to the step
2. The status changes immediately
3. Disabled steps are skipped in the wizard

**Benefit:** You can temporarily disable steps (e.g., seasonal steps) without deleting them.

---

### 👥 Group-Based Step Visibility (NEW in v1.2.0)

**Function:** Control which user groups can see specific wizard steps.

**Location:** In the step editor, below the Position selector

**Usage:**
1. Click **✏️ Edit** on any step
2. Find the "Visible to groups" dropdown
3. Select one or more Nextcloud groups
4. Click **✓ Save**
5. Click **💾 Save changes** to persist

**Behavior:**
- **Empty selection (default)**: Step is visible to **all users**
- **One or more groups selected**: Step is only visible to users who are members of at least one selected group

**Use Cases:**
- **Role-based onboarding**: Show admin-specific steps only to administrators
- **Department-specific tours**: Different steps for HR, IT, Marketing teams
- **Training levels**: Basic steps for new users, advanced steps for power users
- **Feature rollouts**: Show new feature steps only to pilot groups

**Example Configuration:**
| Step | Visible to Groups | Result |
|------|-------------------|--------|
| Welcome | (empty) | Visible to all users |
| Admin Panel | Administrators | Only visible to admins |
| Files Overview | (empty) | Visible to all users |
| Advanced Search | Power Users, Administrators | Visible to power users and admins |

**Important Notes:**
- Group filtering happens on the **server side** for security
- Users cannot see hidden steps, even via browser developer tools
- Steps are filtered based on the user's current group membership
- If a user is added to a group later, they will see the relevant steps on their next wizard view
- Export/import includes group visibility settings

**Tip:** Start with all steps visible to everyone, then selectively restrict steps as needed. This ensures no user misses important information.

---

### 🔄 Reset to Default

**Button:** "🔄 Reset to default"

**Function:** Reset all wizard steps for the **selected language** to default settings.

**Usage:**
1. Select the language you want to reset
2. Click the "🔄 Reset to default" button
3. Confirm the action in the dialog
4. All custom steps are removed and replaced with default steps

**Warning:**
- This action **cannot** be undone
- **Only** the steps for the selected language are reset
- Other languages remain unchanged

**Default Steps per Language:**
The default steps contain an introduction to Nextcloud covering:
- Welcome to Nextcloud
- File management
- Calendar
- Search functionality
- Important features
- Useful tips
- Conclusion

---

### 💾 Save Changes

**Button:** "💾 Save changes" (green, at top of steps list)

**Function:** Save all changes to wizard steps permanently.

**Usage:**
1. Make your desired changes to the steps
2. Click the green **💾 Save changes** button at the top of the steps list
3. You'll see a success message: "Steps saved successfully!"
4. The changes are now active for users

**Note:**
- The button is only active (not gray) when there are changes
- If you switch between languages without saving, your changes are discarded
- You'll get a warning if you try to switch with unsaved changes

---

## Import/Export Functionality

**New in version 1.1.0**

The Import/Export feature enables collaboration with content creators, sharing configurations between instances, and version control integration.

### 📤 Exporting Wizard Steps

**Purpose:** Download wizard steps as JSON file for:
- Sharing configurations with other Nextcloud instances
- Allowing content creators to work offline
- Version control (commit JSON to git)
- Backup before making changes
- Collaboration with translators

**How to Export:**
1. Select the language you want to export from the language dropdown
2. Click the **Export** button (top of steps list)
3. A JSON file downloads automatically
4. File name format: `introvox-steps-{language}-{timestamp}.json`

**Example:** Exporting English steps on Jan 15, 2025 creates: `introvox-steps-en-2025-01-15-143022.json`

**What's Exported:**
- All wizard steps for the selected language
- Step IDs, titles, text content
- Element selectors and positions
- Enabled/disabled status
- Step order
- Group visibility settings (visibleToGroups)

**Use Cases:**
- **Content Creation**: Send JSON to marketing team, they edit offline, send back
- **Translation**: Give JSON to translation agency familiar with JSON format
- **Development**: Test wizard changes locally before deploying to production
- **Sharing**: Share best-practice configurations with community
- **Backup**: Keep a copy before making major changes

### 📥 Importing Wizard Steps

**Purpose:** Upload wizard steps from JSON file created via export or by content creators.

**How to Import:**
1. Select the target language from the language dropdown
2. Click the **Import** button (top of steps list)
3. Select a JSON file from your computer
4. Click **Open**
5. You'll see a success message showing number of imported steps

**Example:** "Successfully imported 8 steps for language en"

**Important Notes:**
- ⚠️ **Import replaces all existing steps** for that language
- ✅ Only affects the selected language (safe for multi-language setups)
- ✅ Validates JSON format before importing
- ✅ Shows clear error messages if file is invalid
- 💾 **Auto-saves** - Changes are immediately active after successful import

**Validation:**
The import function validates:
- JSON syntax is correct
- Required fields are present (id, title, text)
- Data types are correct
- No duplicate step IDs

**Error Handling:**
If import fails, you'll see a specific error message:
- "Error importing steps: Invalid JSON format"
- "Error importing steps: Missing required field 'id' in step 3"
- "Error importing steps: {specific error}"

**Workflow Example - Content Creator Collaboration:**

1. **Administrator:**
   - Exports current English steps
   - Sends `introvox-steps-en-2025-01-15.json` to content writer

2. **Content Writer:**
   - Opens JSON in text editor
   - Edits step titles and descriptions
   - Saves file as `introvox-steps-en-updated.json`

3. **Administrator:**
   - Imports `introvox-steps-en-updated.json`
   - Reviews changes in preview
   - Tests wizard with new content
   - Exports again for version control

**JSON File Structure:**
```json
[
  {
    "id": "welcome",
    "title": "👋 Welcome to Nextcloud",
    "text": "<p>Nice to have you here!</p>",
    "attachTo": "",
    "position": "right",
    "enabled": true,
    "visibleToGroups": []
  },
  {
    "id": "files",
    "title": "📁 Files",
    "text": "<p>Manage your files here.</p>",
    "attachTo": "[data-id=\"files\"]",
    "position": "right",
    "enabled": true,
    "visibleToGroups": []
  },
  {
    "id": "admin-panel",
    "title": "⚙️ Admin Panel",
    "text": "<p>Configure your Nextcloud instance here.</p>",
    "attachTo": "[data-id=\"settings\"]",
    "position": "right",
    "enabled": true,
    "visibleToGroups": ["admin", "Administrators"]
  }
]
```

**Note:** The `visibleToGroups` field contains an array of group IDs. An empty array `[]` means the step is visible to all users.

---

## User Control Features

**New in version 1.1.0**

Users now have full control over their wizard experience with options to permanently disable it.

### 👤 User Personal Settings

Users can manage wizard preferences in **Personal Settings → IntroVox**:

**Available Options:**
1. **Restart tour now** - Button to manually restart the wizard
2. **Permanently disable the introduction tour** - Checkbox to never see wizard again

### ⏭️ "Skip and don't show again" Button

**Location:** First step of the wizard (Welcome screen)

**Function:**
- Allows users to immediately opt-out on first encounter
- Permanently disables wizard for that user
- Sets the same preference as "Permanently disable" in personal settings

**Behavior:**
- Wizard closes immediately
- User preference saved to database
- Wizard won't auto-start on future logins
- User can still manually restart via personal settings

**Translation:** Available in all 6 supported languages

### 🔄 Admin Override - "Show wizard to all users"

**Purpose:** Force the wizard to appear for all users, even those who disabled it.

**Use Cases:**
- Major Nextcloud update with new features
- Important company announcement via wizard
- Reset after updating wizard content significantly
- Troubleshooting user issues

**How to Use:**
1. Go to Admin Settings → IntroVox
2. Click **Show wizard to all users** button
3. Confirm the action in the dialog
4. All user preferences are cleared
5. Wizard appears for everyone on next login

**⚠️ Important Warning:**
This action affects **ALL users**, including those who specifically disabled the wizard. Their "permanently disable" preference will be cleared.

**Confirmation Dialog:**
"This will reset the wizard for ALL users, including those who have permanently disabled it in their personal settings. Their 'disable wizard' preference will be cleared, and the wizard will be shown again on their next login."

### Smart Completion Behavior

**Closing with ✕ button:**
- Marks wizard as "seen" in localStorage
- Does NOT set permanent disable preference
- Wizard may appear again (e.g., after version update)

**Completing with "Done" button:**
- Marks wizard as completed in localStorage
- Sets permanent disable preference in database
- Wizard won't auto-start again unless admin forces it

**"Skip and don't show again" button:**
- Immediately sets permanent disable preference
- Marks as completed
- Same effect as completing normally

### User States

Users can be in one of these states:

1. **New User (Never seen wizard)**
   - Wizard auto-starts on first login (if language enabled)
   - Sees "Start tour" and "Skip and don't show again" buttons

2. **Wizard Closed (Not completed)**
   - Closed with ✕ button
   - Wizard auto-starts on next login
   - Can manually restart anytime

3. **Wizard Completed**
   - Finished all steps and clicked "Done"
   - Permanently disabled
   - Won't auto-start again
   - Can manually restart via personal settings

4. **Permanently Disabled**
   - User checked "Permanently disable" in personal settings
   - OR clicked "Skip and don't show again"
   - OR completed the wizard
   - Won't auto-start again
   - Can manually restart via personal settings

5. **Admin Force-Shown**
   - Admin used "Show wizard to all users"
   - All preferences cleared
   - Back to state 1 (New User)

---

## End User Experience

### Automatic Start

If the wizard is enabled and the user's language is enabled:
- New users see the wizard automatically on first login
- The wizard starts on the dashboard page
- Users can close the wizard anytime with "✕" or "Skip"

**Language Support (since v1.0.6):**
- The wizard now automatically starts for users with **any enabled language** (not just English)
- The wizard detects the user's browser/Nextcloud language setting
- If that language is enabled in admin settings, the wizard starts automatically
- Users see wizard steps in their own language

### Manual Start

Users can manually (re)start the wizard:

**Steps:**
1. Click the **user avatar** in the top right
2. Select **Settings**
3. Click **Help** in the left menu (under "Personal")
4. Click the **🔄 Restart tour** button in the **IntroVox** section
5. Refresh the page to start the wizard

### Behavior When Wizard or Language is Disabled

If you disable the wizard globally or disable a user's language:
- Users do **not** see the wizard automatically
- In their personal settings, they see a message:
  - **When globally disabled**: "The introduction tour is currently disabled by your administrator."
  - **When language disabled**: "The introduction tour is not available in your language."
- They **cannot** start the wizard manually

---

## Frequently Asked Questions

### How do I know which CSS selector to use?

**Answer:**
1. Open Nextcloud in your browser
2. Press **F12** to open Developer Tools
3. Click the **"Inspect element"** icon (cursor with square)
4. Click the element you want to highlight
5. In the HTML code, you'll see the **class**, **id**, or other attributes
6. Use these in your selector:
   - Class: `.classname`
   - ID: `#id-name`
   - Link with specific URL: `a[href*="/apps/files/"]`

**Examples:**
```css
/* Element with class "search-bar" */
.search-bar

/* Element with ID "user-menu" */
#user-menu

/* All links to the Files app */
a[href*="/apps/files/"]

/* First item in navigation */
nav ul li:first-child
```

### Can I use HTML in step text?

**Answer:** Yes! You can use HTML in the text field of each step.

**Allowed HTML:**
- `<p>` for paragraphs
- `<strong>` and `<b>` for bold text
- `<em>` and `<i>` for italic text
- `<ul>` and `<ol>` for lists
- `<li>` for list items
- `<br>` for line breaks
- `<a href="...">` for links

**Example:**
```html
<p>Welcome to <strong>Nextcloud</strong>!</p>
<p>Here are some tips:</p>
<ul>
  <li>📁 Upload files easily</li>
  <li>📅 Manage your calendar</li>
  <li>👥 Share with colleagues</li>
</ul>
```

### What happens if a user chooses a different language?

**Answer:**
- Nextcloud automatically detects the user's browser language
- If that language is enabled in IntroVox, the user sees wizard steps in that language
- If that language is **not** enabled, the user cannot see the wizard
- Users then get a message in their personal settings

### Can I have different steps for different languages?

**Answer:** Yes! This is one of IntroVox's key features.

**Example Use:**
- For Dutch users: steps about specific Dutch Nextcloud apps
- For English users: general international steps
- For French users: steps in French with French examples

Each language has its **own independent set of steps**.

### How do I reset steps for one language without affecting others?

**Answer:**
1. Select the desired language in the dropdown menu under "Language settings"
2. Click the "🔄 Reset to default" button
3. Confirm the action
4. **Only** the steps for that language are reset
5. Other languages remain unchanged

### Can I disable the wizard for specific users?

**Answer:** Yes! Since version 1.2.0, you have multiple options:

**Option 1: Per User Group (NEW in v1.2.0)**
- Configure steps to be visible only to specific groups
- Users not in those groups won't see those steps
- Perfect for role-based onboarding

**Option 2: Per Language**
- Disable that user's language in "Available languages"
- All users with that language can no longer see the wizard

**Option 3: Disable Globally**
- Uncheck "Wizard enabled for all users"
- **Nobody** sees the wizard anymore

### What does "centered step" mean?

**Answer:** A centered step is a step that is **not** linked to a specific element on the page.

**Usage:**
- Leave the "Element (CSS selector)" field **empty**
- The wizard shows a centered dialog in the middle of the screen
- Perfect for introduction or closing steps

**Example:**
- Welcome message at the beginning
- "All done!" message at the end

### How do I test the wizard before users see it?

**Answer:**

**Method 1: Browser Developer Console**
1. Open Nextcloud in your browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Type: `window.nextcloudWizard.reset()`
5. Press **Enter**
6. Type: `window.nextcloudWizard.start()`
7. Press **Enter**
8. The wizard starts!

**Method 2: Personal Settings**
1. Go to your own **Personal settings**
2. Click **Help** in the left menu
3. Click **🔄 Restart tour**
4. Refresh the page

**Tip:** Always test your changes before saving and making them available to users!

### Can I use emojis in step titles and texts?

**Answer:** Yes! Emojis are fully supported.

**Examples:**
- 📁 Files
- 📅 Calendar
- 👋 Welcome!
- ✨ Important features
- 💡 Useful tips

**Note:** Make sure your Nextcloud server supports UTF-8 encoding (default).

### What happens if a step refers to an element that doesn't exist?

**Answer:**
- Since version 1.0.6, if an element is not found, that step is **automatically skipped**
- The wizard continues with the next step
- The wizard does **not** crash
- This can happen if:
  - The CSS selector is incorrect
  - The Nextcloud app is not installed
  - The user doesn't have rights to see the element

**Improved in v1.0.6:** Default steps now use multiple CSS selectors with fallbacks (e.g., `[data-id="files"], a[href*="/apps/files"]`), which significantly reduces the chance of steps being skipped.

**Tip:** Always test your CSS selectors on different Nextcloud installations and user roles. Use multiple selectors separated by commas for better reliability.

### How do I temporarily disable the wizard for maintenance?

**Answer:**
1. Go to **Settings** → **Administration** → **IntroVox**
2. Uncheck "Wizard enabled for all users"
3. The wizard is now disabled for everyone
4. After maintenance: check the checkbox again

**Benefit:** All your configurations are preserved, you're only temporarily disabling the wizard.

### What's new in version 1.0.6?

**Answer:** Version 1.0.6 includes several important improvements:

**Bug Fixes:**
- **Multi-language support**: Wizard now automatically starts for users with any enabled language (not just English)
- **Step reordering bug**: Fixed issue where enabled steps were incorrectly hidden after reordering
  - Changed to ID-based checkbox binding for better reliability
  - Improved drag-and-drop reactivity
- **Missing steps**: Enhanced CSS selectors with fallback options to prevent steps from being skipped

**Improvements:**
- **Better element detection**: Default steps now use multiple CSS selectors with fallbacks
  - Example: `[data-id="files"], a[href*="/apps/files"]`
  - Significantly reduces "element not found" errors
- **Admin language selection**: Admin panel now automatically selects first available language if current selection is disabled
- **Debug logging**: Added console logging to help troubleshoot step visibility issues

**Visual Changes:**
- **App icon**: Updated to compass design with black color for better visibility in light theme
- Sidebar settings icons now use dark variant for proper contrast

**Documentation:**
- Added link to Administrator Guide in app metadata for easy access from App Store

### How do I use Import/Export for collaboration?

**Answer:** Import/Export enables easy collaboration with content creators, translators, and other administrators.

**Workflow for Content Creators:**
1. Export current steps: Admin Settings → IntroVox → Export
2. Send JSON file to content creator (e.g., marketing team)
3. Content creator edits JSON in text editor
4. Content creator sends updated JSON back
5. Import updated JSON: Admin Settings → IntroVox → Import
6. Test the changes
7. Export again for backup/version control

**Workflow for Translators:**
1. Export English steps
2. Duplicate file, rename to target language code (e.g., `steps-es.json`)
3. Send to translator
4. Translator edits text fields in JSON
5. Import into target language
6. Enable language in admin settings

**Workflow for Multi-Instance Deployment:**
1. Configure wizard on development instance
2. Export all languages
3. Import on production instance
4. Consistent experience across all instances

**Version Control:**
- Commit exported JSON files to git repository
- Track changes over time
- Roll back if needed
- Share configurations in GitHub

### Can users disable the wizard themselves?

**Answer:** Yes! Since version 1.1.0, users have full control.

**User Options:**
1. **"Skip and don't show again" button** - On first wizard step, permanently opts out
2. **Personal Settings** - Users can check "Permanently disable the introduction tour"
3. **Completing the wizard** - Clicking "Done" on last step also disables auto-start

**Admin Override:**
Use "Show wizard to all users" button to force-show wizard to everyone, including users who disabled it.

**Use Cases for Override:**
- Major Nextcloud update with new features
- Important announcement
- Significantly updated wizard content
- Reset after troubleshooting

### How do I add a new language via Transifex?

**Answer:** IntroVox dynamically detects language files - no code changes needed!

**Steps:**
1. Visit [IntroVox on Transifex](https://www.transifex.com/nextcloud/nextcloud/)
2. Select your language or request a new one
3. Translate all 141 strings
4. Download completed .json file
5. Place in `l10n/` folder of IntroVox
6. Language automatically appears in admin interface!

**Admin Enables Language:**
1. New language shows in "Available languages" checkboxes
2. Check the box to enable it
3. Select language from dropdown to customize wizard steps
4. Or use default steps (automatically translated)

**No restart required** - Language is immediately available.

### What's the difference between closing (✕) and completing the wizard?

**Answer:** Important distinction in user behavior:

**Closing with ✕ Button:**
- Marks wizard as "seen" in browser (localStorage)
- Does NOT set permanent disable preference
- Wizard may show again (e.g., after version update or admin force-show)
- Good for "I'll do this later"

**Completing with "Done" Button:**
- Marks wizard as completed in browser (localStorage)
- Sets permanent disable preference in database
- Wizard won't auto-start again (unless admin forces it)
- Can still manually restart from personal settings

**"Skip and don't show again" Button:**
- Immediately sets permanent disable preference
- Same effect as completing normally
- Good for "I don't want this"

### What's new in version 1.2.0?

**Answer:** Version 1.2.0 adds group-based step visibility:

**Group-Based Step Visibility**
- Control which user groups can see specific wizard steps
- New "Visible to groups" multi-select dropdown in step editor
- Empty selection means visible to all users (default)
- Steps filtered on backend for security
- Perfect for role-based onboarding (e.g., different steps for admins vs regular users)
- Automatic migration for existing steps

**Technical Details:**
- New `/admin/groups` API endpoint
- Server-side filtering in ApiController
- Export/import includes group visibility settings
- NcSelect component for group selection

---

### What's new in version 1.1.0?

**Answer:** Version 1.1.0 was a major release with three main feature areas:

**1. User Control**
- Users can permanently disable the wizard
- "Skip and don't show again" button on first step
- Personal settings checkbox for permanent disable
- Smart completion behavior (✕ vs Done button)
- Admin "Show wizard to all users" override

**2. Dynamic Language System**
- Automatic detection of translation files
- No code changes needed to add languages
- Transifex-ready for community contributions
- Per-language wizard configuration
- Language availability management

**3. Import/Export**
- Export wizard steps to JSON
- Import configurations from JSON
- Collaborate with content creators offline
- Share configurations between instances
- Version control friendly
- Backup before making changes

**Additional Improvements:**
- Nextcloud design system integration
- Dark mode improvements
- Mobile responsive enhancements
- Code cleanup (removed debug logging)
- Button alignment improvements
- Search button selector fixes
- Confirmation dialog fixes

---

## Best Practices

### 1. Start with Default Steps
- Begin with the default steps and customize them to your needs
- This gives you a good starting point

### 2. Keep Steps Short and Concise
- Users have short attention spans
- Maximum 3-5 lines of text per step
- Use bullet points for lists

### 3. Test on Different Browsers
- Test the wizard in Chrome, Firefox, Safari, and Edge
- CSS selectors may differ per browser

### 4. Use Clear Titles
- Make titles descriptive and recognizable
- Examples: "Upload Files", "Manage Calendar"

### 5. Only Enable Needed Languages
- This improves performance
- Less confusion for users

### 6. Use Multiple CSS Selectors for Reliability (v1.0.6+)
- Use comma-separated selectors as fallbacks
- Example: `[data-id="files"], a[href*="/apps/files"]`
- This prevents steps from being skipped if one selector doesn't match
- Check default steps for examples of good fallback patterns

### 7. Save After Reordering Steps (v1.0.6+)
- Always click the **💾 Save changes** button (at top of steps list) after reordering steps
- This ensures the new order is persisted correctly
- The improved reactivity in v1.0.6 ensures enable/disable works correctly after reordering

### 8. Back Up Custom Configurations (v1.1.0+)
- **Use Export feature** to download wizard steps as JSON
- Commit JSON files to version control (git)
- Export before making major changes
- Keep backups of working configurations

### 9. Communicate with Users
- Inform users about wizard availability
- Refer to the guide in your onboarding documentation

---

## Support

### Reporting Issues
If you experience problems with IntroVox:
1. Check Nextcloud log files in **Settings** → **Logging**
2. Open an issue on GitHub: [nextcloud-introvox/issues](https://github.com/yourusername/nextcloud-introvox/issues)
3. Always mention your Nextcloud version and IntroVox version

### Contributing
IntroVox is open source! Contributions are welcome:
- GitHub: [nextcloud-introvox](https://github.com/yourusername/nextcloud-introvox)
- Report bugs, suggestions, or pull requests

### Translations
Help us translate IntroVox to more languages via Transifex:
- [IntroVox on Transifex](https://www.transifex.com/nextcloud/nextcloud/introvox/)

---

## Version Information

**Current Version:** 1.2.0
**Release Date:** January 22, 2026
**Last Guide Update:** January 22, 2026
**Nextcloud Compatibility:** 32

**Major Changes in 1.2.0:**
- Group-based step visibility
- Role-based onboarding support
- New groups API endpoint

**Major Changes in 1.1.0:**
- User control: Permanently disable wizard
- Import/Export functionality
- Dynamic language detection
- Transifex-ready translations
- Design system improvements

---

**Good luck configuring IntroVox! 🎉**

*For user documentation, see [User Manual](USER_MANUAL.md)*
