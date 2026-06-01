# Customization

Administrators can customize wizard step appearance and behavior via three primary controls: HTML content, CSS selectors, and positioning.

## HTML in Step Content

The **Text (HTML)** field supports a curated set of HTML tags. Step content is sanitized server-side via `OCP\Util::sanitizeHTML` on save and import (since v1.5.0) to prevent stored XSS.

### Supported Tags

| Tag | Use |
|---|---|
| `<p>` | Paragraphs |
| `<strong>`, `<b>` | Bold text |
| `<em>`, `<i>` | Italic text |
| `<ul>`, `<ol>`, `<li>` | Lists |
| `<br>` | Line break |
| `<a href="...">` | Links |

### Example

```html
<p>Welcome to <strong>Nextcloud</strong>!</p>
<p>Here you can:</p>
<ul>
  <li>📁 Upload, share and collaborate on files</li>
  <li>📅 Manage your calendar</li>
  <li>✉️ Send and receive emails</li>
  <li>👥 Manage contacts</li>
</ul>
<p>Read the <a href="https://docs.nextcloud.com">documentation</a> for more.</p>
```

### Inline Styles

Inline styles (`style="..."`) are not recommended — the wizard inherits Nextcloud's theme variables automatically, and custom styles will break under dark mode and high-contrast themes. See [Theme Support](theme-support.md).

### Emoji

Fully supported in titles and content. Make sure your Nextcloud server uses UTF-8 (default).

## CSS Selectors

The **Element (CSS selector)** field determines which UI element a step highlights. Leave it empty for a centered modal.

### Reliable Selectors

Use selectors that work across:

- Different Nextcloud versions
- Different user languages
- Light/dark themes
- Different installed apps

### Recommended Patterns

```css
/* Use data attributes and CSS classes that survive UI refactors */
[data-id="files"]

/* Use comma-separated fallbacks */
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]

/* Use language-independent classes */
.unified-search__trigger, .header-menu__trigger
```

### Anti-Patterns

```css
/* DON'T use language-specific attributes — breaks for non-English users */
button[aria-label="Unified search"]

/* DON'T rely on a single fragile selector */
#some-very-specific-id-that-changes-per-NC-version
```

### Multi-Fallback Selectors (v1.0.6+)

Default steps use comma-separated selectors so that if one fails (e.g., after a Nextcloud upgrade), another can match:

```css
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]
```

This significantly reduces the rate of "element not found" failures.

### Finding the Right Selector

1. Open Nextcloud in your browser
2. Press **F12** to open Developer Tools
3. Click the "Inspect element" icon
4. Click the target element
5. Read its `class`, `id`, `data-*` attributes
6. Test your selector in the Console: `document.querySelector('your-selector')` should return the element

## Position

The **Position** field determines where the step tooltip appears relative to the highlighted element.

| Position | Best for |
|---|---|
| `right` | Left sidebar elements (Files, Calendar) |
| `left` | Right sidebar elements (user menu) |
| `top` | Bottom navigation |
| `bottom` | Top navigation (header, search bar) |

The position only applies to **attached** steps (where `attachTo` is set). Centered steps ignore it.

## Centered vs. Attached Steps

- **Centered step** — leave `attachTo` empty. Step appears in the middle of the screen.
- **Attached step** — set `attachTo` to a CSS selector and choose a `position`. Step appears next to the highlighted element.

If an attached step's element doesn't exist at tour time, the step falls back to centered display (since v1.4.1), so users still see the content.

## Step Identifier

The **ID** field is auto-generated for new steps (timestamp-based, e.g., `new_1731600000000`) and is used internally for tracking and ordering. It's not editable after creation. Stable IDs are important because:

- Step order is tracked by ID, not position (since v1.0.6) — enable/disable after reordering works correctly
- Import/export references steps by ID
- Telemetry events reference the step ID

## See Also

- [Managing Wizard Steps](../admin/managing-steps.md) — Step CRUD
- [Guided Tours](guided-tours.md) — How steps render
- [Theme Support](theme-support.md) — CSS variable inheritance
- [Best Practices](../admin/best-practices.md) — Content design recommendations
