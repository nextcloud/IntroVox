# API Reference

REST endpoints exposed by IntroVox. All routes are defined in [appinfo/routes.php](../../appinfo/routes.php).

## Public API

Public endpoints are reachable by any logged-in user.

### `GET /apps/introvox/api/steps`

Returns the wizard steps for the current user, filtered by language and group visibility.

**Annotations:** `@NoAdminRequired`, `@NoCSRFRequired`, `@PublicPage`

**Response (200):**

```json
{
  "success": true,
  "steps": [
    {
      "id": "welcome",
      "title": "👋 Welcome to Nextcloud",
      "text": "<p>Nice to have you here!</p>",
      "attachTo": "",
      "position": "right",
      "enabled": true,
      "visibleToGroups": []
    }
  ],
  "useDefault": false,
  "enabled": true,
  "language": "en",
  "version": "1"
}
```

**Special response fields:**

- `useDefault: true` — no custom configuration exists for this language; frontend should use built-in defaults
- `languageDisabled: true` — user's language is not in `enabled_languages`; tour does not start
- `enabled: false` — global wizard toggle is off

**Implementation:** [ApiController::getWizardSteps()](../../lib/Controller/ApiController.php#L77)

### `POST /apps/introvox/api/wizard/start`

Records that the current user started the wizard.

**Annotations:** `@NoAdminRequired`, `@NoCSRFRequired`

**Response:** `{ "success": true }`

### `POST /apps/introvox/api/wizard/complete`

Records that the current user completed the wizard.

**Annotations:** `@NoAdminRequired`, `@NoCSRFRequired`

**Response:** `{ "success": true }`

### `POST /apps/introvox/api/wizard/skip`

Records that the current user clicked **Skip and don't show again**.

**Annotations:** `@NoAdminRequired`, `@NoCSRFRequired`

**Response:** `{ "success": true }`

## Personal Settings API

Per-user state. Requires authentication.

### `GET /apps/introvox/personal/settings`

Returns the user's permanent-disable preference.

**Response:** `{ "permanent_disable": false }`

### `POST /apps/introvox/personal/settings`

Updates the user's permanent-disable preference.

**Body:** `{ "permanent_disable": true }`

## Admin API

All admin endpoints require administrator privileges. CSRF protection is enforced on state-changing endpoints (since v1.5.0).

### Step CRUD

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/steps` | Get steps for a language (query: `?language=<code>`) |
| `POST` | `/apps/introvox/admin/steps` | Save the full step list for a language |
| `POST` | `/apps/introvox/admin/step` | Add a single step |
| `PUT` | `/apps/introvox/admin/step/{id}` | Update a single step |
| `DELETE` | `/apps/introvox/admin/step/{id}` | Delete a single step |
| `POST` | `/apps/introvox/admin/reset` | Reset a language to defaults |

### Import/Export

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/apps/introvox/admin/export` | Export steps for a language as JSON |
| `POST` | `/apps/introvox/admin/import` | Import steps from JSON |

### Settings

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/settings` | Get global settings |
| `POST` | `/apps/introvox/admin/settings` | Save global settings |
| `GET` | `/apps/introvox/admin/languages` | Get available languages with metadata (display name, enabled flag) |
| `GET` | `/apps/introvox/admin/groups` | Get list of Nextcloud groups for the **Visible to groups** dropdown |

### Statistics and Telemetry

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/statistics` | Get aggregate usage statistics |
| `POST` | `/apps/introvox/admin/telemetry` | Toggle telemetry on/off |
| `POST` | `/apps/introvox/admin/telemetry/send` | Manually trigger telemetry send |

### License (Enterprise Subscription)

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/apps/introvox/admin/license/stats` | Get current license status and step-count usage |
| `POST` | `/apps/introvox/admin/license/settings` | Save subscription key |
| `POST` | `/apps/introvox/admin/license/validate` | Validate subscription key against license server |
| `POST` | `/apps/introvox/admin/license/usage` | Report current usage to license server |

## Step Object Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique step identifier |
| `title` | string | Yes | Step heading (HTML-sanitized server-side) |
| `text` | string | Yes | Step body content (HTML-sanitized server-side) |
| `attachTo` | string | No | CSS selector for element highlight; empty for centered |
| `position` | string | No | One of `right`, `left`, `top`, `bottom` |
| `enabled` | boolean | No | Whether the step is shown (default `true`) |
| `visibleToGroups` | string[] | No | Group IDs that can see this step (default `[]` = all users) |

## Authentication

- **Public API** (`/api/*`) — requires Nextcloud session
- **Personal API** (`/personal/*`) — requires Nextcloud session
- **Admin API** (`/admin/*`) — requires Nextcloud session **and** admin role; double-checked via `IGroupManager::isAdmin()` (v1.5.0+)

## CSRF Protection

The following POST endpoints require a valid CSRF token (restored in v1.5.0 after being inadvertently disabled):

- `saveSteps`
- `resetToDefault`
- `saveSettings`
- `exportSteps`
- `importSteps`
- `toggleTelemetry`
- `sendTelemetryNow`

Use `@nextcloud/axios` from the frontend — it injects the token automatically.

## See Also

- [Architecture Overview](overview.md) — system context
- [Backend Architecture](backend-architecture.md) — controller and service details
- [Group-Based Visibility](../admin/group-visibility.md) — `visibleToGroups` semantics
