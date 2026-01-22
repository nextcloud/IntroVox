# IntroVox - Administrator Manual

**Version 1.2.0** | Interactive Onboarding Tour for Nextcloud

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Admin Interface Overview](#admin-interface-overview)
4. [Global Settings](#global-settings)
5. [Language Management](#language-management)
6. [Managing Wizard Steps](#managing-wizard-steps)
7. [Step Configuration](#step-configuration)
8. [Import & Export](#import--export)
9. [Theme Support](#theme-support)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

---

## Introduction

IntroVox is a customizable onboarding wizard for Nextcloud that helps new users discover key features through an interactive guided tour. As an administrator, you have full control over:

- **Global wizard availability** - Enable or disable the wizard for all users
- **Language support** - Choose which languages are available for the wizard
- **Per-language customization** - Configure different wizard steps for each language
- **Step management** - Enable, disable, reorder, edit, or remove individual steps
- **Group-based visibility** - Show specific steps only to certain user groups (NEW in v1.2.0)
- **User preferences** - Let users permanently disable the wizard if desired

---

## Installation

### From Nextcloud App Store

1. Log in to your Nextcloud instance as an administrator
2. Navigate to **Apps** in the top-right menu
3. Search for **"IntroVox"**
4. Click **Enable** to install the app

### Manual Installation

1. Download the latest release from the [Nextcloud App Store](https://apps.nextcloud.com/apps/introvox)
2. Extract the archive to your Nextcloud `apps/` directory
3. Navigate to **Apps** in Nextcloud and enable **IntroVox**

### Initial Configuration

After installation:
1. Navigate to **Administration Settings → IntroVox**
2. Enable the wizard for all users (default: disabled)
3. Select which languages should be available
4. Customize wizard steps for each language (optional)

---

## Admin Interface Overview

Access the admin interface via: **Administration Settings → IntroVox**

The interface consists of three main sections:

### 1. Global Settings
- **Enable wizard for all users** - Master toggle to enable/disable the wizard globally
- **Available languages** - Checkboxes to enable/disable specific languages
- **Show wizard to all users** - Button to reset and show wizard to all users again

### 2. Language Selector
- Dropdown menu with flag emojis
- Only shows enabled languages
- Allows switching between language configurations

### 3. Step Management
- **Add step** - Create new wizard steps
- **Export** - Download current steps as JSON
- **Import** - Upload steps from JSON file
- **Reset** - Restore default steps for selected language
- **Save changes** - Save all modifications

---

## Global Settings

### Enable Wizard for All Users

Toggle this setting to control global wizard availability:

- **Enabled** (✓): Wizard will automatically show to new users on first login
- **Disabled** (✗): Wizard will not show to any users

**Note:** Users who have permanently disabled the wizard in their personal settings will not see it, even when globally enabled.

### Show Wizard to All Users

This powerful button allows you to reset the wizard for **ALL users**, including:
- Users who have already completed the wizard
- Users who have permanently disabled the wizard in their personal settings

**Use cases:**
- Major wizard updates or improvements
- New Nextcloud features you want all users to learn about
- After fixing wizard configuration issues

**Warning:** This will override all user preferences and show the wizard to everyone on their next login.

---

## Language Management

### Available Languages

IntroVox supports 6 languages out of the box:
- 🇬🇧 English (en)
- 🇳🇱 Dutch (nl)
- 🇩🇪 German (de)
- 🇩🇰 Danish (da)
- 🇫🇷 French (fr)
- 🇸🇪 Swedish (sv)

### Enabling/Disabling Languages

1. Navigate to **Administration Settings → IntroVox**
2. In the **Available languages** section, check/uncheck languages
3. Click **Save** (happens automatically on toggle)

**Requirements:**
- At least one language must be enabled
- The last enabled language cannot be disabled

### How Language Selection Works

When a user logs in, IntroVox:
1. Detects the user's Nextcloud language setting
2. Checks if that language is enabled in IntroVox
3. If enabled: Shows wizard steps in user's language
4. If disabled: Shows a message that the tour is not available in their language

**Example:** If you only enable English and Dutch, users with German language settings will see: *"The introduction tour is not available in your language. Contact your administrator if you would like to have the tour available in your language."*

---

## Managing Wizard Steps

### Viewing Steps

1. Select a language from the dropdown menu
2. All steps for that language will be displayed
3. Each step shows:
   - **Drag handle** (⋮⋮) - For reordering
   - **Step number** - Sequential numbering
   - **Title** - Step heading
   - **Step ID** - Unique identifier
   - **Enable/Disable toggle** (✓/✗)
   - **Visible to** - Which groups can see this step (or "All users")
   - **Edit button** (✏️)
   - **Delete button** (🗑️)

### Reordering Steps

**Drag and drop** steps to change their order:

1. Click and hold the drag handle (⋮⋮) on the left side of a step
2. Drag the step to its new position
3. Release to drop
4. Click **Save changes** to persist the new order

**Note:** The order you set here is the exact order users will see the steps.

### Enabling/Disabling Steps

Each step has an enable/disable toggle:

- **✓ Enabled** - Step will be shown to users
- **✗ Disabled** - Step will be hidden (grayed out with strikethrough)

Disabled steps remain in your configuration but are not shown to users. This is useful for:
- Temporarily hiding steps without deleting them
- Testing different tour configurations
- Seasonal or conditional content

### Adding New Steps

1. Click **➕ Add step**
2. A new step editor will appear
3. Fill in the required fields:
   - **Title** - The heading shown to users
   - **Text (HTML)** - The step content (supports HTML)
   - **Attach to element** (optional) - CSS selector for element highlighting
   - **Position** (if attached) - Where to show the step relative to the element
4. Click **✓ Save**
5. Click **💾 Save changes** to persist

### Editing Steps

1. Click **✏️ Edit** on any step
2. Modify the fields as needed
3. Click **✓ Save** to confirm changes
4. Click **💾 Save changes** to persist

### Deleting Steps

1. Click **🗑️ Delete** on any step
2. Confirm the deletion in the dialog
3. Click **💾 Save changes** to persist

**Warning:** Deletion is permanent after saving. Consider disabling steps instead of deleting them.

---

## Step Configuration

### Step Fields

#### ID (not editable)
- Unique identifier for the step
- Automatically generated for new steps
- Format: `new_1731600000000` (timestamp-based)
- Used internally for tracking and sorting

#### Title
- **Required field**
- Text shown in the step header
- Supports emoji: `👋 Welcome to Nextcloud` (see [Emojipedia](https://emojipedia.org/) for available emojis)
- Keep concise (1-5 words recommended)

#### Text (HTML)
- **Required field**
- Main content of the step
- Supports full HTML including:
  - Paragraphs: `<p>Your text here</p>`
  - Bold: `<strong>Important text</strong>`
  - Lists: `<ul><li>Item 1</li><li>Item 2</li></ul>`
  - Links: `<a href="https://docs.nextcloud.com">Documentation</a>`

**Example:**
```html
<p><strong>Nextcloud is your personal cloud storage!</strong></p>
<p>Here you can:</p>
<ul>
  <li>📁 Upload, share and collaborate on files</li>
  <li>📅 Manage your calendar</li>
  <li>✉️ Send and receive emails</li>
  <li>👥 Manage contacts</li>
</ul>
```

#### Attach to Element (CSS Selector)
- **Optional field**
- CSS selector to highlight a specific UI element
- Leave empty for centered modal steps

**Common selectors:**
```css
#header                    → Main header bar
.app-menu                  → App navigation menu
[data-id="files"]          → Files app button
#unified-search            → Search bar
.user-menu                 → User menu (top-right)
```

**Tips:**
- Use browser DevTools (F12) to inspect elements
- Test selectors in browser console: `document.querySelector('#header')`
- More specific selectors are more reliable
- If element doesn't exist, step will be skipped

#### Position
- **Required if Attach to Element is set**
- Options: `Right`, `Left`, `Top`, `Bottom`
- Determines where the step appears relative to the highlighted element

**Positioning guide:**
- **Right**: Best for left sidebar elements (Files, Calendar)
- **Left**: Best for right sidebar elements (User menu)
- **Top**: Best for bottom navigation
- **Bottom**: Best for top navigation (header, search)

#### Visible to Groups (NEW in v1.2.0)
- **Optional field**
- Multi-select dropdown showing all Nextcloud groups
- Leave empty for step to be visible to **all users**
- Select one or more groups to restrict visibility

**Use cases:**
- **Administrators group**: Show admin-specific steps only to admins
- **Training groups**: Different onboarding for different departments
- **Pilot groups**: Test new steps with a subset of users first

**Important:** Group filtering happens on the server side. Users cannot see hidden steps even via browser developer tools.

---

## Import & Export

### Exporting Steps

**Use case:** Backup, transfer to another instance, or share with other admins

1. Select the language you want to export
2. Click **📥 Export**
3. A JSON file will be downloaded: `introvox-steps-en.json`

**What's included:**
- All steps for the selected language
- Step configuration (title, text, position, enabled status)
- Group visibility settings (visibleToGroups)
- Language code

### Importing Steps

**Use case:** Restore backup, transfer from another instance, apply shared configuration

1. Click **📤 Import**
2. Select a JSON file from your computer
3. If successful, you'll see: *"Successfully imported X steps for language Y"*
4. Steps will be automatically loaded

**Important notes:**
- Import will **replace all existing steps** for that language
- The language in the JSON file determines which language is updated
- If importing a different language than currently selected, it will auto-switch
- Unsaved changes will be lost (warning shown)

**JSON file format:**
```json
{
  "language": "en",
  "steps": [
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
      "id": "admin-panel",
      "title": "⚙️ Admin Settings",
      "text": "<p>Configure your Nextcloud here.</p>",
      "attachTo": "[data-id=\"settings\"]",
      "position": "right",
      "enabled": true,
      "visibleToGroups": ["admin", "Administrators"]
    }
  ]
}
```

**Note:** The `visibleToGroups` field is an array of group IDs. Empty array `[]` means visible to all users.

### Resetting to Defaults

**Use case:** Undo all customizations and restore factory defaults

1. Select a language from the dropdown
2. Click **🔄 Reset**
3. Confirm: *"Are you sure you want to reset to default steps for the selected language?"*
4. Default steps for that language will be restored

**Warning:** This will **permanently delete all custom steps** for the selected language. Export first if you want to keep a backup!

---

## Theme Support

IntroVox automatically adapts to all Nextcloud themes:

### Supported Themes
- ✅ **Light mode** (default)
- ✅ **Dark mode** (via system preference or Nextcloud setting)
- ✅ **High contrast mode** (accessibility)
- ✅ **Custom themes** (via Nextcloud theming app)

### How It Works

The wizard uses Nextcloud's CSS variables:
- `--color-main-background` - Background colors
- `--color-main-text` - Text colors
- `--color-primary-element` - Accent colors (buttons, borders)
- `--color-border` - Border colors
- `--color-background-hover` - Hover states

**No configuration needed** - the wizard automatically inherits all theme settings!

### Accessibility Features

- **Reduced motion support** - Animations disabled for users with motion sensitivity
- **High contrast mode** - Enhanced borders and colors for better visibility
- **Keyboard navigation** - Full keyboard support with visible focus indicators
- **Screen reader friendly** - Proper ARIA labels and semantic HTML

---

## Best Practices

### Step Design

1. **Keep it short** - 5-8 steps is ideal for most tours
2. **Focus on essentials** - Cover the most important features first
3. **Use clear language** - Avoid jargon, write for beginners
4. **Add visual elements** - Use emoji and HTML formatting
5. **Test thoroughly** - Verify steps work in all enabled languages

### Language Strategy

1. **Start with one language** - Perfect English version first
2. **Add languages gradually** - Enable new languages as translations are ready
3. **Maintain consistency** - Keep step structure similar across languages
4. **Use native speakers** - Get translations reviewed by native speakers
5. **Test each language** - Verify translations display correctly

### Content Guidelines

**DO:**
- ✅ Use welcoming, friendly tone
- ✅ Include practical examples
- ✅ Highlight time-saving features
- ✅ Keep paragraphs short (2-3 sentences)
- ✅ Use lists for multiple items

**DON'T:**
- ❌ Overwhelm with too much information
- ❌ Use complex technical terms
- ❌ Reference features that might not be installed
- ❌ Create steps longer than 150 words
- ❌ Use absolute positioning (element might not exist)

### Maintenance

1. **Review quarterly** - Check if steps are still accurate
2. **Update after Nextcloud upgrades** - Verify selectors still work
3. **Monitor user feedback** - Ask users if tour was helpful
4. **Test new features** - Create steps for major new Nextcloud features
5. **Keep backups** - Export configurations before major changes

---

## Troubleshooting

### Wizard Not Showing

**Problem:** Users don't see the wizard on first login

**Possible causes & solutions:**

1. **Wizard globally disabled**
   - Solution: Enable in Admin Settings → IntroVox

2. **User's language not enabled**
   - Solution: Enable language in "Available languages" section

3. **User previously disabled wizard**
   - Solution: Use "Show wizard to all users" button to reset

4. **JavaScript errors**
   - Solution: Check browser console (F12) for errors
   - Verify app version is compatible with Nextcloud version

### Steps Being Skipped

**Problem:** Some steps don't show during the tour

**Possible causes & solutions:**

1. **Step is disabled**
   - Solution: Check enable/disable toggle is ON (✓)

2. **Element doesn't exist**
   - Console will show: *"Wizard: Skipping step 'X' - element not found"*
   - Solution: Update CSS selector or remove attachment

3. **App not installed**
   - Example: Calendar step when Calendar app is disabled
   - Solution: Only attach to elements that always exist, or disable step

4. **Selector changed after Nextcloud update**
   - Solution: Inspect new selector with DevTools and update step

### Translations Not Working

**Problem:** Text shows in wrong language or shows translation keys

**Possible causes & solutions:**

1. **Browser cache**
   - Solution: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

2. **Language not selected in Nextcloud**
   - Solution: Check user's language in Personal Settings

3. **Translation file missing**
   - Solution: Verify language files exist in `l10n/` directory

4. **App not rebuilt after changes**
   - Solution: Run `npm run build` if developing locally

### Import/Export Issues

**Problem:** Import fails or exports are empty

**Possible causes & solutions:**

1. **Invalid JSON format**
   - Solution: Validate JSON at jsonlint.com
   - Verify file contains `language` and `steps` fields

2. **Wrong language code**
   - Solution: Check language code matches enabled languages
   - Use 2-letter codes: `en`, `nl`, `de`, etc.

3. **File permissions**
   - Solution: Check server has write permissions to config directory

---

## FAQ

### General Questions

**Q: Can users disable the wizard permanently?**
A: Yes, users can check "Permanently disable the introduction tour" in their Personal Settings → IntroVox. However, administrators can override this using the "Show wizard to all users" button.

**Q: Does the wizard work on mobile devices?**
A: Yes, IntroVox is fully responsive and works on tablets and smartphones. The layout automatically adapts to smaller screens.

**Q: Can I have different steps for different user groups?**
A: Yes! Since version 1.2.0, you can configure which user groups can see each step. Use the "Visible to groups" dropdown in the step editor to select specific groups. Steps with no groups selected are visible to everyone.

**Q: How do I know which Nextcloud version is supported?**
A: IntroVox requires Nextcloud 32 or higher. Check the `appinfo/info.xml` file for exact version requirements.

### Configuration Questions

**Q: Can I create steps that only show conditionally?**
A: Not directly, but you can use the enable/disable toggle to show/hide steps. Steps with non-existent elements are automatically skipped.

**Q: What happens if a CSS selector matches multiple elements?**
A: The wizard will highlight the first matching element. Use specific selectors (IDs or data attributes) for best results.

**Q: Can I use custom CSS in step text?**
A: No, inline styles are not recommended. The wizard uses Nextcloud's theme variables automatically. You can use HTML tags like `<strong>`, `<em>`, etc.

**Q: How do I test steps without showing to all users?**
A: Test in your own account by:
1. Clearing localStorage: `localStorage.removeItem('introvox_completed')`
2. Refreshing the page
3. Or use: `window.introVox.start()` in browser console

### Language Questions

**Q: Can I add custom languages not in the default list?**
A: Yes, but it requires development work:
1. Create translation file in `l10n/` (e.g., `pt_BR.json`)
2. Add language to `AdminController::getAvailableLanguages()`
3. Create default steps in `AdminController::getDefaultStepsForLanguage()`

**Q: What if user's language is not enabled?**
A: They will see a message: *"The introduction tour is not available in your language."* with instructions to contact their administrator.

**Q: Can I mix languages in step text?**
A: Not recommended. Each language should have its own complete translation. Use the language selector to configure each language separately.

### Technical Questions

**Q: Where are wizard configurations stored?**
A: In Nextcloud's app configuration:
- Global settings: `appconfig` table
- User preferences: `preferences` table
- Steps: `appconfig` table (per language: `wizard_steps_en`, etc.)

**Q: Can I edit steps directly in the database?**
A: Technically yes, but **not recommended**. Use the admin interface or import/export feature to avoid data corruption.

**Q: How do I debug wizard issues?**
A: Enable browser console (F12) and look for:
- `🎨 Nextcloud First Use Wizard (Vue 3) initialized` - App loaded
- `✅ Wizard initialized with X active steps` - Steps loaded
- `⚠️ Wizard: Skipping step 'X' - element not found` - Element issues

**Q: Does IntroVox work with reverse proxies?**
A: Yes, IntroVox works with any Nextcloud setup including reverse proxies. Ensure JavaScript and CSS files are served correctly.

### Best Practices Questions

**Q: How many steps should I create?**
A: 5-8 steps is ideal. More than 10 steps may overwhelm users.

**Q: Should I attach every step to an element?**
A: No. Use a mix:
- **Centered steps**: For welcome, introduction, and conclusion
- **Attached steps**: For specific UI elements you want to highlight

**Q: How often should I update wizard content?**
A: Review and update:
- After major Nextcloud upgrades
- When adding new essential apps
- Based on user feedback (quarterly recommended)

**Q: Can I A/B test different wizard configurations?**
A: Not built-in, but you could:
1. Export different configurations
2. Manually swap them for different periods
3. Collect user feedback to determine the best version

---

## Support & Resources

### Documentation
- **User Manual**: `docs/USER_MANUAL.md`
- **CHANGELOG**: `CHANGELOG.md`
- **README**: `README.md`

### Community
- **GitHub Issues**: [Report bugs or request features](https://github.com/nextcloud/introvox/issues)
- **Nextcloud Forum**: [Get help from the community](https://help.nextcloud.com)

### Development
- **Source Code**: [GitHub Repository](https://github.com/nextcloud/introvox)
- **App Store**: [IntroVox on Nextcloud Apps](https://apps.nextcloud.com/apps/introvox)

---

## Credits

**Developed by:** Rik Dekker (rik@shalution.nl)
**Initial idea and feedback:** SURF
**License:** GNU AGPL v3
**Version:** 1.2.0

---

*Last updated: January 22, 2026*
