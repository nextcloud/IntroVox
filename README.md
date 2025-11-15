# IntroVox

[![GitHub release](https://img.shields.io/github/release/nextcloud/IntroVox.svg)](https://github.com/nextcloud/IntroVox/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Nextcloud](https://img.shields.io/badge/Nextcloud-32-blue)](https://nextcloud.com)

**Interactive onboarding tour for new Nextcloud users**

IntroVox provides a user-friendly guided tour that helps new users get started with Nextcloud. Built with Vue 3 and Shepherd.js, it offers customizable tour steps, multi-language support, PWA installation guidance, and comprehensive admin configuration with import/export capabilities.

## ✨ Features

### 🎯 User Experience
- **Interactive Guided Tour** - Step-by-step introduction to Nextcloud features
- **User Control** - Users can permanently disable the wizard or restart it anytime
- **"Skip and don't show again"** - Quick opt-out on first encounter
- **Smart Behavior** - Closing with X only marks completed; "Done" button disables auto-start
- **Personal Settings** - Full control over wizard preferences in Personal Settings → IntroVox

### 🌍 Multi-Language Support
- **6 Languages Included** - English, Dutch, German, Danish, French, Swedish
- **Transifex-Ready** - Dynamically detects new language files - no code changes needed
- **Per-Language Configuration** - Customize tour steps independently for each language
- **Language Availability Control** - Admins can enable/disable specific languages
- **Community Contributions** - Easy for translators to add new languages via Transifex

### ⚙️ Admin Configuration
- **Full CRUD Interface** - Add, edit, delete, and reorder tour steps
- **Import/Export** - Share configurations, collaborate with content creators
- **Language Management** - Enable/disable languages, manage per-language steps
- **Global Controls** - Enable/disable wizard, force show to all users
- **Visual Feedback** - Enable/disable individual steps, drag-and-drop reordering

### 🎨 Design & Theming
- **Nextcloud Design System** - Matches Nextcloud UI patterns and components
- **Full Theme Support** - Adapts to light, dark, and high contrast modes
- **Mobile Responsive** - Optimized for all screen sizes
- **Accessibility** - Reduced motion support, keyboard navigation

### 🔒 Privacy & Performance
- **Privacy-Focused** - Tour completion status stored locally
- **No External Dependencies** - All resources bundled
- **Lightweight** - Optimized bundle size (~210 KB main.js)
- **Production-Ready** - Clean code without debug logging

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

### From Nextcloud App Store (Recommended)

1. Log in to your Nextcloud instance as an administrator
2. Go to **Apps** in the top-right menu
3. Search for **"IntroVox"**
4. Click **Download and enable**

Or install directly from the [Nextcloud App Store](https://apps.nextcloud.com/apps/introvox)

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/nextcloud/IntroVox/releases)
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
After logging in, IntroVox will automatically guide you through Nextcloud's main features (if your language is enabled).

**User Options:**
- **Skip and don't show again** - On first step to permanently opt-out
- **Restart tour** - Go to **Personal Settings** → **IntroVox** → Click **"Restart tour now"**
- **Permanently disable** - Check **"Permanently disable the introduction tour"** in Personal Settings → IntroVox

### For Administrators

**Quick Setup:**
1. Go to **Admin Settings** → **IntroVox**
2. Enable languages you want to support
3. Customize wizard steps per language (or use defaults)
4. Enable wizard globally
5. Optionally use **"Show wizard to all users"** to force restart for everyone

**Key Admin Features:**
- **Language Management** - Select which languages are available
- **Import/Export** - Share configurations or work with content creators
- **Per-Language Steps** - Customize wizard content for each language
- **Global Controls** - Enable/disable wizard, force show to all users

**📚 Complete Documentation:**
- [Administrator Guide](docs/ADMINISTRATOR_GUIDE.md) - Comprehensive guide covering all features, FAQ, and best practices
- [User Manual](docs/USER_MANUAL.md) - End-user guide for using the wizard
- [Deployment Guide](docs/ADMINISTRATOR_GUIDE.md#deployment-scenarios) - Best practices for organizations

## 🛠️ Development

```bash
npm install         # Install dependencies
npm run build       # Production build
npm run watch       # Development mode
```

## 📄 License

AGPL-3.0 - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

The initial idea for IntroVox came from [SURF](https://www.surf.nl/), who identified the need for better onboarding experiences for their thousands of users in the Dutch education and research community. Throughout the development process, SURF provided valuable feedback that helped shape IntroVox into a practical and effective solution.

**Built with:**
- [Vue 3](https://vuejs.org/)
- [Shepherd.js](https://shepherdjs.dev/)
- [Nextcloud](https://nextcloud.com/)
