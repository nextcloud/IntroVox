/**
 * Device and Browser Detection Utilities
 * Detects browser, OS, and device type for showing appropriate PWA installation instructions
 */

import { translate as t } from '@nextcloud/l10n'

export function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase()
  const vendor = navigator.vendor?.toLowerCase() || ''

  if (userAgent.includes('edg/')) return 'edge'
  if (userAgent.includes('chrome') && vendor.includes('google')) return 'chrome'
  if (userAgent.includes('safari') && vendor.includes('apple') && !userAgent.includes('chrome')) return 'safari'
  if (userAgent.includes('firefox')) return 'firefox'
  if (userAgent.includes('opera') || userAgent.includes('opr/')) return 'opera'

  return 'unknown'
}

export function detectOS() {
  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform?.toLowerCase() || ''

  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  if (/mac/.test(platform) || /macintosh/.test(userAgent)) return 'macos'
  if (/win/.test(platform) || /windows/.test(userAgent)) return 'windows'
  if (/linux/.test(platform) || /linux/.test(userAgent)) return 'linux'

  return 'unknown'
}

export function detectDeviceType() {
  const userAgent = navigator.userAgent.toLowerCase()

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile'
  }
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
    return 'tablet'
  }

  return 'desktop'
}

export function isPWAInstallable() {
  // Check if PWA is already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return false
  }

  // Check if PWA installation is supported
  const browser = detectBrowser()
  const os = detectOS()

  // PWA installation support matrix
  const supported = {
    chrome: ['windows', 'macos', 'linux', 'android'],
    edge: ['windows', 'macos', 'linux', 'android'],
    safari: ['ios', 'macos'],
    firefox: ['android'],
    opera: ['windows', 'macos', 'linux', 'android']
  }

  return supported[browser]?.includes(os) || false
}

export function getPWAInstructions() {
  const browser = detectBrowser()
  const os = detectOS()
  const deviceType = detectDeviceType()

  // iOS Safari (iPhone/iPad)
  if (os === 'ios' && browser === 'safari') {
    return {
      icon: '📱',
      title: t('introvox', 'Install Nextcloud on your iPhone/iPad'),
      steps: [
        t('introvox', 'Tap the <strong>Share</strong> icon (square with up arrow) at the bottom'),
        t('introvox', 'Scroll down and tap <strong>"Add to Home Screen"</strong>'),
        t('introvox', 'Tap <strong>Add</strong> in the top right'),
        t('introvox', 'Nextcloud now appears as an app on your home screen!')
      ]
    }
  }

  // macOS Safari
  if (os === 'macos' && browser === 'safari') {
    return {
      icon: '💻',
      title: t('introvox', 'Install Nextcloud on your Mac'),
      steps: [
        t('introvox', 'Click <strong>File</strong> in the menu bar'),
        t('introvox', 'Select <strong>"Add to Dock"</strong>'),
        t('introvox', 'Nextcloud now appears in your Dock as an app!')
      ]
    }
  }

  // Android Chrome/Edge
  if (os === 'android' && (browser === 'chrome' || browser === 'edge')) {
    return {
      icon: '📱',
      title: t('introvox', 'Install Nextcloud on your Android'),
      steps: [
        t('introvox', 'Tap the menu icon (three dots) in the top right'),
        t('introvox', 'Tap <strong>"Install app"</strong> or <strong>"Add to home screen"</strong>'),
        t('introvox', 'Tap <strong>Install</strong>'),
        t('introvox', 'Nextcloud now appears as an app on your home screen!')
      ]
    }
  }

  // Desktop Edge (Windows/macOS/Linux)
  if (browser === 'edge' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: t('introvox', 'Install Nextcloud on your computer'),
      steps: [
        t('introvox', 'Click the <strong>install icon</strong> in the address bar (right)'),
        t('introvox', 'Or: click the menu (three dots) → <strong>"More tools"</strong> → <strong>"Apps"</strong> → <strong>"Install this site as an app"</strong>'),
        t('introvox', 'Click <strong>Install</strong>'),
        t('introvox', 'Nextcloud now opens as an app in its own window!')
      ]
    }
  }

  // Desktop Chrome (Windows/macOS/Linux)
  if (browser === 'chrome' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: t('introvox', 'Install Nextcloud on your computer'),
      steps: [
        t('introvox', 'Click the <strong>install icon</strong> in the address bar (right)'),
        t('introvox', 'Or: click the menu (three dots) → <strong>"Install Nextcloud"</strong>'),
        t('introvox', 'Click <strong>Install</strong>'),
        t('introvox', 'Nextcloud now opens as an app in its own window!')
      ]
    }
  }

  // Firefox Android
  if (os === 'android' && browser === 'firefox') {
    return {
      icon: '📱',
      title: t('introvox', 'Install Nextcloud on your Android'),
      steps: [
        t('introvox', 'Tap the menu icon (three dots) in the top right'),
        t('introvox', 'Tap <strong>"Install"</strong>'),
        t('introvox', 'Tap <strong>Add to Home Screen</strong>'),
        t('introvox', 'Nextcloud now appears as an app on your home screen!')
      ]
    }
  }

  // Desktop Firefox - limited PWA support
  if (browser === 'firefox' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: t('introvox', 'Create a shortcut in Firefox'),
      steps: [
        t('introvox', 'Firefox currently does not support PWA installation'),
        t('introvox', 'You can however create a bookmark for quick access'),
        t('introvox', 'Or use Chrome/Edge for the full app experience')
      ]
    }
  }

  // Opera
  if (browser === 'opera') {
    return {
      icon: deviceType === 'mobile' ? '📱' : '💻',
      title: t('introvox', 'Install Nextcloud in Opera'),
      steps: [
        t('introvox', 'Click/tap the menu icon'),
        t('introvox', 'Select <strong>"Install Nextcloud"</strong>'),
        t('introvox', 'Click/tap <strong>Install</strong>'),
        t('introvox', 'Nextcloud is now available as an app!')
      ]
    }
  }

  // Fallback for unknown browsers
  return {
    icon: '🌐',
    title: t('introvox', 'Use Nextcloud as an app'),
    steps: [
      t('introvox', 'Your browser may support app installation'),
      t('introvox', 'Look in the menu for options like "Install" or "Add to home screen"'),
      t('introvox', 'For the best experience: use Chrome, Edge or Safari')
    ]
  }
}
