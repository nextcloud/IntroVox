# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
