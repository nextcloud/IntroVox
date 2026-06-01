# Installation

This guide describes how to install IntroVox on a Nextcloud instance.

## Requirements

- **Nextcloud 32 or later** (32–34 explicitly supported as of v1.5.0)
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
2. Toggle **Enable wizard for all users**
3. Under **Available languages**, check the languages you want to support (default: English only)
4. Optionally customize wizard steps per language via the language dropdown

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

IntroVox does not create or migrate custom database tables — all state lives in `oc_appconfig` and `oc_preferences`. Upgrades are non-destructive: custom step configurations, enabled languages, and user preferences are preserved.

The defensive `is_array()` guard in `ApiController::getWizardSteps()` (v1.4.3+) means that even if an older corrupt step blob exists, the wizard falls back to defaults rather than crashing.

## Uninstallation

```bash
sudo -u www-data php occ app:disable introvox
sudo rm -rf /var/www/nextcloud/apps/introvox
```

The app-config and preferences rows can be left in place (harmless) or cleaned up:

```sql
DELETE FROM oc_appconfig WHERE appid = 'introvox';
DELETE FROM oc_preferences WHERE appid = 'introvox';
```

## Verification

After installation:

1. Log in as a regular user with an enabled language
2. The wizard should auto-start on the dashboard after a few seconds
3. Check **Settings → Personal → IntroVox** — the **Restart tour now** button should be visible

If the wizard doesn't appear, see [Admin Troubleshooting](../admin/troubleshooting.md).

## See Also

- [Admin Guide](../admin/guide.md) — Day-to-day administration
- [Admin Troubleshooting](../admin/troubleshooting.md) — When something goes wrong
- [App Store Submission](app-store-submission.md) — For developers releasing IntroVox itself
- [Release Process](release-process.md) — Version sync, build, GitHub releases
