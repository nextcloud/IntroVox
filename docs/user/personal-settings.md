# Personal Settings

You can manage your IntroVox tour preferences at any time from your personal settings: the welcome tour you get after your first login, and any tours your administrator made for apps.

![IntroVox personal settings panel](../screenshots/personal-settings.png)

## Accessing Your IntroVox Settings

1. Click your **profile picture** or **username** in the top right
2. Select **Tours**, just above **Help**

Or: **Personal Settings**, then **IntroVox** in the left sidebar. Your administrator can hide the **Tours** entry, and it is also gone while tours are switched off for everyone; the page is always there.

## Available Options

In your personal settings you can:

- **Start tours by themselves** — switch this off and no tour starts automatically any more
- **Restart the tour** — see the welcome tour again
- **Start a tour for an app** — under **Tours**, when your administrator has made any

## Restarting the Tour

### Method 1 — From Personal Settings

1. Navigate to **Personal Settings → IntroVox**
2. Click **Restart tour now**
3. You're taken to your start page
4. The tour starts automatically

### Method 2 — Browser Console (Advanced)

1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Type:
   ```js
   window.introVox.start()
   ```
4. Press **Enter**

This starts the welcome tour. It works only when you're already logged in and on a Nextcloud page.

### When to Restart

- After a major Nextcloud update (new features may be added to the tour)
- When learning Nextcloud for a project or new role
- To refresh your knowledge after not using Nextcloud for a while
- To show Nextcloud to a colleague or friend

## Tours for Apps

Besides the welcome tour, your administrator can make a short tour for an app, such as Talk, or for another page of Nextcloud. Such a tour starts by itself the first time you open that app, once; it doesn't start again on another browser or device. It never starts on top of the welcome tour: if you haven't had the welcome tour yet, you get that first, and the app's tour on a later visit.

Your administrator decides when such a tour starts by itself: for example only for new accounts, only a number of days after your first login, or only between two dates. A tour can also start "anywhere": as a tip on whichever page you open next. However it is set up, you can always start it yourself from this page.

When there are tours like this for you, **Personal Settings → IntroVox** lists them under **Tours**. Each one shows the app's icon, its name, and **Seen** or **Not seen yet**. Click **Start** (or **Start again**) to open the app and start its tour. This works even when **Start tours by themselves** is off.

## Stopping Tours from Starting by Themselves

### All Tours

1. **Personal Settings → IntroVox**
2. Switch off **Start tours by themselves**; the setting is saved straight away

When it is off, no tour starts by itself: not the welcome tour, and not the tours for apps. You can still start each tour by hand from the same page. The switch is on by default.

> If you had switched the tour off in your personal settings before IntroVox had tours for apps, **Start tours by themselves** is off for you after that update. Switch it on if you do want tours for apps.

### Only the Welcome Tour

- On the first step, click **Skip and don't show again**, or
- On the last step, click **Done**

Both mark the welcome tour as done for you. They don't switch off other tours: tours for apps still start the first time you open their app.

In a tour for an app, the first step has a **Skip** button instead. That tour won't start by itself again.

> **Note:** You can still restart the welcome tour from **Personal Settings → IntroVox** at any time. Your administrator can also show the welcome tour to everyone again; you then get it on your next login, unless you switched off **Start tours by themselves**.

## Temporary Dismissal

If you're busy and want to skip the welcome tour for now:

- Click **✕** in the top-right corner
- The tour closes and counts as seen in this browser; it starts again in another browser, and you can start it yourself from these settings

This is useful if you're interrupted and want to complete it later.

A tour for an app doesn't come back by itself once it has started, also not after **✕**. Start it again from **Tours** in your personal settings.

## "Tour Unavailable" Message

You might see this message in personal settings instead of the restart button:

### "The introduction tour is currently disabled by your administrator"

Your Nextcloud administrator turned off tours for all users. No tour starts, neither the welcome tour nor a tour for an app, and you can't start one by hand. Contact your administrator if you'd like to see it.

> Earlier IntroVox versions also showed a "not available in your language" message when an admin had restricted languages. Since v1.7.0 the tour is available in every Nextcloud-supported language automatically (via Transifex), so this message no longer exists.

## See Also

- [Taking the Tour](taking-the-tour.md) — How to navigate the tour
- [Troubleshooting](troubleshooting.md) — When things don't work
- [FAQ](faq.md) — Common questions
