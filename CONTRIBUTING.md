# Contributing to IntroVox

Thank you for considering contributing to IntroVox! We welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Nextcloud development instance (version 30-32)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nextcloud/IntroVox.git
   cd IntroVox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build for development**
   ```bash
   npm run watch
   ```

4. **Link to your Nextcloud instance**
   ```bash
   ln -s $(pwd) /path/to/nextcloud/apps/introvox
   ```

5. **Enable the app**
   ```bash
   cd /path/to/nextcloud
   sudo -u www-data php occ app:enable introvox
   ```

## 🔨 Development Workflow

### Making Changes

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes in the appropriate files:
   - **Backend (PHP)**: `lib/` directory
   - **Frontend (Vue)**: `src/` directory
   - **Styles**: `css/` directory
   - **Templates**: `templates/` directory

3. Test your changes locally

4. Build the production version:
   ```bash
   npm run build
   ```

### Code Style

- **PHP**: Follow [PSR-12](https://www.php-fig.org/psr/psr-12/) coding standards
- **JavaScript**: Use ES6+ syntax, Vue 3 Composition API
- **Vue Components**: Use `<script setup>` syntax where possible
- **Comments**: Write clear, concise comments for complex logic

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add new tour step for calendar
fix: resolve issue with wizard not starting
docs: update README with new screenshots
style: format admin controller
refactor: simplify step management logic
test: add unit tests for API controller
chore: update dependencies
```

## 🧪 Testing

Before submitting a pull request:

1. Test the wizard on a fresh Nextcloud installation
2. Test the admin interface (add/edit/delete steps)
3. Test the personal settings page
4. Verify the app works on different browsers
5. Check console for errors (F12)

The automated tests: `npm run test:js` and `php tests-php/run.php` run without a server. `tests-e2e/` has browser tests against a real (test) Nextcloud; its [README](tests-e2e/README.md) explains the setup.

## 📝 Pull Request Process

1. **Update documentation**: If you've added features, update the README.md
2. **Update CHANGELOG.md**: Add your changes under "Unreleased"
3. **Push your branch** to GitHub
4. **Create a Pull Request** with:
   - Clear title and description
   - Screenshots (if UI changes)
   - Testing steps
   - Related issue numbers (if applicable)

5. Wait for review and address any feedback

## 🐛 Reporting Bugs

When reporting bugs, please include:

- Nextcloud version
- IntroVox version
- Browser and version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors (if any)
- Screenshots (if applicable)

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists or has been requested
2. Open an issue with the `enhancement` label
3. Describe the feature and use case clearly
4. Include mockups or examples if possible

## 📜 Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## 🏗️ Project Structure

```
IntroVox/
├── appinfo/           # App metadata and routes
│   ├── info.xml      # App information
│   └── routes.php    # API routes
├── lib/              # PHP backend
│   ├── AppInfo/      # Application bootstrap
│   ├── Controller/   # API and admin controllers
│   ├── Service/      # Business logic
│   └── Settings/     # Settings pages
├── src/              # Vue frontend
│   ├── components/   # Vue components
│   ├── admin/        # Admin interface
│   └── utils/        # Helper functions
├── css/              # Stylesheets
├── templates/        # PHP templates
├── img/              # Images and icons
└── webpack.config.js # Build configuration
```

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/nextcloud/IntroVox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nextcloud/IntroVox/discussions)
- **Documentation**: [Nextcloud Developer Docs](https://docs.nextcloud.com/server/latest/developer_manual/)

## 📄 License

By contributing to IntroVox, you agree that your contributions will be licensed under the AGPL-3.0 license.

---

Thank you for contributing to IntroVox! 🎉
