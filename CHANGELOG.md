# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-22

### Added
- **Group-based step visibility** - Control which user groups can see specific wizard steps
  - New "Visible to groups" multi-select dropdown in step editor
  - Select one or more Nextcloud groups per step
  - Empty selection (default) means visible to all users
  - Steps are filtered on the backend before being sent to users
  - Users only see steps they have access to based on their group membership
  - Perfect for role-based onboarding (e.g., different steps for admins vs regular users)
- **Groups API endpoint** - New `/admin/groups` endpoint to fetch available Nextcloud groups
- **Automatic migration** - Existing steps automatically get `visibleToGroups: []` (visible to all)
- **Admin statistics dashboard** - New "Statistics" tab in admin interface
  - Wizard usage metrics: users started, users completed, times skipped, completion rate
  - Instance information: total users, active users (30d), total steps, enabled languages
  - Real-time statistics loaded from server
- **Anonymous telemetry system** - Optional anonymous usage statistics
  - Opt-in telemetry sharing with developers (disabled by default)
  - Sends anonymous data to `licenses.voxcloud.nl/api/telemetry/introvox`
  - Instance identified by SHA-256 hash (never sends actual URL)
  - Collects: user counts, step counts, wizard usage, NC/PHP versions
  - Does NOT collect: server URL, usernames, personal data, step content
  - Manual "Send now" button for immediate sending
  - Background job runs every 24 hours (with random jitter) when enabled
- **Wizard tracking** - Track wizard start, completion, and skip events per user
  - New user preferences: `wizard_started`, `wizard_completed` timestamps
  - Aggregated statistics visible in admin dashboard
  - Privacy-friendly: only totals shown, no individual user tracking visible

### Changed
- **Admin interface restructured with tabs** - Improved organization
  - Tab 1: "Settings" - Global settings (wizard enabled, languages, show to all)
  - Tab 2: "Steps" - Step editor (language selector, drag-drop steps, group visibility)
  - Tab 3: "Statistics" - Usage metrics and telemetry settings
- **Improved admin UI navigation** - Clean tab-based interface with visual tab indicators

### Technical
- Added `IGroupManager` and `IUserSession` dependencies to ApiController and AdminController
- Group filtering happens server-side in `ApiController::getWizardSteps()` for security
- Steps without `visibleToGroups` or with empty array are visible to everyone
- NcSelect component used for group selection with multi-select support
- Export/import functionality automatically includes group visibility settings
- New `TelemetryService` class for collecting and sending anonymous statistics
- New `TelemetryJob` background job (extends `TimedJob`) for scheduled telemetry
- New API endpoints:
  - `GET /admin/statistics` - Fetch statistics for admin dashboard
  - `POST /admin/telemetry` - Enable/disable telemetry
  - `POST /admin/telemetry/send` - Manual telemetry send
  - `POST /api/wizard/start` - Track wizard start event
  - `POST /api/wizard/complete` - Track wizard completion event
  - `POST /api/wizard/skip` - Track wizard skip event
- Background job registered in `info.xml` for automatic execution
- 35+ new translation keys added to all 6 language files (EN, NL, DE, DA, FR, SV)

## [1.1.3] - 2025-12-04

