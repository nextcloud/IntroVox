# IntroVox - User Manual

**Version 1.2.0** | Interactive Onboarding Tour for Nextcloud

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Taking the Tour](#taking-the-tour)
4. [Personal Settings](#personal-settings)
5. [Restarting the Tour](#restarting-the-tour)
6. [Disabling the Tour](#disabling-the-tour)
7. [Keyboard Navigation](#keyboard-navigation)
8. [Mobile Experience](#mobile-experience)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Introduction

Welcome to **IntroVox** - your personal guide to Nextcloud!

IntroVox is an interactive tour that helps you discover and learn about Nextcloud's most important features when you first log in. Think of it as a friendly companion that shows you around your new cloud workspace.

### What You'll Learn

The tour will guide you through:
- 📁 **Files** - How to upload, share, and manage your files
- 📅 **Calendar** - Organizing your schedule and appointments
- 🔍 **Search** - Finding files and information quickly
- ⚙️ **Settings** - Customizing Nextcloud to your preferences
- And more features depending on your administrator's configuration

### How Long Does It Take?

The tour typically takes **2-5 minutes** to complete. You can:
- ✅ Complete it in one go
- ⏸️ Close it and come back later
- ⏭️ Skip it entirely if you prefer to explore on your own

---

## Getting Started

### First Login Experience

When you log in to Nextcloud for the first time, IntroVox will automatically start after a few seconds. You'll see a welcome message with two options:

1. **Start tour** - Begin the interactive guide (recommended for new users)
2. **Skip and don't show again** - Close the tour and prevent it from showing in the future

### If the Tour Doesn't Appear

The tour might not show automatically if:
- Your administrator has disabled it globally
- Your language is not enabled by your administrator (IntroVox supports 6 languages: EN, NL, DE, DA, FR, SV)
- You previously disabled it permanently in your settings
- You already completed the tour (it only shows once unless you restart it)

**Don't worry!** You can always start it manually from your personal settings (see [Restarting the Tour](#restarting-the-tour)).

---

## Taking the Tour

### Understanding the Tour Window

Each step in the tour shows:

**Header:**
- **Title** - What this step is about (e.g., "📁 Files")
- **Close button (✕)** - Exit the tour without disabling it permanently

**Content:**
- **Description** - Information about the feature
- **Helpful tips** - Best practices and shortcuts
- **Visual highlights** - Important UI elements will be outlined

**Footer:**
- **Back** - Return to the previous step
- **Next / Done** - Continue to next step or finish the tour

### Navigating Through Steps

**Moving Forward:**
- Click **Next** to proceed to the next step
- Or press `Enter` on your keyboard

**Going Back:**
- Click **Back** to review the previous step
- Or press `Backspace` on your keyboard

**Exiting:**
- Click the **✕** button in the top-right corner
- Or press `Escape` on your keyboard
- This closes the tour but doesn't disable it - it will show again next time you log in

### Highlighted Elements

When a step highlights a specific part of Nextcloud's interface:
- The element will have a **glowing blue border**
- The rest of the screen will be slightly **dimmed**
- You can still **click** on the highlighted element if you want to try it

**Example:** When showing the Files app, the Files menu item will be highlighted so you can easily find it.

### Centered vs. Attached Steps

You'll notice two types of steps:

**Centered Steps:**
- Appear in the middle of your screen
- Used for general information and welcome messages
- No specific element is highlighted

**Attached Steps:**
- Appear next to a specific UI element
- Point to features you should know about
- Show you exactly where to find things

---

## Personal Settings

### Accessing Your IntroVox Settings

You can manage your tour preferences at any time:

1. Click your **profile picture** or **username** (top-right corner)
2. Select **Personal Settings**
3. Scroll down to find **IntroVox** in the left sidebar
4. Click **IntroVox** to open tour settings

### Available Options

In your personal settings, you can:

- **Restart the tour** - See the guided tour again
- **Permanently disable the tour** - Never show the tour again (even after updates)

### If the Tour Is Unavailable

You might see one of these messages:

**"The introduction tour is currently disabled by your administrator"**
- Your Nextcloud administrator has turned off the tour for all users
- Contact your administrator if you'd like to see it

**"The introduction tour is not available in your language"**
- Your language is not enabled by your administrator
- IntroVox supports English, Dutch, German, Danish, French, and Swedish
- Contact your administrator to enable your language in Admin Settings → IntroVox
- Administrators can also add new languages via Transifex translations

---

## Restarting the Tour

Want to see the tour again? Here's how:

### Method 1: From Personal Settings

1. Navigate to **Personal Settings → IntroVox**
2. Click the **🔄 Restart tour now** button
3. You'll be redirected to the dashboard
4. The tour will start automatically

### Method 2: Browser Console (Advanced)

If you're comfortable with browser tools:

1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Type: `window.introVox.start()`
4. Press **Enter**

**Note:** This method only works if you're already logged in and on a Nextcloud page.

### When to Restart the Tour

Good times to take the tour again:
- ✅ After a major Nextcloud update (new features may be added)
- ✅ When learning Nextcloud for a project or work
- ✅ To refresh your knowledge after not using Nextcloud for a while
- ✅ To show Nextcloud to a colleague or friend

---

## Disabling the Tour

### Temporary Dismissal

If you're busy and want to skip the tour for now:

1. Click the **✕** (close) button
2. The tour will close but **will show again** next time you log in
3. This is useful if you're interrupted and want to complete it later

### Permanent Disabling

If you never want to see the tour again:

**Method 1: From the Welcome Step**
- On the first step of the tour
- Click **Skip and don't show again**
- The tour will be permanently disabled

**Method 2: From Personal Settings**
1. Navigate to **Personal Settings → IntroVox**
2. Check the box: **"Permanently disable the introduction tour"**
3. Click **💾 Save settings**

### ⚠️ Important Notes

Once you permanently disable the tour:
- It will **never show automatically again**, even after Nextcloud updates
- You can still restart it manually from Personal Settings
- Your administrator can override this setting and force-show the tour to all users

---

## Keyboard Navigation

IntroVox is fully accessible via keyboard:

### Navigation Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Go to next step |
| `Backspace` | Go to previous step |
| `Escape` | Close the tour |
| `Tab` | Move focus between buttons |
| `Space` | Activate focused button |

### Accessibility Features

- **Screen reader support** - All steps have proper labels
- **Focus indicators** - Clear outline shows which button is active
- **High contrast mode** - Automatically adapts to your system settings
- **Reduced motion** - Animations disabled if you have motion sensitivity settings enabled

---

## Mobile Experience

IntroVox works great on mobile devices!

### Responsive Design

- **Tablets** - Full tour experience with adapted layout
- **Smartphones** - Simplified layout optimized for small screens
- **Touch gestures** - Tap buttons instead of clicking

### Mobile-Specific Features

- **Larger touch targets** - Buttons are sized for easy tapping
- **Full-width steps** - Steps take up most of the screen for better readability
- **Stacked buttons** - Navigation buttons stack vertically on very small screens

### Tips for Mobile

- 📱 Hold your device in **portrait mode** for best experience
- 📱 Tap the **✕** button to close the tour if you want to explore first
- 📱 Use the **Back** and **Next** buttons - swipe gestures are not supported

---

## Troubleshooting

### Tour Not Starting

**Problem:** The tour doesn't appear on first login

**Solutions:**
1. Wait 2-3 seconds - the tour starts automatically after a short delay
2. Refresh the page (Ctrl+R / Cmd+R)
3. Check if you're on the **Dashboard** page (tour starts there)
4. Try starting manually from Personal Settings → IntroVox

### Steps Are Missing or Skipped

**Problem:** Some steps don't show during the tour

**Possible reasons:**
- The Nextcloud app for that step isn't installed
- Your administrator disabled certain steps
- Some UI elements might not be visible in your view
- The step is only visible to certain user groups (your administrator may have configured role-based steps)

**This is normal** - the tour automatically skips steps that aren't relevant to your setup or your user role.

### Text Not in My Language

**Problem:** Tour shows English text but I selected a different language

**Solutions:**
1. Check your Nextcloud language: **Personal Settings → Language**
2. Contact your administrator - they may need to enable your language
3. Try a hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

### Tour Window Is Too Small/Large

**Problem:** The tour window doesn't fit properly on screen

**Solutions:**
1. **Zoom out** if window is too large: Ctrl+Minus (Windows) or Cmd+Minus (Mac)
2. **Zoom in** if text is too small: Ctrl+Plus (Windows) or Cmd+Plus (Mac)
3. Try a different browser (Chrome, Firefox, Safari are officially supported)

### Can't Close the Tour

**Problem:** Close button (✕) doesn't work

**Solutions:**
1. Press **Escape** on your keyboard
2. Refresh the page (Ctrl+R / Cmd+R)
3. Click **Skip and don't show again** on the first step

### Tour Appears Every Time I Log In

**Problem:** I've completed the tour but it keeps showing

**This is expected behavior if:**
- You clicked the ✕ button instead of completing the tour
- You haven't clicked **Done** on the final step
- Your browser is clearing localStorage

**Solution:**
- Complete the tour fully (click **Done** on last step), OR
- Use **Skip and don't show again** button, OR
- Permanently disable in Personal Settings → IntroVox

---

## FAQ

### General Questions

**Q: Do I have to take the tour?**
A: No, it's completely optional! You can skip it or disable it permanently at any time.

**Q: How long does the tour take?**
A: Usually 2-5 minutes, depending on how many steps your administrator has configured.

**Q: Can I pause the tour and continue later?**
A: Yes! Click the ✕ button to close it. Next time you log in, it will start from the beginning again.

**Q: Will I see the tour every time I log in?**
A: Only until you complete it or choose "Skip and don't show again". After that, it won't show automatically.

### Content Questions

**Q: Why don't I see all the features mentioned in the tour?**
A: There are several reasons: your Nextcloud instance might not have all apps installed, or your administrator may have configured certain steps to only show to specific user groups (e.g., admin-specific steps for administrators only). The tour automatically shows only the steps relevant to you.

**Q: Can I customize what the tour shows me?**
A: No, only administrators can customize the tour content. However, you can disable it if it's not relevant to you.

**Q: Is the tour updated when Nextcloud adds new features?**
A: Yes! Your administrator can update the tour to include new features. You might see it again after major updates.

### Technical Questions

**Q: Does the tour work offline?**
A: No, you need an active internet connection to use Nextcloud and view the tour.

**Q: What browsers are supported?**
A: IntroVox works on all modern browsers: Chrome, Firefox, Safari, and Edge (latest versions).

**Q: Does the tour collect any data about me?**
A: No personal data is collected. Only basic preferences (completed/not completed, enabled/disabled) are stored locally in your browser and on the Nextcloud server.

**Q: Can I use the tour with screen readers?**
A: Yes! IntroVox is designed to be accessible and works with popular screen readers like JAWS, NVDA, and VoiceOver.

### Privacy Questions

**Q: Where is my tour preference stored?**
A: In two places:
1. Your browser's localStorage (for completion status)
2. Nextcloud server (for permanent disable preference)

**Q: What happens to my data if I disable the tour?**
A: Only a single preference flag is stored on the server. No personal information or tour progress data is kept.

**Q: Can my administrator see if I completed the tour?**
A: No, administrators cannot see individual user's tour status. They only see global settings.

---

## Tips for Getting the Most Out of Nextcloud

After completing (or skipping) the tour, here are some tips:

### 1. Explore the App Menu
- Click on different apps in the left sidebar
- Try **Files**, **Calendar**, **Contacts**, **Mail**
- Each app has its own helpful features

### 2. Customize Your Settings
- Go to **Personal Settings** (top-right menu)
- Set up your **email**, **profile picture**, and **language**
- Configure **security** settings like 2-factor authentication

### 3. Connect Your Devices
- Download the **Nextcloud mobile app** (iOS/Android)
- Install the **desktop client** for automatic file sync
- Configure **calendar sync** with your phone

### 4. Learn Keyboard Shortcuts
- `/` - Quick search
- `N` - Create new file (in Files app)
- `U` - Upload files (in Files app)

### 5. Get Help When Needed
- Click the **?** (Help) icon in the top-right
- Visit **Nextcloud Documentation** for detailed guides
- Ask your administrator if you have questions

---

## Need More Help?

### Contact Your Administrator
Your Nextcloud administrator can:
- Enable/disable the tour
- Add support for additional languages
- Customize tour content for your organization
- Help with technical issues

### Nextcloud Community
- **Documentation**: [docs.nextcloud.com](https://docs.nextcloud.com)
- **Community Forum**: [help.nextcloud.com](https://help.nextcloud.com)
- **Video Tutorials**: Search "Nextcloud tutorial" on YouTube

### IntroVox Support
- **Report Issues**: [GitHub Issues](https://github.com/nextcloud/introvox/issues)
- **Feature Requests**: Contact your administrator or submit on GitHub

---

## About IntroVox

**Developed by:** Rik Dekker (rik@shalution.nl)
**Initial idea and feedback:** SURF
**License:** GNU AGPL v3
**Version:** 1.2.0

IntroVox is designed to make your first Nextcloud experience smooth and educational. We hope it helps you feel at home in your new cloud workspace!

---

## Quick Reference Card

### Starting the Tour
- **Automatic**: Wait a few seconds on first login
- **Manual**: Personal Settings → IntroVox → Restart tour now

### During the Tour
- **Next**: Click button or press `Enter`
- **Back**: Click button or press `Backspace`
- **Close**: Click ✕ or press `Escape`

### Managing the Tour
- **Skip permanently**: Click "Skip and don't show again"
- **Disable later**: Personal Settings → IntroVox → Check "Permanently disable"
- **Restart anytime**: Personal Settings → IntroVox → Click "Restart tour now"

### Getting Help
- **Can't see tour?** Check Personal Settings → IntroVox
- **Wrong language?** Check Personal Settings → Language
- **Still stuck?** Contact your administrator

---

*Last updated: January 22, 2026 (v1.2.0)*

**Enjoy your Nextcloud experience! 🚀**
