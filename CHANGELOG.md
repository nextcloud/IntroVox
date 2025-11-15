# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.9] - 2025-11-15

### Added
- **Complete translation coverage** - All admin interface text now fully translatable
  - Added "Skip and don't show again" button translation for all 6 languages
  - Added HTML content placeholder translation for textarea in admin step editor
  - English: "Skip and don't show again" / "<p>HTML content...</p>"
  - Dutch: "Overslaan en niet meer tonen" / "<p>HTML inhoud...</p>"
  - German: "Überspringen und nicht mehr anzeigen" / "<p>HTML-Inhalt...</p>"
  - Danish: "Spring over og vis ikke igen" / "<p>HTML-indhold...</p>"
  - French: "Passer et ne plus afficher" / "<p>Contenu HTML...</p>"
  - Swedish: "Hoppa över och visa inte igen" / "<p>HTML-innehåll...</p>"

### Fixed
- **Hardcoded placeholder** - Replaced hardcoded HTML placeholder in admin textarea with translatable version

## [1.0.8] - 2025-11-14

### Fixed
- **Admin interface translations** - Fixed broken translation system in admin interface
  - Removed incorrect wrapper function that was causing all text to display as "introvox"
  - All admin UI text now correctly uses `translate('introvox', 'string', vars)` pattern
  - Translations now work properly in all supported languages (en, nl, de, da, fr, sv)

### Improved
- **Theme support** - Enhanced wizard styling with comprehensive Nextcloud theme integration
  - All colors now use Nextcloud CSS variables (`--color-main-background`, `--color-main-text`, etc.)
  - Full dark mode support via `@media (prefers-color-scheme: dark)` and Nextcloud theme selectors
  - High contrast mode support via `@media (prefers-contrast: high)`
  - Automatic adaptation to custom Nextcloud themes
  - Improved shadow and overlay darkness in dark mode
  - Better visual feedback for highlighted elements in all themes
- **Accessibility** - Added reduced motion support
  - Animations disabled when `prefers-reduced-motion: reduce` is set
  - Hover transforms disabled for reduced motion preference
  - Ensures WCAG compliance for users with motion sensitivities
- **Responsive design** - Enhanced mobile and responsive behavior
  - Proper responsive adjustments for all screen sizes
  - Better button layouts on small screens
  - Improved text wrapping and sizing

### Technical
- **CSS architecture** - wizard.css now imported directly in main.js
  - Ensures consistent styling across all wizard instances
  - Better webpack bundling and optimization
  - Reduced CSS conflicts with Nextcloud core styles
- **Translation pattern** - Standardized all Vue components to use consistent translation helper
  - AdminApp.vue now uses `trans()` helper function correctly
  - All toast messages and dialogs properly translated
  - Fixed parameter passing for variable substitution in translations

## [1.0.6] - 2025-11-04

### Changed
- **App icon** - Updated to compass design with black color for better visibility in light theme
- Sidebar settings icons now use dark variant for proper contrast

### Added
- **Documentation link** - Added link to Administrator Guide in app info.xml for easy access from App Store

### Fixed
- **Multi-language wizard support** - Wizard now starts for users with any enabled language (not just English)
- **Admin language selection** - Admin panel now automatically selects first available language if English is disabled
- **Step visibility bug** - Fixed issue where enabled steps were incorrectly hidden after reordering
  - Changed from index-based to ID-based checkbox binding using `v-model`
  - Improved Sortable.js reactivity by creating new array instead of direct mutation
- **CSS selector improvements** - Updated default step selectors to match multiple UI element variations
  - Search step: Added fallback selectors for unified search button
  - Files/Calendar: Added data-id attribute selectors for better element detection
  - Prevents steps from being skipped due to element not found errors

### Improved
- **Language detection** - Backend now checks if user's language is enabled in admin settings
- **Debug logging** - Added console logging for step filtering to help troubleshoot visibility issues
- **Admin panel initialization** - Global settings now load before steps to ensure correct language selection

## [1.0.5] - 2025-11-04

### Changed
- **Language detection** - Wizard now only auto-starts for users with English language settings
- Users with other languages can manually start the wizard from Personal Settings → IntroVox
- **Default disabled** - Wizard is now disabled by default on installation
- Administrators must explicitly enable the wizard in Admin Settings → IntroVox

### Fixed
- **Multi-language support** - Prevents showing English wizard steps to non-English users on first login
- Better onboarding experience for international deployments

## [1.0.4] - 2025-11-04

### Changed
- **App Store screenshot** - Changed primary screenshot to welcome-step.png to better showcase the wizard experience
- Reordered screenshots: welcome-step.png (primary), admin-interface.png, personal-settings.png

## [1.0.3] - 2025-11-04

### Changed
- **Nextcloud version requirement** - Updated minimum required version to Nextcloud 32 for official Vue 3 support
- App now requires Nextcloud 32 (min-version="32" max-version="32")

### Fixed
- **Admin interface bug** - Fixed issue where enabling/disabling steps after drag-and-drop would affect the wrong step
- Changed checkbox binding from `v-model` to `:checked` with explicit `toggleStepEnabled()` method
- Step enabled/disabled status now correctly tracks by step ID instead of array index

### Added
- **SURF acknowledgment** - Added credits to SURF in README for their role as initial idea provider and feedback contributor

## [1.0.2] - 2025-11-04

### Changed
- **App Store metadata sync** - Force refresh of App Store metadata to display correct author information

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
