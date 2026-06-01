# IntroVox Documentation

Welcome to the IntroVox documentation. IntroVox is a Nextcloud app that provides an interactive onboarding tour for new users — built with Vue 3 and Shepherd.js, with multi-language support, group-based step visibility, and a full admin configuration interface.

![IntroVox welcome step](../docs/screenshots/welcome-step.png)

*A step-by-step guided tour through Nextcloud's main features, fully customizable per language.*

## Quick Navigation

### For Users

Learn how to take, restart, and configure your tour preferences.

- [Overview](user/overview.md) — What IntroVox is and how the tour works
- [Taking the Tour](user/taking-the-tour.md) — Navigating steps, highlighted elements, centered vs. attached
- [Personal Settings](user/personal-settings.md) — Restart, permanently disable, language messages
- [Keyboard Navigation](user/keyboard-navigation.md) — Shortcuts and accessibility features
- [Mobile Experience](user/mobile.md) — Responsive layout, touch interactions
- [Troubleshooting](user/troubleshooting.md) — Tour not starting, missing steps, language issues
- [FAQ](user/faq.md) — Common user questions
- [Tips](user/tips.md) — Getting the most out of Nextcloud

### For Administrators

Installation, configuration, step management, and operations.

- [Admin Guide](admin/guide.md) — Day-to-day administration
- [Settings](admin/settings.md) — Admin panel reference
- [Language Management](admin/language-management.md) — Enable/disable languages, per-language configuration
- [Managing Wizard Steps](admin/managing-steps.md) — CRUD, reordering, enable/disable, reset to default
- [Group-Based Visibility](admin/group-visibility.md) — Role-based onboarding with group filters
- [Import/Export](admin/import-export.md) — Share configurations between instances
- [Best Practices](admin/best-practices.md) — Content guidelines, language strategy, maintenance
- [Troubleshooting](admin/troubleshooting.md) — Wizard not showing, missing steps, translations
- [FAQ](admin/faq.md) — Common admin questions

### Features

Per-feature documentation for capabilities.

- [Guided Tours](features/guided-tours.md) — Shepherd.js engine, step types, attached vs. centered
- [Multi-Language Support](features/multi-language.md) — Transifex integration, auto-detection, per-language steps
- [Step Visibility](features/step-visibility.md) — Group filters + user preferences
- [Customization](features/customization.md) — HTML in step content, CSS selectors, positioning
- [Theme Support](features/theme-support.md) — Light, dark, high contrast, custom Nextcloud themes

### For Architects & Developers

Technical documentation for integration, evaluation, and contribution.

- [Architecture Overview](architecture/overview.md) — System design and components
- [API Reference](architecture/api-reference.md) — REST API endpoints
- [Frontend Architecture](architecture/frontend-architecture.md) — Vue 3 + Shepherd.js structure
- [Backend Architecture](architecture/backend-architecture.md) — Controllers, services, config storage
- [Transifex Integration](architecture/transifex-integration.md) — Translation workflow

### Deployment

Installation, App Store submission, and release process.

- [Installation](deployment/installation.md) — Install from App Store or source
- [App Store Submission](deployment/app-store-submission.md) — Certificate, packaging, signing, uploading
- [Release Process](deployment/release-process.md) — Version sync, build, GitHub releases

## Getting Started

New to IntroVox? Start with the [Getting Started Guide](getting-started.md) for a per-role quickstart.

## Support

- **Issues & Feature Requests**: [GitHub Issues](https://github.com/nextcloud/IntroVox/issues)
- **Source Code**: [GitHub Repository](https://github.com/nextcloud/IntroVox)

## License

IntroVox is licensed under the [AGPL-3.0 License](https://www.gnu.org/licenses/agpl-3.0.html).
