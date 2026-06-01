# User FAQ

Common questions from IntroVox users.

## General

### Do I have to take the tour?

No, it's optional. You can skip it or disable it permanently at any time.

### How long does the tour take?

Usually 2–5 minutes, depending on how many steps your administrator configured.

### Can I pause the tour and continue later?

Yes. Click **✕** to close it. Next time you log in, the tour starts from the beginning again. If you want to keep your spot, your best option is to finish it in one sitting.

### Will I see the tour every time I log in?

Only until you complete it or choose **Skip and don't show again**. After that, it won't auto-start.

## Content

### Why don't I see all the features mentioned in the tour?

A few possible reasons:

- Your Nextcloud instance might not have all apps installed
- Your administrator may have configured certain steps for specific groups (you're not in one)
- Steps with missing UI elements are automatically skipped

The tour shows only what's relevant to you.

### Can I customize what the tour shows?

No — only administrators can customize tour content. You can disable the tour if it's not useful to you.

### Is the tour updated when Nextcloud adds new features?

Your administrator decides what's in the tour. After major Nextcloud upgrades they may use **"Show wizard to all users"** to give everyone an updated tour.

## Technical

### Does the tour work offline?

No, you need an active connection to Nextcloud to use it.

### What browsers are supported?

All modern browsers: Chrome, Firefox, Safari, Edge (latest versions).

### Does the tour collect any data about me?

No personal data is collected. Only basic preferences (completed/disabled flags) are stored locally in your browser and on the Nextcloud server.

### Can I use the tour with screen readers?

Yes — IntroVox is designed to be accessible and works with JAWS, NVDA, and VoiceOver. See [Keyboard Navigation](keyboard-navigation.md).

## Privacy

### Where is my tour preference stored?

In two places:

1. **Your browser's localStorage** — completion status
2. **Nextcloud server** — permanent-disable preference (in the per-user preferences table)

### What happens to my data if I disable the tour?

Only a single preference flag is stored on the server. No personal information or tour-progress data is kept.

### Can my administrator see if I completed the tour?

Administrators can see aggregate telemetry (anonymized user counts and completion events, since v1.4.x), but not individual user progress.

## See Also

- [Overview](overview.md)
- [Taking the Tour](taking-the-tour.md)
- [Personal Settings](personal-settings.md)
- [Troubleshooting](troubleshooting.md)
- [Tips for Getting the Most Out of Nextcloud](tips.md)
