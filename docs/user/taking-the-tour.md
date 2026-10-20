# Taking the Tour

This guide explains how to navigate the IntroVox tour, what the tour window contains, the difference between centered and attached steps, and steps that ask you to do something.

## The Tour Window

Each step shows:

**Header**
- **Title** — what this step is about (e.g., `📁 Files`)
- **Close button (✕)** — exit the tour without disabling it permanently

**Content**
- **Description** — information about the feature
- **Helpful tips** — best practices and shortcuts
- **Image or video** — some steps show one above the text
- **Visual highlights** — important UI elements are outlined

**Footer**
- **Back** — return to the previous step
- **Next** / **Done** — continue, or finish on the last step

## Navigating Through Steps

### Moving Forward

- Click **Next**, or press the right arrow key (`→`)

### Going Back

- Click **Back**, or press the left arrow key (`←`)

### Exiting

- Click **✕** in the top right
- Or press `Escape`
- Closing this way does **not** switch tours off. This browser remembers it, so the welcome tour doesn't start by itself here again; in another browser or on another device it does

## Highlighted Elements

When a step highlights a specific part of Nextcloud's interface:

- The element has an **outline** in your theme's colour
- A **blinking arrow** points from the step at the element
- The rest of the screen is slightly **dimmed**

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

### Steps That Wait

Sometimes the element a step is about isn't on the page yet, for example because you still have to open or create something. The step then waits aside in the bottom right corner with its text (bottom left while a dialog is open, so it stays clear of the dialog's buttons). The page stays usable, and the step moves to the element as soon as it appears, however long you take. **Next** still goes on without it.

## Steps That Ask You to Do Something

![A step that asks you to click, with the outline and the arrow](../screenshots/tour-step.png)

Some steps let you try things instead of reading about them. Tours for apps use this a lot. What you make in them is real: the folder, conversation or card stays yours.

- **Click:** the step says "Click the highlighted element to continue." and has no **Next** button. Click the element, and the tour goes on by itself, also when the click opens another app.
- **Fill in:** the step says "Fill in the highlighted field to continue." **Next** works once the field has text, such as the name of a new conversation.

If the element is not on the page, **Next** works as usual, so you never get stuck.

## Images and Videos

A step can show an image, GIF or video above its text. Anything that moves has a pause button, and stands still if your system is set to reduce motion. A video with a play button only starts when you click play.

## Completing vs. Closing

There are three ways to leave the tour, with different consequences:

| Action | Effect |
|---|---|
| **✕ Close** | Tour closes; this browser remembers it, so it doesn't start by itself here again, but does in another browser |
| **Done** (last step) | Tour marked complete; won't auto-start again, but you can restart from personal settings |
| **Skip and don't show again** (first step) | Immediately disables auto-start; same effect as completing |

This table is about the welcome tour. **Done** and **Skip and don't show again** only end the welcome tour; tours for apps still start the first time you open their app.

A tour for an app starts by itself only once, so however you leave it, it doesn't start by itself again. Its first step has **Skip** instead of **Skip and don't show again**.

To take a tour again later, see [Personal Settings](personal-settings.md).

## See Also

- [Overview](overview.md) — What IntroVox is
- [Personal Settings](personal-settings.md) — Restart and disable preferences
- [Keyboard Navigation](keyboard-navigation.md) — Shortcuts
- [Mobile Experience](mobile.md) — On phones and tablets
