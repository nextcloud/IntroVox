# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Extended multi-language support**
  - Added German (de), French (fr), Danish (da), and Swedish (sv) translations
  - Total of 6 supported languages: English, Dutch, German, French, Danish, Swedish
  - All UI elements, wizard steps, and admin interface fully translated

### Improved
- **Wizard UI enhancements**
  - Fixed header layout with flexbox for better title spacing
  - Titles now wrap properly without overlapping close button
  - Close button styled to match secondary button design (white background)
  - Disabled word hyphenation for cleaner title display
  - Enhanced dark theme support with explicit color overrides
  - Links now follow Nextcloud theme with proper styling and accessibility
- **Admin settings page**
  - Improved margins and padding to match Nextcloud standards
  - Consistent spacing with personal settings page
  - Removed excessive left margin
- **Personal settings page**
  - Simplified interface, removed redundant status messages
  - Cleaner restart button with emoji icon
  - Streamlined JavaScript for better performance
  - Now shows disabled state when admin disables wizard globally
  - Clear messaging to contact administrator when tour is disabled

### Fixed
- Dark theme title visibility issues (white text in dark mode)
- Close button styling inconsistency with other buttons
- Admin page margin not matching personal settings page
- Word breaking in wizard step titles

## [1.1.0] - 2025-10-31

### Added
- **Multi-language support** using Nextcloud's l10n system
  - Dutch (nl) and English (en) translations
  - All default wizard steps are now translatable
  - Automatically switches based on user's Nextcloud language
- **Drag-and-drop step reordering** in admin interface
  - Visual drag handles for easy reordering
  - Uses SortableJS library
  - Order persists across sessions
- **Transifex integration** for community translations
  - Configuration file added for translation management
  - Enables community contributions for additional languages

### Improved
- **Fixed element selectors** for better reliability
  - Changed from `data-id` attributes to `href` attribute matching
  - Files and Calendar steps now display correctly
  - More robust DOM element detection
- **Dynamic button generation** based on step position
  - First step shows "Skip" and "Start" buttons
  - Middle steps show "Back" and "Next" buttons
  - Last step shows "Back" and "Complete" buttons
- **Admin interface styling** improvements
  - Better spacing and margins matching Nextcloud standards
  - Visual step previews with icons
  - Improved form layout
- **Auto-save default steps** to database
  - Ensures steps can be reordered immediately after installation
  - Prevents hardcoded defaults from overriding customizations

### Technical
- Added IL10N dependency injection to AdminController
- Created l10n/ directory with translation files
- Integrated @nextcloud/l10n for frontend translations
- Updated deployment script to include translations
- Added deploy.sh.example template for easy server deployment

### Fixed
- Wizard steps being skipped due to missing DOM elements
- First step always showing "Welcome" regardless of custom order
- Admin settings not matching Nextcloud UI standards

## [1.0.0] - 2025-10-30

### Added
- Initial release of IntroVox
- Interactive guided tour for new Nextcloud users
- 8 default tour steps covering main Nextcloud features
- PWA installation guide with device-specific instructions
- Browser and OS detection for tailored guidance
- Admin interface for managing tour steps (CRUD operations)
- Global enable/disable toggle for administrators
- Personal settings page for users to restart the tour
- Automatic Nextcloud theming integration
- localStorage-based completion tracking
- Vue 3 with Composition API
- Shepherd.js for guided tour functionality
- Full Dutch language support
- Responsive design for mobile and desktop

### Technical Details
- Built with Vue 3 and Webpack 5
- Uses Nextcloud App Framework (OCP)
- Supports Nextcloud 30-32
- AGPL-3.0 licensed

[1.0.0]: https://github.com/nextcloud/IntroVox/releases/tag/v1.0.0
