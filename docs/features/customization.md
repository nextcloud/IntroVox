# Customization

Administrators can customize wizard step appearance and behavior via three primary controls: HTML content, CSS selectors, and positioning.

## HTML in Step Content

The **Text** field is a formatting editor (see [Managing steps](../admin/managing-steps.md#text)); under **Edit as HTML** it takes a curated set of HTML tags. The text is stored as written and cleaned where it is shown: in the tour and in the step list only the tags below survive, links keep only their target, and everything else (scripts, styles, forms, images, event handlers) is removed. Titles and button labels are plain text. This also covers imported tours and translations of the default steps, which nobody reviews for markup.

### Supported Tags

| Tag | Use |
|---|---|
| `<p>` | Paragraphs |
| `<strong>`, `<b>` | Bold text |
| `<em>`, `<i>` | Italic text |
| `<ul>`, `<ol>`, `<li>` | Lists |
| `<br>` | Line break |
| `<small>`, `<code>`, `<u>` | Small print, code, underline |
| `<h3>`, `<h4>` | Headings |
| `<a href="...">` | Links; `target="_blank"` opens a new tab |

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

Inline styles (`style="..."`) are removed when the step is shown. The tour inherits Nextcloud's theme variables automatically, so it follows dark mode and high-contrast themes without them. See [Theme Support](theme-support.md).

### Emoji

Fully supported in titles and content. Make sure your Nextcloud server uses UTF-8 (default).

## CSS Selectors

The **Attach to element (CSS selector)** field determines which UI element a step highlights. Leave it empty for a centered step.

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

The tour tries them in the order written: the step points at the first selector that finds a visible element, wherever the others are in the page. Put the one you want most first.

This significantly reduces the rate of "element not found" failures.

### Finding the Right Selector

The quickest way is **🎯 Pick element** in the step editor: point at the element and the selector is filled in. See [Pick an element](../admin/managing-steps.md#pick-an-element).

To find one by hand, for example to add comma-separated fallbacks:

1. Open Nextcloud in your browser
2. Press **F12** to open Developer Tools
3. Click the "Inspect element" icon
4. Click the target element
5. Read its `class`, `id`, `data-*` attributes
6. Test each selector on its own in the Console: `document.querySelector('your-selector')` should return the element. Don't test a whole comma-separated list this way: the browser then returns whichever match comes first in the page, which need not be the one the tour picks

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

If an attached step's element isn't there when the step shows, the step waits aside in the bottom right corner with its text (bottom left while a dialog is open). The page stays usable, and the step moves to the element as soon as it appears; **Next** still goes on. See [Steps that wait for the user](../admin/managing-steps.md#steps-that-wait-for-the-user).

## Step Identifier

The **ID** field is auto-generated for new steps (timestamp-based, e.g., `new_1731600000000`) and is used internally for tracking and ordering. It's not editable after creation. Stable IDs are important because:

- Step order is tracked by ID, not position (since v1.0.6) — enable/disable after reordering works correctly
- Import/export references steps by ID
- Telemetry events reference the step ID

## See Also

- [Managing Tour Steps](../admin/managing-steps.md) — Step CRUD
- [Guided Tours](guided-tours.md) — How steps render
- [Theme Support](theme-support.md) — CSS variable inheritance
- [Best Practices](../admin/best-practices.md) — Content design recommendations
