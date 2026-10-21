# User FAQ

Common questions from IntroVox users.

## General

### Do I have to take the tour?

No, it's optional. You can skip it at any time, or switch off **Start tours by themselves** in **Personal Settings → IntroVox** so no tour starts automatically.

### How long does the tour take?

Usually 2–5 minutes, depending on how many steps your administrator configured.

### Can I pause the tour and continue later?

You can close it with **✕** and start it again later from **Personal Settings → IntroVox**: **Restart tour now** for the welcome tour, **Start again** for a tour for an app. It starts at the first step: the tour doesn't keep your place, so it is easiest to finish it in one sitting.

### Will I see the tour every time I log in?

No. Once you complete the welcome tour or choose **Skip and don't show again**, it doesn't start by itself again. Closing it with **✕** stops it in this browser only. A tour for an app starts by itself once, and your administrator can have it start later: only for new accounts, a number of days after your first login, or only between two dates.

### Why did a tour start when I opened an app?

Your administrator made a short tour for that app. It starts by itself once, the first time you open the app, unless your administrator set it to start only for new accounts, a number of days after your first login, or between two dates. A tour that starts "anywhere" comes as a tip on whichever page you open next. To see a tour again, go to **Personal Settings → IntroVox** and click **Start again** next to it under **Tours**. **Tours** in your user menu leads there too.

### Someone sent me a link to a tour. What does it do?

It opens the tour's app and starts the tour there, also if you saw it before or switched off **Start tours by themselves**. If you're not logged in, you log in first. If the tour isn't meant for you, you land on your start page without a tour.

### What is the "Getting started" list on my Dashboard?

Your administrator added a list of first things to do in Nextcloud, such as uploading a file or adding a profile picture. Each task links to where you do it, and ticks itself off once you have done it. With **Put it on every Dashboard**, it appears by itself only for new accounts and for everyone who never arranged their Dashboard; anyone else adds it under **Customize** on their Dashboard. Don't need it? Remove it there; you can add it back the same way.

## Content

### Why don't I see all the features mentioned in the tour?

A few possible reasons:

- Your Nextcloud instance might not have all apps installed
- Your administrator may have configured certain steps for specific groups (you're not in one)
- Steps for an app you can't open are left out. A step whose element isn't there yet waits in the corner instead; see [Steps that wait](taking-the-tour.md#steps-that-wait)

The tour shows only what's relevant to you.

### Can I customize what the tour shows?

No — only administrators can customize tour content. If the tours aren't useful to you, switch off **Start tours by themselves**.

### Is the tour updated when Nextcloud adds new features?

Your administrator decides what's in the tour. After major Nextcloud upgrades they may use **Show again to everyone** to give everyone an updated tour. If you switched off **Start tours by themselves**, it doesn't start by itself for you; you can still restart it from your personal settings.

## Technical

### Does the tour work offline?

No, you need an active connection to Nextcloud to use it.

### What browsers are supported?

All modern browsers: Chrome, Firefox, Safari, Edge (latest versions).

### Does the tour collect any data about me?

Only what IntroVox needs to know which tours to show you, and how far you got, kept with your Nextcloud account; see below. Your administrator sees only totals.

### Can I use the tour with screen readers?

Yes — IntroVox is designed to be accessible and works with JAWS, NVDA, and VoiceOver. See [Keyboard Navigation](keyboard-navigation.md).

## Privacy

### Where is my tour preference stored?

In two places:

1. **Your browser's localStorage** — whether you finished or closed the welcome tour in this browser
2. **Nextcloud server**, in your own preferences:
   - for the welcome tour and each tour for an app: whether you started, finished or skipped it, and when
   - how far you got the last time a tour started by itself
   - your **Start tours by themselves** setting
   - for the **Getting started** list on the Dashboard: the tasks your administrator added that you opened from the list, and that you uploaded a first file

### What happens to my data if I disable the tour?

Switching off **Start tours by themselves** only stops tours from starting by themselves. What is listed above stays, so the tours you have seen stay marked as seen. It is deleted with your account, and for one tour when your administrator deletes that tour.

### Can my administrator see if I completed the tour?

Not in IntroVox. Its **Statistics** pane shows totals per tour only: how many people started, finished and skipped it, and how many got to each step. Nobody can see there how far you in particular got. If your administrator shares anonymous usage statistics, those are totals for the whole server too.

## See Also

- [Overview](overview.md)
- [Taking the Tour](taking-the-tour.md)
- [Personal Settings](personal-settings.md)
- [Troubleshooting](troubleshooting.md)
- [Tips for Getting the Most Out of Nextcloud](tips.md)
