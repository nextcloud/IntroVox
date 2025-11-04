# IntroVox

[![GitHub release](https://img.shields.io/github/release/nextcloud/IntroVox.svg)](https://github.com/nextcloud/IntroVox/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Nextcloud](https://img.shields.io/badge/Nextcloud-30--32-blue)](https://nextcloud.com)

**Interactive onboarding tour for new Nextcloud users**

IntroVox provides a user-friendly guided tour that helps new users get started with Nextcloud. Built with Vue 3 and Shepherd.js, it offers customizable tour steps, PWA installation guidance, and comprehensive admin configuration.

## ✨ Features

- 🎯 **Interactive Guided Tour** - Step-by-step introduction to Nextcloud features
- 📱 **PWA Installation Guide** - Device-specific instructions for installing Nextcloud as a Progressive Web App
- ⚙️ **Admin Configuration** - Full CRUD interface for managing tour steps
- 🌍 **Global Enable/Disable** - Administrators can enable or disable the tour for all users
- 👤 **Personal Control** - Users can restart the tour anytime from their settings
- 🎨 **Nextcloud Theming** - Automatically adapts to your Nextcloud theme
- 🔒 **Privacy-Focused** - All data stored locally, no external dependencies

## 📸 Demo

### User Tour Experience

![IntroVox Demo](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/introvox-demo.gif)

*Watch the full interactive tour experience in action*

### Admin Interface
![Admin Configuration](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/admin-interface.png)
*Administrators can easily manage and customize tour steps*

### Personal Settings
![Personal Settings](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/personal-settings.png)
*Users can restart the tour anytime from their personal settings*

## 📦 Installation

### Manual Installation

1. Download the latest release
2. Extract to your Nextcloud `apps/` directory
3. Enable the app:
   ```bash
   sudo -u www-data php occ app:enable introvox
   ```

### From Source

```bash
git clone https://github.com/nextcloud/IntroVox.git
cd IntroVox
npm install
npm run build
```

## 🚀 Quick Start

### For Users
After logging in, IntroVox will automatically guide you through Nextcloud's main features.

**To restart the tour:**
- Go to **Settings** → **IntroVox** → Click **"Wizard opnieuw starten"**

### For Administrators

**Configure tour steps:**
- Go to **Settings** → **Administration** → **IntroVox**
- Add, edit, or delete tour steps
- Enable/disable globally
- Save your changes

**📚 Complete Administrator Documentation:**
- [Administrator Guide](docs/ADMINISTRATOR_GUIDE.md) - Comprehensive guide covering all features, FAQ, and best practices

## 🛠️ Development

```bash
npm install         # Install dependencies
npm run build       # Production build
npm run watch       # Development mode
```

## 📄 License

AGPL-3.0 - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- [Vue 3](https://vuejs.org/)
- [Shepherd.js](https://shepherdjs.dev/)
- [Nextcloud](https://nextcloud.com/)
