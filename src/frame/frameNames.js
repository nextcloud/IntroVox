import { frameKind } from '../runtime/chooseTour.mjs'

// The admin page shows Nextcloud in an iframe for the element picker and for
// the tour preview. main.js checks these names: no tour may start on its own
// inside either, and the preview frame gets a tour it can drive. Unlike a
// query parameter, a frame's name stays while the admin navigates in it.
export const PICKER_FRAME_NAME = 'introvox-element-picker'
export const PREVIEW_FRAME_NAME = 'introvox-tour-preview'

/**
 * Which of these frames this page runs in: 'picker', 'preview', 'foreign'
 * for another same-origin frame, or null for a page of its own. The names
 * only count inside a same-origin iframe: frameElement is null in a
 * top-level tab, which another website could have opened with one of these
 * names to keep the tour from starting.
 *
 * @return {string|null}
 */
export const currentFrameKind = () => {
  let sameOriginParent = false
  try {
    sameOriginParent = !!window.frameElement
  } catch (e) {
    // A cross-origin parent: a page of its own
  }
  return frameKind({
    sameOriginParent,
    name: window.name,
    pickerName: PICKER_FRAME_NAME,
    previewName: PREVIEW_FRAME_NAME
  })
}

// Sent by main.js inside either frame, on the frame's own <iframe> element,
// as soon as the page's DOM is ready. The frame's load event waits for every
// image and preview first -- a second or more on a busy folder -- and a click
// in that time would reach the page instead of the picker.
export const FRAME_READY_EVENT = 'introvox-frame-ready'
