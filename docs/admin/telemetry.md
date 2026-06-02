# Telemetry

IntroVox includes optional, anonymous usage reporting to help improve the application. Telemetry is an **opt-out** feature — it is enabled by default and can be disabled at any time.

## What Data Is Collected

IntroVox sends the following anonymous data periodically:

| Data | Description |
|------|-------------|
| Instance hash | SHA-256 hash derived from your Nextcloud instance ID (not the URL itself) |
| IntroVox version | Installed IntroVox version |
| Nextcloud version | Server version for compatibility tracking |
| PHP version | Server PHP version |
| Total users | Total Nextcloud user count |
| Active users (30d) | Users active in the last 30 days |
| Wizard enabled | Whether the wizard is currently enabled globally |
| Enabled languages | Which languages the admin has enabled (e.g., `["en", "nl"]`) |
| Total steps per language | Step count per enabled language (numbers only) |
| Wizard-start count | Total times users started the wizard |
| Wizard-complete count | Total `Done`-button clicks |
| Wizard-skip count | Total `Skip and don't show again` clicks |
| Unique users who started | Distinct user count that ever started the tour |
| Unique users who completed | Distinct user count that ever completed/skipped |
| Total groups | Number of Nextcloud groups on the instance |
| Group visibility used | Whether any step uses `visibleToGroups` restrictions (boolean) |
| Server region | From Nextcloud's `default_phone_region` setting |
| Default language | Nextcloud default language code |
| Default timezone | Server timezone |
| Database type | MySQL, PostgreSQL, or SQLite |
| OS family | Linux, Windows, or macOS |
| Web server | Apache or nginx |
| Docker | Whether the server runs inside a Docker container (boolean) |
| Extended Support / Enterprise | Boolean indicating whether the host Nextcloud has an Extended Support / Enterprise subscription. Sourced from `OCP\Util::hasExtendedSupport`. Falls back to `false` for Community |
| Subscription key | The IntroVox subscription key (when one is configured). Sent so the license server can verify the Enterprise claim above — the boolean alone could otherwise be spoofed. Empty string for community instances |

## What Is NOT Collected

- No usernames, email addresses, or personal data
- No step content, titles, or descriptions
- No IP addresses or hostnames
- No URLs or domain names (only the instance-hash)
- No passwords or API tokens
- No per-user behavior — only aggregate counts

## Where Data Is Sent

Telemetry is sent to `https://licenses.voxcloud.nl/api/telemetry/introvox`.

The endpoint is administrator-configurable via the `telemetry_url` app-config key, in case you want to point it at a self-hosted collector or block transmission via a fake URL.

## How to Disable Telemetry

### Via Admin Panel

1. Go to **Settings → Administration → IntroVox**
2. Open the **Support** tab
3. Disable the **Send anonymous usage statistics** toggle

### Via Command Line

```bash
sudo -u www-data php occ config:app:set introvox telemetry_enabled --value false
```

### Block at the Network Layer

If your firewall blocks outbound connections to `licenses.voxcloud.nl`, IntroVox silently fails the daily report — telemetry never reaches the collector and no user-visible errors occur.

## Manual Report

You can send a telemetry report immediately from the Support tab:

1. Go to **Settings → Administration → IntroVox**
2. Open the **Support** tab
3. Click **Send report now**

The button shows clear feedback:

- **Success**: confirms the report was sent and updates the timestamp
- **Error**: shows the specific server error message (e.g., rate limit, connectivity issue)

## Wizard-Tracking Events

Aside from the periodic aggregate report, the wizard reports three real-time lifecycle events to the local `TelemetryService` (not to the external server directly):

| Event | Endpoint | When |
|---|---|---|
| `start` | `POST /apps/introvox/api/wizard/start` | User begins the tour |
| `complete` | `POST /apps/introvox/api/wizard/complete` | User clicks **Done** on the last step |
| `skip` | `POST /apps/introvox/api/wizard/skip` | User clicks **Skip and don't show again** |

These update the per-user `markUserStarted/Completed/Skipped` timestamps in `oc_preferences` and feed into the aggregate counts in the next telemetry report. No content from the tour is included.

## Technical Details

- Telemetry runs as a Nextcloud background job (`TelemetryJob`)
- Reports are sent daily; failures are silently retried on the next interval
- Timeout: 15 seconds per request
- The instance hash is derived from your Nextcloud `instanceid` config value, so different Nextcloud installations produce different hashes — even if hosted at the same domain
- No data is sent when telemetry is disabled and no external connections are made

## See Also

- [Settings](settings.md) — Admin panel overview
- [FAQ](faq.md) — Does the app collect telemetry?
- [Backend Architecture](../architecture/backend-architecture.md) — TelemetryService internals
