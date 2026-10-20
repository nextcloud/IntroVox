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

After enabling the app:

1. Go to **Settings → Administration → IntroVox**
2. Toggle **Tours for everyone** — the tour is now live in every Nextcloud-supported language automatically (auto-translated via Transifex; English fallback for languages without a translation)
3. Optionally open **Tours**, click **Edit steps** on the **Welcome tour**, and click **Add language override** to author custom copy for a specific language
4. Optionally restrict steps to specific user groups for role-based onboarding
5. Optionally add a tour for an app with **Tours** → **New tour** ([Tours](../admin/tours.md))

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

### Migration Notes

IntroVox does not create or migrate custom database tables. Settings, tours and their steps live in `oc_appconfig`, user preferences in `oc_preferences`. The images and videos of steps, and the backups of the last ten deleted tours, live in IntroVox's app data folder (`appdata_<instanceid>/introvox` in the Nextcloud data directory). Upgrades are non-destructive: tours, steps, language overrides, media and user preferences are preserved.

The defensive `is_array()` guard in `ApiController::getWizardSteps()` (v1.4.3+) means that even if an older corrupt step blob exists, the wizard falls back to defaults rather than crashing.

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
- [App Store Submission](app-store-submission.md) — For developers releasing IntroVox itself
- [Release Process](release-process.md) — Version sync, build, GitHub releases
