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

### Preview Before Users See It

Changes are saved the moment you make them, so they reach users on their next tour. Run **Preview tour** after reordering or retargeting steps, and **Test this step** while editing one, to catch a misplaced highlight before your users do. See [Preview](managing-steps.md#preview).

### Test on Different Browsers

CSS selector behavior can vary slightly. Verify in Chrome, Firefox, Safari, and Edge before rolling out to users.

## Language Strategy

### Write the Main Language First

Perfect the tour in its main language first: the steps, their elements and their order. In a tour for an app, users whose language has no steps of its own get that one. Then add the other languages, with **Translate with AI** if a provider for the Nextcloud Assistant is set up: it translates the words and keeps the elements, pages and media. See [Write or Translate Steps with AI](tours.md#write-or-translate-steps-with-ai).

### Maintain Structural Consistency

Keep the same step count and topic order across languages — makes import/export round-trips and translator handoffs predictable.

### Use Native Speakers

For each language, have translations reviewed by a native speaker, also those from **Translate with AI**. You can change every step in its dialog before it is saved. A stiff translation reads poorly in onboarding and undermines the welcoming tone.

### Add Overrides Only Where Needed

The welcome tour and the built-in tours come translated into every language Transifex covers. Each override is a step list you maintain yourself, and it no longer gets new translations of the default steps. Add one only where the defaults don't fit, such as text that names your own cloud, and **Reset** it once you no longer need it. See [Language Management](language-management.md).

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
- After a major content update, consider using **Show again to everyone** on the tour, with a heads-up in your company comms channel

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

- [Managing Tour Steps](managing-steps.md) — Step CRUD
- [Customization](../features/customization.md) — HTML, CSS selectors, positioning
- [Troubleshooting](troubleshooting.md) — When things go wrong
