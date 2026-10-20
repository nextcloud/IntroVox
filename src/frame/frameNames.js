// The admin page shows Nextcloud in an iframe for the element picker and for
// the tour preview. main.js checks these names: no tour may start on its own
// inside either, and the preview frame gets a tour it can drive. Unlike a
// query parameter, a frame's name stays while the admin navigates in it.
export const PICKER_FRAME_NAME = 'introvox-element-picker'
export const PREVIEW_FRAME_NAME = 'introvox-tour-preview'

// Sent by main.js inside either frame, on the frame's own <iframe> element,
// as soon as the page's DOM is ready. The frame's load event waits for every
// image and preview first -- a second or more on a busy folder -- and a click
// in that time would reach the page instead of the picker.
export const FRAME_READY_EVENT = 'introvox-frame-ready'
