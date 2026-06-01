# Mobile Experience

IntroVox works on phones and tablets — the layout adapts to small screens and touch input.

## Responsive Design

- **Tablets** — full tour experience with a slightly adapted layout
- **Smartphones** — simplified layout optimized for small screens
- **Touch gestures** — tap buttons instead of clicking

## Mobile-Specific Behavior

- **Larger touch targets** — buttons are sized for easy tapping
- **Full-width steps** — steps take up most of the screen for readability
- **Stacked buttons** — Back/Next stack vertically on very narrow screens
- **Internal scrolling for long steps** — since v1.5.0, the body of each step scrolls inside the step container while the header and close button stay pinned. This means you can always reach the **✕** button and the navigation buttons, even on long-content steps.

## Tips

- 📱 Hold your device in **portrait mode** for the best experience
- 📱 Tap **✕** to close the tour if you want to explore first
- 📱 Use the **Back** and **Next** buttons — swipe gestures are not supported

## Known Mobile Issues (Fixed)

Pre-v1.5.0, very long step content on mobile could trap users: the overlay blocked page scroll, but the step itself didn't scroll either, leaving the close button unreachable. This was fixed in v1.5.0 by giving the step a `max-height` (`100dvh - 16px` on mobile), pinning the header/footer, and scrolling the body internally.

If you're still seeing this issue, ask your administrator to upgrade IntroVox to v1.5.0 or later.

## See Also

- [Taking the Tour](taking-the-tour.md) — Tour navigation
- [Keyboard Navigation](keyboard-navigation.md) — Hardware keyboard support (relevant on tablets)
- [Troubleshooting](troubleshooting.md) — When things go wrong
