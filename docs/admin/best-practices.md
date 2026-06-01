# Best Practices

Recommendations for designing, maintaining, and operating IntroVox tours.

## Content Design

### Keep Steps Short and Focused

- **5–8 steps is ideal** for most tours; more than 10 starts to feel like a chore
- **Maximum 3–5 lines** of text per step
- **One concept per step** — don't combine unrelated features
- **Use bullet lists** for multiple items rather than long paragraphs

### Write for Beginners

- ✅ Welcoming, friendly tone
- ✅ Practical examples ("Click the **Files** icon to start uploading")
- ✅ Highlight time-saving features (drag-and-drop, keyboard shortcuts)
- ❌ Avoid jargon ("federated sharing", "OCS API")
- ❌ Don't reference features that might not be installed (e.g., Calendar if you don't bundle it)

### Use Clear Titles

- Descriptive and recognizable: `📁 Upload Files`, `📅 Manage Your Calendar`
- 1–5 words is ideal
- Emoji are fully supported and help users scan

## Technical Reliability

### Use Multiple CSS Selectors as Fallbacks

Since v1.0.6, default steps use comma-separated selectors:

```css
[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]
```

This prevents steps from being skipped when a single selector breaks after a Nextcloud upgrade.

### Avoid Language-Specific Selectors

Don't use:

```css
button[aria-label="Unified search"]   /* breaks in non-English */
```

Use CSS classes that work across languages:

```css
.unified-search__trigger, .header-menu__trigger
```

### Save After Reordering

Drag-and-drop reorders are in-memory until you click **💾 Save changes**. Always save before switching languages or closing the admin page — unsaved changes trigger a warning, but it's easy to dismiss accidentally.

### Test on Different Browsers

CSS selector behavior can vary slightly. Verify in Chrome, Firefox, Safari, and Edge before rolling out to users.

## Language Strategy

### Start with One Language

Perfect the English version first; add other languages as translations are ready. It's easier to maintain one well-tested tour than five mediocre ones.

### Maintain Structural Consistency

Keep the same step count and topic order across languages — makes import/export round-trips and translator handoffs predictable.

### Use Native Speakers

For each language, have translations reviewed by a native speaker. Auto-translated step content reads poorly in onboarding contexts and undermines the welcoming tone.

### Only Enable Needed Languages

Each enabled language is a step list to maintain. Don't enable Swedish if no one in your org speaks Swedish — disabling it cleanly hides the tour from those users with a clear message.

## Operational Maintenance

### Back Up Before Major Changes

Use the **Export** feature before:

- Resetting to defaults
- Bulk-editing many steps
- Switching to a new step structure

Commit exports to git so you can roll back.

### Review Quarterly

Schedule a quarterly check:

- Are the steps still accurate after Nextcloud upgrades?
- Are CSS selectors still matching?
- Did your team install new apps that should be in the tour?
- Are users completing the tour or skipping early?

### Update After Nextcloud Upgrades

After every major Nextcloud version:

- Verify CSS selectors still hit the right elements
- Test the tour with a fresh user account
- Add steps for major new Nextcloud features (e.g., new app, new dashboard widget)

### Communicate with Users

- Mention IntroVox in your internal onboarding documentation
- Refer new hires to it explicitly
- After a major content update, consider using **Show wizard to all users** with a heads-up in your company comms channel

## Content Quality

### DO

- ✅ Welcoming, friendly tone
- ✅ Concrete examples and use cases
- ✅ Highlight time-saving features
- ✅ Short paragraphs (2–3 sentences)
- ✅ Lists for multiple items
- ✅ Emoji for visual scanning

### DON'T

- ❌ Overwhelm with too much information
- ❌ Use complex technical terms unexplained
- ❌ Reference apps that might not be installed
- ❌ Create steps longer than 150 words
- ❌ Rely on a single CSS selector when a fallback chain is cheap
- ❌ Use absolute positioning that might not exist on every screen size

## See Also

- [Managing Wizard Steps](managing-steps.md) — Step CRUD
- [Customization](../features/customization.md) — HTML, CSS selectors, positioning
- [Troubleshooting](troubleshooting.md) — When things go wrong
