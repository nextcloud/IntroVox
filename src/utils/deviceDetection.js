/**
 * Device and Browser Detection Utilities
 * Detects browser, OS, and device type for showing appropriate PWA installation instructions
 */

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
      title: 'Installeer Nextcloud op je iPhone/iPad',
      steps: [
        'Tik op het <strong>Deel</strong> icoon (vierkant met pijl omhoog) onderaan',
        'Scroll naar beneden en tik op <strong>"Zet op beginscherm"</strong>',
        'Tik op <strong>Toevoegen</strong> rechtsboven',
        'Nextcloud verschijnt nu als app op je beginscherm!'
      ]
    }
  }

  // macOS Safari
  if (os === 'macos' && browser === 'safari') {
    return {
      icon: '💻',
      title: 'Installeer Nextcloud op je Mac',
      steps: [
        'Klik op <strong>Archief</strong> in de menubalk',
        'Selecteer <strong>"Voeg toe aan Dock"</strong>',
        'Nextcloud verschijnt nu in je Dock als app!'
      ]
    }
  }

  // Android Chrome/Edge
  if (os === 'android' && (browser === 'chrome' || browser === 'edge')) {
    return {
      icon: '📱',
      title: 'Installeer Nextcloud op je Android',
      steps: [
        'Tik op het menu icoon (drie puntjes) rechtsboven',
        'Tik op <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong>',
        'Tik op <strong>Installeren</strong>',
        'Nextcloud verschijnt nu als app op je startscherm!'
      ]
    }
  }

  // Desktop Edge (Windows/macOS/Linux)
  if (browser === 'edge' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: 'Installeer Nextcloud op je computer',
      steps: [
        'Klik op het <strong>installatie icoon</strong> in de adresbalk (rechts)',
        'Of: klik op het menu (drie puntjes) → <strong>"Meer hulpprogramma\'s"</strong> → <strong>"Apps"</strong> → <strong>"Deze site installeren als app"</strong>',
        'Klik op <strong>Installeren</strong>',
        'Nextcloud opent nu als app in een eigen venster!'
      ]
    }
  }

  // Desktop Chrome (Windows/macOS/Linux)
  if (browser === 'chrome' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: 'Installeer Nextcloud op je computer',
      steps: [
        'Klik op het <strong>installatie icoon</strong> in de adresbalk (rechts)',
        'Of: klik op het menu (drie puntjes) → <strong>"Nextcloud installeren"</strong>',
        'Klik op <strong>Installeren</strong>',
        'Nextcloud opent nu als app in een eigen venster!'
      ]
    }
  }

  // Firefox Android
  if (os === 'android' && browser === 'firefox') {
    return {
      icon: '📱',
      title: 'Installeer Nextcloud op je Android',
      steps: [
        'Tik op het menu icoon (drie puntjes) rechtsboven',
        'Tik op <strong>"Installeren"</strong>',
        'Tik op <strong>Toevoegen aan startscherm</strong>',
        'Nextcloud verschijnt nu als app op je startscherm!'
      ]
    }
  }

  // Desktop Firefox - limited PWA support
  if (browser === 'firefox' && deviceType === 'desktop') {
    return {
      icon: '💻',
      title: 'Snelkoppeling maken in Firefox',
      steps: [
        'Firefox ondersteunt momenteel geen PWA installatie',
        'Je kunt wel een bladwijzer maken voor snelle toegang',
        'Of gebruik Chrome/Edge voor volledige app-ervaring'
      ]
    }
  }

  // Opera
  if (browser === 'opera') {
    return {
      icon: deviceType === 'mobile' ? '📱' : '💻',
      title: 'Installeer Nextcloud in Opera',
      steps: [
        'Klik/tik op het menu icoon',
        'Selecteer <strong>"Installeren Nextcloud"</strong>',
        'Klik/tik op <strong>Installeren</strong>',
        'Nextcloud is nu beschikbaar als app!'
      ]
    }
  }

  // Fallback for unknown browsers
  return {
    icon: '🌐',
    title: 'Nextcloud als app gebruiken',
    steps: [
      'Je browser ondersteunt mogelijk app-installatie',
      'Kijk in het menu naar opties zoals "Installeren" of "Toevoegen aan startscherm"',
      'Voor de beste ervaring: gebruik Chrome, Edge of Safari'
    ]
  }
}
