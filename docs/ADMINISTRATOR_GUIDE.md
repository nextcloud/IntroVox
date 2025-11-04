# IntroVox - Administrator Guide

This guide describes all administrative functions of the IntroVox app for Nextcloud.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Administrator Settings](#accessing-administrator-settings)
3. [Global Settings](#global-settings)
4. [Language Settings](#language-settings)
5. [Managing Wizard Steps](#managing-wizard-steps)
6. [End User Experience](#end-user-experience)
7. [Frequently Asked Questions](#frequently-asked-questions)

---

## Overview

IntroVox is an interactive onboarding wizard that helps new Nextcloud users get started quickly. The app provides a step-by-step tour through Nextcloud's key features.

### Key Features:
- ✅ Fully customizable wizard steps
- 🌍 Multi-language support (English, Dutch, German, French, Danish, Swedish)
- 🎯 Target specific page elements for highlighting
- 📝 HTML support for rich text formatting
- 🔄 Drag-and-drop to reorder steps
- ⚙️ Configure steps per language
- 👥 Selectively enable/disable languages

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

**CSS Selector Examples:**
```css
/* Link to Files app */
a[href*="/apps/files/"]

/* Search bar */
.unified-search

/* User menu */
#user-menu

/* Specific button */
button.primary

/* Centered step (leave empty) */

```

3. Click **💾 Save** to save the step
4. Click **❌ Cancel** to stop without saving

**Note:** Don't forget to click the green "💾 Save" button at the bottom of the page to save all changes permanently!

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

**Tip:** You don't need to save after reordering - this is saved automatically.

---

### ✅ Enable/Disable Step

**Function:** Temporarily enable or disable individual steps without deleting them.

**Usage:**
1. Click the **✅** (enabled) or **❌** (disabled) toggle next to the step
2. The status changes immediately
3. Disabled steps are skipped in the wizard

**Benefit:** You can temporarily disable steps (e.g., seasonal steps) without deleting them.

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

**Button:** "💾 Save" (green, at bottom of page)

**Function:** Save all changes to wizard steps permanently.

**Usage:**
1. Make your desired changes to the steps
2. Click the green "💾 Save" button at the bottom of the page
3. You'll see a success message: "Steps saved successfully!"
4. The changes are now active for users

**Note:**
- The button is only active (not gray) when there are changes
- If you switch between languages without saving, your changes are discarded
- You'll get a warning if you try to switch with unsaved changes

---

## End User Experience

### Automatic Start

If the wizard is enabled and the user's language is enabled:
- New users see the wizard automatically on first login
- The wizard starts on the dashboard page
- Users can close the wizard anytime with "✕" or "Skip"

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

**Answer:** Not directly per user, but in two ways:

**Option 1: Per Language**
- Disable that user's language in "Available languages"
- All users with that language can no longer see the wizard

**Option 2: Disable Globally**
- Uncheck "Wizard enabled for all users"
- **Nobody** sees the wizard anymore

**Future Functionality:** Per-user or per-group settings may be added in a future version.

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
- If the element is not found, the wizard shows the step as a **centered step**
- The wizard does **not** crash
- This can happen if:
  - The CSS selector is incorrect
  - The Nextcloud app is not installed
  - The user doesn't have rights to see the element

**Tip:** Always test your CSS selectors on different Nextcloud installations and user roles.

### How do I temporarily disable the wizard for maintenance?

**Answer:**
1. Go to **Settings** → **Administration** → **IntroVox**
2. Uncheck "Wizard enabled for all users"
3. The wizard is now disabled for everyone
4. After maintenance: check the checkbox again

**Benefit:** All your configurations are preserved, you're only temporarily disabling the wizard.

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

### 6. Back Up Custom Configurations
- If you make many customizations, note your CSS selectors
- Export option may come in a future version

### 7. Communicate with Users
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

**Current Version:** 1.0.0
**Last Guide Update:** November 2025
**Nextcloud Compatibility:** 30+

---

**Good luck configuring IntroVox! 🎉**
