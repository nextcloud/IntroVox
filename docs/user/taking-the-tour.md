# Taking the Tour

This guide explains how to navigate the IntroVox tour, what the tour window contains, and the difference between centered and attached steps.

## The Tour Window

Each step shows:

**Header**
- **Title** — what this step is about (e.g., `📁 Files`)
- **Close button (✕)** — exit the tour without disabling it permanently

**Content**
- **Description** — information about the feature
- **Helpful tips** — best practices and shortcuts
- **Visual highlights** — important UI elements are outlined

**Footer**
- **Back** — return to the previous step
- **Next** / **Done** — continue, or finish on the last step

## Navigating Through Steps

### Moving Forward

- Click **Next**, or press `Enter`

### Going Back

- Click **Back**, or press `Backspace`

### Exiting

- Click **✕** in the top right
- Or press `Escape`
- Closing this way does **not** disable the tour — it will appear again next login

## Highlighted Elements

When a step highlights a specific part of Nextcloud's interface:

- The element has a **glowing blue border**
- The rest of the screen is slightly **dimmed**
- You can still **click** on the highlighted element if you want to try it

Example: when the tour shows the Files app, the Files menu item is highlighted so you can easily find it later.

## Centered vs. Attached Steps

You'll see two kinds of steps:

### Centered Steps

- Appear in the middle of your screen
- Used for general information, welcome, and conclusion
- No specific element is highlighted

### Attached Steps

- Appear next to a specific UI element
- Point to features you should know about
- Show you exactly where to find things

If a target element doesn't exist (e.g., your Nextcloud doesn't have that app installed), the tour automatically falls back to a centered display rather than skipping the step (since v1.4.1).

## Completing vs. Closing

There are three ways to leave the tour, with different consequences:

| Action | Effect |
|---|---|
| **✕ Close** | Tour closes; will reappear on next login |
| **Done** (last step) | Tour marked complete; won't auto-start again, but you can restart from personal settings |
| **Skip and don't show again** (first step) | Immediately disables auto-start; same effect as completing |

To take the tour again later, see [Personal Settings](personal-settings.md).

## See Also

- [Overview](overview.md) — What IntroVox is
- [Personal Settings](personal-settings.md) — Restart and disable preferences
- [Keyboard Navigation](keyboard-navigation.md) — Shortcuts
- [Mobile Experience](mobile.md) — On phones and tablets
