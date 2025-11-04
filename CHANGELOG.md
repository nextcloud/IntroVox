# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-11-04

### Changed
- **Author information** - Updated to Rik Dekker (rik@shalution.nl) for proper attribution in Nextcloud App Store

## [1.0.0] - 2025-11-04

### Added
- **Per-language wizard configuration**
  - Administrators can now configure completely independent wizard steps for each language
  - Language selector in admin interface to switch between language configurations
  - Each language has its own set of wizard steps stored separately
  - Reset to default restores language-specific default steps with correct translations
- **Language availability control**
  - Administrators can enable/disable specific languages for the wizard
  - Checkbox grid in admin interface to select available languages
  - Default installation now only enables English (can be expanded as needed)
  - Users with disabled languages see clear messaging in personal settings
  - Language-disabled users cannot start the wizard (similar to global disable)
- **Extended multi-language support**
  - Added German (de), French (fr), Danish (da), and Swedish (sv) translations
  - Total of 6 supported languages: English, Dutch, German, French, Danish, Swedish
  - All UI elements, wizard steps, and admin interface fully translated
- **Comprehensive administrator documentation**
  - Complete English administrator guide with step-by-step instructions
  - Covers all features: global settings, language management, step configuration
  - Includes FAQ section with 12+ common questions and answers
  - Best practices and troubleshooting tips
  - CSS selector examples and HTML usage guide
- **Demo media**
  - Added animated GIF demonstration of wizard experience for better documentation
- **Per-step enable/disable control**
  - Administrators can now enable or disable individual wizard steps
  - Toggle checkbox in admin interface for each step
  - Disabled steps are visually indicated with strikethrough and reduced opacity
  - Only enabled steps are shown to users during the wizard tour
  - Automatic migration for existing installations (all steps enabled by default)

### Improved
- **Multi-language workflow**
  - Unsaved changes warning when switching between languages
  - Language-specific default steps use proper L10N factory for translations
  - Admin interface only shows enabled languages in language selector
  - Clear indication that changes only affect the selected language
- **Personal settings integration**
  - Three distinct states: enabled, globally disabled, or language disabled
  - Clear messaging for each state with guidance for users
  - Help section integration for easy wizard restart access
  - Proper handling when user's language is not enabled
- **Wizard completion step**
  - Updated final step in all 6 languages to reference "personal settings" instead of "help section"
  - Accurate information about where to restart the wizard
- **Admin interface**
  - Global settings section with wizard enable/disable toggle
  - Language availability checkboxes with responsive grid layout
  - Language selector with flag emojis for easy identification
  - Improved checkbox alignment with proper flexbox styling
- **Wizard UI enhancements**
  - Fixed header layout with flexbox for better title spacing
  - Titles now wrap properly without overlapping close button
  - Close button resized to 36x36px (smaller, more compact design)
  - Close button now uses same styling as secondary buttons (white background with border)
  - Used `!important` declarations to ensure consistent styling across themes
  - Disabled word hyphenation for cleaner title display
  - Enhanced dark theme support with explicit color overrides
  - Dark mode improvements: Header background now has subtle light overlay for better contrast
  - Links now follow Nextcloud theme with proper styling and accessibility
- **Admin settings page**
  - Improved margins and padding to match Nextcloud standards
  - Consistent spacing with personal settings page
  - Removed excessive left margin
  - Added enable/disable toggle for each wizard step
  - Visual feedback for disabled steps (strikethrough, reduced opacity)
  - Hover effects on toggle controls
  - Language management UI with clear visual hierarchy
- **Personal settings page**
  - Simplified interface, removed redundant status messages
  - Cleaner restart button with emoji icon
  - Streamlined JavaScript for better performance
  - Now shows disabled state when admin disables wizard globally
  - Shows language-disabled state when user's language is not enabled
  - Clear messaging to contact administrator when tour is disabled

### Fixed
- **Dark theme title visibility** - Added background color to header for better text contrast
- Close button styling inconsistency with other buttons
- Close button size reduced from 44px to 36px for better visual balance
- Shepherd.js CSS overrides now properly handled with `!important` flags
- Admin page margin not matching personal settings page
- Word breaking in wizard step titles
- Wizard steps now properly translate when switching languages
- Fixed broken JSON syntax in Dutch (nl) translation file
- Default wizard steps now use translation keys instead of hardcoded text
- Checkbox alignment issues in admin interface (multiple iterations to get proper flexbox layout)
- Final wizard step now correctly references personal settings location

### Technical
- **Language-specific storage**
  - Wizard steps stored per language: `wizard_steps_en`, `wizard_steps_nl`, etc.
  - `enabled_languages` setting stored as JSON array
  - Default to `['en']` on first installation
- **Backend improvements**
  - `AdminController::getDefaultStepsForLanguage()` method for language-specific defaults
  - Language parameter added to `getSteps()`, `saveSteps()`, `resetToDefault()`
  - `PersonalSettings` checks both global enable and user language enable
  - `ApiController` validates user's language is enabled before returning steps
- **Frontend improvements**
  - Vue 3 reactive language management with `selectedLanguage` and `enabledLanguages`
  - Computed property `availableLanguages` filters dropdown based on enabled languages
  - Unsaved changes detection when switching languages
  - Language-specific step loading and saving
- **Translation synchronization**
  - Python script to regenerate .js files from .json sources
  - Ensures consistency between JSON and JS translation files
  - All 6 languages kept in sync
- Added `enabled` boolean field to wizard step data structure
- Implemented automatic migration for existing steps
- Filter logic in WizardManager to exclude disabled steps
- Updated all 6 language files with new translations for language management

[1.0.0]: https://github.com/nextcloud/IntroVox/releases/tag/v1.0.0