### Fixed
- **Auto-scroll to new steps** - When adding a new step in admin interface, the page now automatically scrolls to show the newly created step
- **Backdrop filter blur removed** - Fixed text readability issues on small UI elements (buttons) by removing the backdrop blur effect from the wizard overlay (PR #10)

### Documentation
- **Emoji reference link** - Added link to Emojipedia in admin manual for users wanting to use emojis in step titles

## [1.1.2] - 2025-11-16

### Fixed
- **App Store signature verification** - Re-release to resolve signature verification issues
  - Identical functionality to v1.1.1
  - Fresh release tarball with correct cryptographic signature
  - Resolves "invalid signature" errors during installation from App Store

## [1.1.1] - 2025-11-15

### Improved
- **Enhanced wizard visual design** - Improved readability and visual hierarchy
  - Header now more prominent with increased padding (16px 20px) and min-height (56px)
  - Added 2px border-bottom in primary-element color for visual accent
  - Enhanced box-shadow for better depth (stronger in dark mode)
  - Title styling improved: 22px font-size, primary-element color, font-weight 600, letter-spacing -0.01em
  - Increased content padding (20px) for better breathing room
  - Simplified body text styling - uniform 15px font-size and 1.7 line-height
  - Removed special first-paragraph styling for consistency
  - Allows admins to use inline HTML/CSS for custom formatting per step
  - All improvements work seamlessly across light, dark, and high contrast themes

## [1.1.0] - 2025-11-15

### Major Features

#### 🎯 User Control: Permanently Disable Wizard
Users can now take full control of their wizard experience:
- **Personal settings option** to permanently disable the wizard
  - Located in Personal Settings → IntroVox
  - "Permanently disable the introduction tour" checkbox
  - Once disabled, wizard will never auto-start again (even after app updates)
  - Clear warning about the permanent nature of this setting
- **"Skip and don't show again" button** on first wizard step
  - Allows users to immediately opt-out during their first encounter
  - Automatically disables wizard for that user permanently
  - Translated in all 6 supported languages
- **Administrator override capability**
  - Admins can reset disabled preferences via "Show wizard to all users" button
  - Forces wizard to appear for all users on next login (clears all user preferences)
  - Useful for major updates or important announcements
- **Smart completion behavior**
  - Completing wizard via "Done" button automatically disables future auto-starts
  - Closing wizard via X button only marks as completed (doesn't disable permanently)
  - Users retain control over when they want to see the wizard again

#### 🌍 Dynamic Language System via Transifex
The app now dynamically detects available languages, making it easy for anyone to add translations:
- **Automatic language detection**
  - Admin interface automatically discovers all .json translation files in l10n/ folder
  - No code changes needed to add new languages - just add the translation file
  - Language selector dynamically updates based on available translations
- **Transifex-ready workflow**
  - Translators can contribute via Transifex platform
  - New language files automatically appear in admin interface
  - Supports community-driven translation expansion beyond the 6 included languages
- **Language availability management**
  - Admins can enable/disable specific languages for their organization
  - Only enabled languages appear in language selector
  - Users with disabled languages see clear messaging to contact administrator
  - Default: English enabled, others can be enabled as needed
- **Per-language wizard configuration**
  - Each language has independent wizard step configuration
  - Customize steps, text, and order for each language separately
  - Respects cultural and linguistic differences in onboarding approaches

#### 📦 Import/Export for Collaborative Content Management
Enable non-technical content creators to contribute wizard content:
- **Export wizard steps to JSON**
  - One-click export button in admin interface
  - Downloads language-specific JSON file with all wizard steps
  - File naming: `introvox-steps-{language}-{timestamp}.json`
  - Clean, readable JSON format perfect for content creators
- **Import wizard steps from JSON**
  - Upload JSON files created by content creators, translators, or other admins
  - File picker with validation and error handling
  - Imports steps for specific language only (safe multi-language workflow)
  - Success confirmation shows number of steps imported
- **Collaborative workflow benefits**
  - Content writers can work in their preferred text editor
  - Marketing teams can draft wizard content offline
  - Translators can work with familiar JSON format
  - Easy sharing of wizard configurations between Nextcloud instances
  - Version control friendly (can commit JSON files to git)
- **Use cases**
  - Share best-practice wizard configurations with community
  - Maintain wizard content in version control
  - Test wizard changes in development before deploying to production
  - Collaborate with translation agencies who work with JSON files
  - Create wizard templates for different industries or use cases

### Added
- **Complete translation coverage** - All admin interface text now fully translatable
  - All 141 translation strings available in all 6 languages (EN, NL, DE, DA, FR, SV)
  - HTML content placeholder properly translatable in step editor
  - Export/import functionality fully translated
  - "Saving..." feedback message for better user experience

### Fixed
- **Smart app redirect** - Wizard restart now redirects to first available app instead of hardcoded dashboard
  - Priority: dashboard → files → first available app
  - Prevents errors when dashboard app is not installed
  - Uses OC.appswebroots to detect available apps
- **Search button selector** - Fixed language-dependent search button detection
  - Changed from language-specific aria-label to language-independent CSS classes
  - New selector: `.unified-search__trigger, .header-menu__trigger`
  - Works correctly across all languages and Nextcloud versions
- **Confirmation dialogs** - Fixed all OC.dialogs.confirm callbacks in admin interface
  - Reset to default now properly executes after confirmation
  - Language switch, delete, and show-to-all confirmations now work correctly
  - All dialogs use proper Nextcloud callback pattern (not async/await)
- **Wizard title visibility** - Fixed wizard step title readability in dark mode
  - Added !important flags to ensure title color is always readable
  - Explicit dark mode rules for all Nextcloud themes
  - Works in light, dark, and high contrast modes
- **Wizard footer button alignment** - Changed footer buttons to justified layout
  - Left button (Back/Skip) now left-aligned
  - Right button (Next/Done) now right-aligned
  - Better visual balance and follows common wizard UI patterns

### Improved
- **Code cleanup** - Removed unnecessary console logging throughout the application
  - Cleaned up debugging statements in all JavaScript files
  - Reduced bundle size (main.js: 211 KB → 209 KB, personal.js: 75.5 KB → 75.1 KB)
  - Production-ready code with only essential error handling
- **Wizard design system** - Complete redesign to match Nextcloud design standards
  - Aligned with NcButton component styling (pill-shaped buttons)
  - Matched modal and card design patterns
  - Uses Nextcloud CSS variables throughout
  - Primary buttons use --color-primary-element
  - Improved mobile responsive design with touch-friendly controls

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
