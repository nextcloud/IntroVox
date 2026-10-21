# Installation

This guide describes how to install IntroVox on a Nextcloud instance.

## Requirements

- **Nextcloud 32 to 35** (35 since v1.7.7)
- **PHP 8.1 or later**

Verify the authoritative requirements in [appinfo/info.xml](https://github.com/nextcloud/IntroVox/blob/main/appinfo/info.xml).

## Installation Methods

### From the Nextcloud App Store (Recommended)

1. Log in to your Nextcloud instance as an administrator
2. Open **Apps** from the top-right menu
3. Search for **IntroVox**
4. Click **Download and enable**

Or go directly to [apps.nextcloud.com/apps/introvox](https://apps.nextcloud.com/apps/introvox).

### Manual Installation

1. Download the latest release tarball from [GitHub Releases](https://github.com/nextcloud/IntroVox/releases)
2. Extract to your Nextcloud `apps/` directory:
   ```bash
   tar -xzf introvox-X.Y.Z.tar.gz -C /var/www/nextcloud/apps/
   ```
3. Set correct ownership:
   ```bash
   sudo chown -R www-data:www-data /var/www/nextcloud/apps/introvox
   ```
4. Enable the app:
   ```bash
   sudo -u www-data php occ app:enable introvox
   ```

### From Source

For development or testing the latest unreleased changes:

```bash
git clone https://github.com/nextcloud/IntroVox.git /var/www/nextcloud/apps/introvox
cd /var/www/nextcloud/apps/introvox
npm install
npm run build
sudo -u www-data php occ app:enable introvox
```

> Source-based installs require a `node` and `npm` toolchain on the server. For production, prefer the App Store or pre-built tarball.

## Initial Configuration

After enabling the app, the welcome tour needs nothing switched on:

- **Tours for everyone** is on after installation, so the welcome tour starts for each user on their next page load, in their own language (translated through Transifex; English for a language without a translation)
- **Tours** appears in everyone's user menu, just above **Help**; hide it under **Settings** (**Show Tours in the user menu**)
- Tours for apps and pages, the built-in tours for Files, Talk, Deck and Calendar, and the checklist on the Dashboard are off until you switch them on
- The first time you open **Settings → Administration → IntroVox**, a short admin tour shows you the page. It ends with the telemetry question; an instance sends no telemetry until an admin has been asked

Then, optionally:

1. Open **Tours**, click **Edit steps** on the **Welcome tour**, and click **Add language override** to write your own copy for a language
2. Restrict steps to user groups for role-based onboarding
3. Switch on a built-in tour, or add your own with **Tours** → **New tour** ([Tours](../admin/tours.md))

See [Admin Guide](../admin/guide.md) for the full configuration walkthrough.

## Restricting the App to Specific Groups

If you only want certain Nextcloud groups to see the wizard at all (and not just specific steps):

1. Go to **Settings → Apps → IntroVox**
2. Click **"Limit to groups"**
3. Select the allowed groups

Users outside those groups won't have IntroVox's JavaScript loaded — the cleanest way to scope the app.

For finer control (different steps per group), see [Group-Based Visibility](../admin/group-visibility.md).

## Upgrading

### Via the App Store

Upgrades appear in **Settings → Apps → Updates** when a new version is published. Click **Update** and Nextcloud handles the rest.

### Manual Upgrade

1. Download the new release tarball
2. Disable the old version:
   ```bash
   sudo -u www-data php occ app:disable introvox
   ```
3. Replace the `apps/introvox` directory with the new tarball contents
4. Re-enable:
   ```bash
   sudo -u www-data php occ app:enable introvox
   ```

### Upgrading to 2.0.0

2.0.0 changes what an update does on its own. Read the **Upgrade notes** in the [2.0.0 changelog](../../CHANGELOG.md#200---2026-10-21) before you update; in short:

- The personal "disable the tour" switch is now **Start tours by themselves** and covers every tour. The repair step `IntroduceTours` switches tours off for people who had switched the welcome tour off without finishing it
- New features (app tours, built-in tours, the checklist) start switched off; **Tours** in the user menu is the exception
- Telemetry waits until an admin has opened IntroVox's settings and been asked
- Scripts that call IntroVox's routes directly may need changes: three step routes are gone, and every route but two needs the CSRF request token

### Migration Notes

IntroVox does not create or migrate custom database tables. Settings, tours and their steps live in `oc_appconfig`, user preferences in `oc_preferences`. The images and videos of steps, and the backups of the last ten deleted tours, live in IntroVox's app data folder (`appdata_<instanceid>/introvox` in the Nextcloud data directory). Upgrades are non-destructive: tours, steps, language overrides, media and user preferences are preserved.

The defensive `is_array()` guard in `TourRepository::steps()` means that even if an older corrupt step blob exists, the tour falls back to the defaults rather than crashing.

## Uninstallation

If **Put it on every Dashboard** is on for the checklist, switch it off first: until then the Dashboard's default layout (app config `dashboard` / `layout`) lists `introvox-checklist`.

```bash
sudo -u www-data php occ app:disable introvox
sudo rm -rf /var/www/nextcloud/apps/introvox
```

The app-config and preferences rows can be left in place (harmless) or cleaned up:

```sql
DELETE FROM oc_appconfig WHERE appid = 'introvox';
DELETE FROM oc_preferences WHERE appid = 'introvox';
```

The images and videos of steps and the backups of deleted tours stay in the app data folder. To remove them too, delete it and let Nextcloud forget the files:

```bash
sudo rm -rf /var/www/nextcloud/data/appdata_<instanceid>/introvox
sudo -u www-data php occ files:scan-app-data
```

`<instanceid>` is the `instanceid` in `config/config.php`; the data directory may be elsewhere than `/var/www/nextcloud/data`.

Disabled the app with **Put it on every Dashboard** still on? Remove `introvox-checklist` from the layout by hand:

```bash
sudo -u www-data php occ config:app:get dashboard layout
sudo -u www-data php occ config:app:set dashboard layout --value="<the same list without introvox-checklist>"
```

## Verification

After installation:

1. Log in as a regular user who has not had the welcome tour yet
2. The welcome tour should start by itself on the first page they open, in their language, once the page has loaded
3. Check **Settings → Personal → IntroVox** — the **Restart tour now** button should be visible

If the wizard doesn't appear, see [Admin Troubleshooting](../admin/troubleshooting.md).

## See Also

- [Admin Guide](../admin/guide.md) — Day-to-day administration
- [Admin Troubleshooting](../admin/troubleshooting.md) — When something goes wrong
- [Changelog](../../CHANGELOG.md) — What changed in each release
