# User Troubleshooting

Common issues users experience with IntroVox and how to resolve them. For admin-side issues, see the [Admin Troubleshooting](../admin/troubleshooting.md).

## Tour Not Starting

**Problem:** The tour doesn't appear on first login.

**Try:**

1. Wait 2–3 seconds — the tour starts automatically after a short delay
2. Refresh the page (`Ctrl+R` / `Cmd+R`)
3. Open another page, such as Files: the welcome tour starts on the first page you open after logging in, whichever app that is
4. Check that **Start tours by themselves** is on in **Personal Settings → IntroVox**
5. Try starting manually from **Personal Settings → IntroVox → Restart tour now**

If the tour still doesn't appear, your administrator may have disabled it for everyone. Contact them.

## Tour for an App Not Starting

**Problem:** You open an app that has a tour, but the tour doesn't appear.

A tour for an app starts by itself only the first time you open that app, and never on top of the welcome tour: if you haven't had the welcome tour yet, you get that first, and the app's tour on a later visit. To see it (again), go to **Personal Settings → IntroVox**, find it under **Tours** and click **Start** or **Start again**. If the app's tour isn't listed there, it isn't meant for you or your administrator hasn't switched it on.

## Steps Are Missing

**Problem:** Some steps don't show during the tour.

**This is usually normal.** Possible reasons:

- The step belongs to an app you can't open, or that isn't installed
- Your administrator disabled certain steps
- The step is restricted to specific user groups, and you're not in one of them

The tour automatically shows only the steps relevant to your setup and role.

## A Step Waits in the Corner

**Problem:** A step stands in the bottom right corner (bottom left while a dialog is open) instead of pointing at something.

The step is waiting for the part of the page it is about. Often that only appears once you have done something, such as creating a conversation or opening a file's details. The page stays usable: do what the step says, and the step moves to it as soon as it appears. **Next** goes on without it.

## No Next Button, or Next Stays Off

**Problem:** A step has no **Next** button, or you can't click it.

The step asks you to do something:

- "Click the highlighted element to continue.": click the part of the page with the outline and the blinking arrow. The tour goes on by itself.
- "Fill in the highlighted field to continue.": type something in the field. **Next** works once the field has text.

If the element is not on the page, **Next** works as usual, so you never get stuck.

## Text Not in My Language

**Problem:** The tour shows English text but you selected a different Nextcloud language.

**Most likely cause:** the tour copy hasn't been translated for your language on [Transifex](https://www.transifex.com/nextcloud/nextcloud/) yet. IntroVox falls back to English in that case so you always get readable text. Anyone can contribute translations on Transifex — once your language has translated strings there, the next Nextcloud sync ships them to IntroVox automatically.

**Other things to try:**

1. Check your Nextcloud language: **Personal Settings → Language**
2. Hard-refresh the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. If your admin has authored a custom override for your language, ask them to verify it's saved

## Tour Window Is Too Small or Large

**Problem:** The tour window doesn't fit properly on your screen.

**Try:**

1. **Zoom out** if the window is too large: `Ctrl+−` / `Cmd+−`
2. **Zoom in** if text is too small: `Ctrl++` / `Cmd++`
3. Try a different browser (Chrome, Firefox, Safari, Edge are officially supported)

## Can't Close the Tour

**Problem:** The close button (✕) doesn't work.

**Try:**

1. Press **Escape** on your keyboard
2. Refresh the page (`Ctrl+R` / `Cmd+R`)
3. On the first step, click **Skip and don't show again**

## Tour Appears Every Time I Log In

**Problem:** You've already gone through the tour, but it keeps appearing.

Closing the welcome tour with **✕** or Escape is only remembered in this browser. The tour comes back in another browser or on another device, and in this browser too if it clears its site data between sessions, as a private window does.

**Solutions:**

- Complete the tour fully (click **Done** on the last step), or
- Click **Skip and don't show again** on the first step, or
- Switch off **Start tours by themselves** in **Personal Settings → IntroVox** (then no tour starts by itself, also not tours for apps)

## Previously-Shown Steps Stay Visible Behind the Current Step (v1.6.1 fix)

**Problem:** Each new step adds to a stack — old steps remain visible underneath the current one.

This was a bug introduced in v1.4.0 and fixed in v1.6.1. If you're seeing it, ask your administrator to upgrade IntroVox to v1.6.1 or later.

## See Also

- [FAQ](faq.md) — Common questions
- [Personal Settings](personal-settings.md) — Restart, start tours for apps, stop tours starting by themselves
- [Admin Troubleshooting](../admin/troubleshooting.md) — If you're an administrator
