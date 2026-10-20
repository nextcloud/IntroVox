import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { reducedMotion } from './motion.js'

// The image, GIF or video of a tour step, built with DOM APIs from the
// step's media block. It never goes through HTML, so nothing in the block
// can become markup; the file id is checked again here, as on the server
// (StepValidator::MEDIA_FILE_PATTERN). The files come from IntroVox's own
// media route, which only serves them to users who get the step.

export const MEDIA_FILE = /^[a-f0-9]{32}\.(png|jpg|gif|mp4|webm)$/
export const CAPTIONS_FILE = /^[a-f0-9]{32}\.vtt$/

export const mediaUrl = (file) => generateUrl('/apps/introvox/media/{file}', { file })
export const isVideo = (file) => /\.(mp4|webm)$/.test(file)

// Arrow keys, Home, End and space belong to the video and its buttons here,
// not to the tour, which would otherwise move to another step
const OWN_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' ', 'Spacebar']

const PAUSE_ICON = 'M14,19H18V5H14M6,19H10V5H6V19Z'
const PLAY_ICON = 'M8,5.14V19.14L19,12.14L8,5.14Z'

function icon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.setAttribute('aria-hidden', 'true')
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  shape.setAttribute('d', path)
  svg.appendChild(shape)
  return svg
}

function keepKeys(element) {
  element.addEventListener('keydown', (event) => {
    if (OWN_KEYS.includes(event.key)) {
      event.stopPropagation()
    }
  })
}

// A visible Pause/Play button for anything that moves on its own (WCAG 2.2.2)
function motionButton(onToggle) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'introvox-media__motion'
  let playing = true
  const render = () => {
    const label = playing
      // TRANSLATORS: Invisible label of a button that pauses a GIF or video in a tour step
      ? t('introvox', 'Pause animation')
      // TRANSLATORS: Invisible label of a button that plays a GIF or video in a tour step
      : t('introvox', 'Play animation')
    button.setAttribute('aria-label', label)
    button.replaceChildren(icon(playing ? PAUSE_ICON : PLAY_ICON))
  }
  button.addEventListener('click', () => {
    playing = !playing
    render()
    onToggle(playing)
  })
  keepKeys(button)
  render()
  return {
    element: button,
    set(play) {
      if (play !== playing) {
        playing = play
        render()
        onToggle(playing)
      }
    }
  }
}

function sized(element, media) {
  if (Number.isInteger(media.width) && Number.isInteger(media.height) && media.width > 0 && media.height > 0) {
    element.width = media.width
    element.height = media.height
  }
}

function buildImage(media, figure) {
  const image = document.createElement('img')
  image.src = mediaUrl(media.file)
  image.alt = media.decorative ? '' : (media.alt || '')
  image.decoding = 'async'
  image.className = 'introvox-media__visual'
  sized(image, media)
  figure.appendChild(image)

  if (!media.animated) {
    return { show() {}, hide() {} }
  }
  // Paused, an animated GIF shows a still of it on a canvas
  const still = document.createElement('canvas')
  still.className = 'introvox-media__visual'
  still.hidden = true
  if (!media.decorative && media.alt) {
    still.setAttribute('role', 'img')
    still.setAttribute('aria-label', media.alt)
  }
  figure.appendChild(still)
  const motion = motionButton((playing) => {
    if (!playing && image.complete && image.naturalWidth > 0) {
      still.width = image.naturalWidth
      still.height = image.naturalHeight
      still.getContext('2d')?.drawImage(image, 0, 0)
    }
    image.hidden = !playing
    still.hidden = playing
  })
  figure.appendChild(motion.element)
  const stillIfReduced = () => {
    if (reducedMotion()) {
      motion.set(false)
    }
  }
  if (image.complete) {
    stillIfReduced()
  } else {
    image.addEventListener('load', stillIfReduced, { once: true })
  }
  return { show() {}, hide() {} }
}

function buildVideo(media, figure) {
  const video = document.createElement('video')
  video.src = mediaUrl(media.file)
  video.className = 'introvox-media__visual'
  video.preload = 'metadata'
  video.playsInline = true
  video.setAttribute('playsinline', '')
  sized(video, media)
  keepKeys(video)
  figure.appendChild(video)

  if (!media.decorative && media.alt) {
    video.setAttribute('aria-label', media.alt)
  }
  if (typeof media.captions === 'string' && CAPTIONS_FILE.test(media.captions)) {
    const track = document.createElement('track')
    track.kind = 'captions'
    track.src = mediaUrl(media.captions)
    // TRANSLATORS: Noun: name of the subtitles track of a video
    track.label = t('introvox', 'Captions')
    track.srclang = (document.documentElement.lang || 'en').split('-')[0]
    track.default = true
    video.appendChild(track)
  }

  if (media.playback !== 'loop') {
    // With a play button: never starts by itself
    video.controls = true
    return {
      show() {},
      hide() {
        video.pause()
      }
    }
  }

  // Plays like a GIF: silent, on repeat, with a Pause button
  video.muted = true
  video.loop = true
  if (media.decorative) {
    video.setAttribute('aria-hidden', 'true')
  }
  const motion = motionButton((playing) => {
    if (playing) {
      video.play()?.catch(() => motion.set(false))
    } else {
      video.pause()
    }
  })
  figure.appendChild(motion.element)
  return {
    show() {
      motion.set(!reducedMotion())
      if (!reducedMotion()) {
        video.play()?.catch(() => motion.set(false))
      }
    },
    hide() {
      video.pause()
    }
  }
}

/**
 * @param {object|undefined} media The step's media block
 * @return {object|null} { element, show(), hide() }, or null without media
 */
export function buildStepMedia(media) {
  if (!media || typeof media.file !== 'string' || !MEDIA_FILE.test(media.file)) {
    return null
  }
  const figure = document.createElement('figure')
  const size = ['small', 'full', 'wide'].includes(media.size) ? media.size : 'full'
  figure.className = `introvox-media introvox-media--${size}`
  const controls = isVideo(media.file) ? buildVideo(media, figure) : buildImage(media, figure)
  return { element: figure, ...controls }
}
