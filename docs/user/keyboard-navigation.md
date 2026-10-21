# Keyboard Navigation

IntroVox is fully accessible via keyboard.

## Navigation Shortcuts

| Key | Action |
|---|---|
| `→` (right arrow) | Go to the next step; not on a step that waits for you to click its element or fill in its field, just like its **Next** button |
| `←` (left arrow) | Go to the previous step |
| `Escape` | Close the tour |
| `Tab` | Move focus between the step's buttons and links |
| `Enter` or `Space` | Activate the focused button |

The keys work while the step has focus, which it gets when it shows. On a video or its pause button, the arrow keys and `Space` control the video instead.

## Accessibility Features

### Screen Reader Support

- All steps have proper ARIA labels
- Headings, content, and buttons are semantically marked up
- Works with popular screen readers (JAWS, NVDA, VoiceOver)

### Focus Indicators

- A clear visible outline shows which button is currently focused
- Use `Tab` to move between Back, Next/Done, and Close

### High Contrast Mode

The tour automatically adapts to your system's high-contrast settings, using enhanced borders and colors for better visibility.

### Reduced Motion

If your system has the "reduce motion" accessibility preference enabled, IntroVox disables its animations to avoid triggering motion sensitivity. The arrow that points at an element and the outline around it stay still, GIFs and videos don't play by themselves (use their play button), and the tour jumps to a step instead of scrolling.

## See Also

- [Taking the Tour](taking-the-tour.md) — Tour navigation overview
- [Mobile Experience](mobile.md) — Touch-based interaction
- [Personal Settings](personal-settings.md) — Restart and preferences
