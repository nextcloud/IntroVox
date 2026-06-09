# User Troubleshooting

Common issues users experience with IntroVox and how to resolve them. For admin-side issues, see the [Admin Troubleshooting](../admin/troubleshooting.md).

## Tour Not Starting

**Problem:** The tour doesn't appear on first login.

**Try:**

1. Wait 2–3 seconds — the tour starts automatically after a short delay
2. Refresh the page (`Ctrl+R` / `Cmd+R`)
3. Make sure you're on the **Dashboard** page (that's where the tour starts)
4. Try starting manually from **Personal Settings → IntroVox → Restart tour now**

If the tour still doesn't appear, your administrator may have disabled it for everyone. Contact them.

## Steps Are Missing or Skipped

**Problem:** Some steps don't show during the tour.

**This is usually normal.** Possible reasons:

- The Nextcloud app for that step isn't installed
- Your administrator disabled certain steps
- Some UI elements aren't visible in your view
- The step is restricted to specific user groups, and you're not in one of them

The tour automatically shows only the steps relevant to your setup and role.

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

This is expected if you closed the tour with the **✕** button instead of completing it, or if your browser is clearing localStorage between sessions.

**Solutions:**

- Complete the tour fully (click **Done** on the last step), or
- Click **Skip and don't show again** on the first step, or
- Check **"Permanently disable the introduction tour"** in **Personal Settings → IntroVox**

## Previously-Shown Steps Stay Visible Behind the Current Step (v1.6.1 fix)

**Problem:** Each new step adds to a stack — old steps remain visible underneath the current one.

This was a bug introduced in v1.4.0 and fixed in v1.6.1. If you're seeing it, ask your administrator to upgrade IntroVox to v1.6.1 or later.

## See Also

- [FAQ](faq.md) — Common questions
- [Personal Settings](personal-settings.md) — Restart and disable
- [Admin Troubleshooting](../admin/troubleshooting.md) — If you're an administrator
