# IntroVox

[![GitHub release](https://img.shields.io/github/release/nextcloud/IntroVox.svg)](https://github.com/nextcloud/IntroVox/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Nextcloud](https://img.shields.io/badge/Nextcloud-32--35-blue)](https://nextcloud.com)

**Guided tours for Nextcloud and its apps**

IntroVox shows people around Nextcloud. New users get a welcome tour after their first login, and a short tour the first time they open an app such as Files, Talk, Deck or Calendar. Admins write and translate the steps, choose who gets each tour and when, and see how far people get. Built with Vue 3 and Shepherd.js.

## ✨ Features

### 🎯 For Users
- **Welcome tour** - Starts after the first login, on the first page someone opens, in their own language
- **Tours for apps and pages** - A short tour the first time someone opens an app, such as Talk or Deck, or another page of Nextcloud. A tour can also start anywhere: on whichever page someone opens next, for a tip after a few days
- **Built-in tours for Files, Talk, Deck and Calendar** - Each lets people do the app's main job once, with their own work, and then shows what matters most at work
- **Steps you do, not just read** - A step can go on when the user clicks its element or fills in a field. A step whose element only appears after the user did something waits aside in the corner, and moves to the element once it is there
- **Images, GIFs and videos** - Above a step's text, with a description and captions
- **Tours in the user menu** - Leads to **Personal settings → IntroVox**, where users start any tour again. **Start tours by themselves** there switches off every tour that would start by itself
- **"Getting started" on the Dashboard** - An optional checklist of first things to do, such as uploading a file or adding a profile picture. It ticks itself off as people do them

### ⚙️ For Administrators
- **Tours list** - Switch each tour on or off, edit its steps, preview it, show it again to everyone
- **Timing rules** - Per tour: everyone or **New accounts only**, a number of days after the first login, and two dates between which it starts by itself
- **Share links** - **Copy link** gives a link that starts the tour, for a welcome mail or a message to a team
- **Statistics per tour** - How many people started, completed and skipped it, and **How far people get**: for each step, how many got at least that far
- **Export and import a whole tour** - One `.zip` file with the tour's settings, its steps in every language and its images and videos
- **Translate with AI / Write steps with AI** - With a provider for the Nextcloud Assistant. You check and can change every step before it is saved
- **Steps per language and per group** - Replace the translated default steps for a language, limit a step or a tour to groups
- **Pick element** - Point at the element a step shows instead of typing a CSS selector
- **Admin tour** - A short tour of the admin page, the first time an admin opens it

### 🌍 Languages
- **Translated on Transifex** - Nextcloud's translators translate IntroVox and its default steps. A new language file is picked up without a code change; there is nothing to switch on. A string that is not translated yet shows in English
- **Your own steps per language** - A user gets the steps in their language, else in its base language (`de` for `de_DE`), else in the tour's main language

### 🎨 Design & Accessibility
- **Nextcloud Design System** - Nextcloud's own components and theme colours: light, dark and high contrast
- **Keyboard** - Left and right arrow keys move between steps, Esc closes the tour
- **Reduced motion** - Nothing blinks or plays by itself for people who prefer reduced motion
- **Phones** - Steps fit small screens and scroll inside

### 🔒 Privacy & Performance
- **Small on every page** - Every page loads a bootstrap of about 20 KB. It decides from what the page already carries whether a tour starts, without a request. The tour code loads only when a tour starts
- **Checked on the server** - Users only get the tours and steps meant for their groups
- **Totals only** - The statistics show no single person's progress. Anonymous usage statistics for the developers are optional, see [Telemetry](docs/admin/telemetry.md)
- **Media from this Nextcloud only** - IntroVox keeps its own copy, checks the real file type and removes metadata such as location, see the [threat model](docs/security/media.md)
- **No external resources** - Everything is bundled

## 📸 Demo

### User Tour Experience

![IntroVox Demo](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/introvox-demo.gif)

![IntroVox Welcome](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/welcome-step.png)

*The welcome tour*

### Dark Mode Support

![IntroVox Dark Theme](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/dark-theme.png)

*Automatically adapts to your Nextcloud theme (light, dark, and high contrast modes)*

### Admin Interface
![Admin Configuration](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/admin-settings.png)
*The Tours pane of the admin page*

### Personal Settings
![Personal Settings](https://raw.githubusercontent.com/nextcloud/IntroVox/main/docs/screenshots/personal-settings.png)
*Users start any tour again from their personal settings*

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
After your first login, the welcome tour starts by itself (if your administrator has it on).

- **Next** / **Back**, or the left and right arrow keys, move between steps. **✕** or Esc closes the tour; it then does not start by itself again in this browser
- **Skip and don't show again** on the first step, or **Done** on the last, keeps the welcome tour from starting by itself again
- **Personal settings → IntroVox** (or **Tours** in your user menu): **Restart tour now** runs the welcome tour again, and **Start** runs any other tour listed under **Tours**
- Switch off **Start tours by themselves** there, and no tour starts by itself. You can still start each one there

### For Administrators

1. Go to **Settings → Administration → IntroVox**
2. Under **Settings**, check that **Tours for everyone** is on (it is after installing). The welcome tour then runs in every language Nextcloud supports, with the translated default steps
3. Under **Tours**, switch on the **Built-in** tours you want, or click **New tour** for a tour in an app, on another page, or anywhere. A new tour starts switched off
4. **Edit steps** changes a tour's steps; **Add language override** adds your own text for a language
5. ⋯ → **Preview** shows the tour as users get it; ⋯ → **Copy link** gives a link that starts it
6. Optionally, switch on **Show "Getting started" on the Dashboard** under **Settings**

See [Tours](docs/admin/tours.md) for timing, share links, statistics and moving a tour to another Nextcloud.

**📚 Complete Documentation:**
- [Documentation Hub](docs/index.md) - Full documentation index
- [Getting Started](docs/getting-started.md) - Role-based quickstart
- [Administrator Guide](docs/admin/guide.md) - Day-to-day administration
- [Tours](docs/admin/tours.md) - The welcome tour, built-in tours, tours for apps and pages, links, statistics, export and import
- [Admin Settings](docs/admin/settings.md) - Every option on the admin page, and where it is stored
- [Managing Tour Steps](docs/admin/managing-steps.md) - Writing steps: text, images and videos, elements, steps that wait for the user
- [Group-Based Visibility](docs/admin/group-visibility.md) - Role-based onboarding
- [User Manual](docs/user/overview.md) - End-user guide
- [Architecture Overview](docs/architecture/overview.md) - For architects and developers
- [Installation](docs/deployment/installation.md) - App Store and manual install

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
