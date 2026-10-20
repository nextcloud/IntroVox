import { createApp } from 'vue'
import WizardManager from '../components/WizardManager.vue'
import 'shepherd.js/dist/css/shepherd.css'
import '../../css/wizard.css'

// The tour code: WizardManager with Shepherd, Vue and the tour's styles. A
// chunk of its own, loaded by the bootstrap (src/main.js) only on a page
// where a tour runs.

let root = null

const mount = (props) => {
  if (!root) {
    let element = document.getElementById('nextcloud-wizard-mount')
    if (!element) {
      element = document.createElement('div')
      element.id = 'nextcloud-wizard-mount'
      document.body.appendChild(element)
    }
    root = createApp(WizardManager, props).mount(element)
  }
  return root
}

/**
 * @param {object} choice What chooseTour() decided
 */
export function startTour(choice) {
  mount({ start: choice })
}

/**
 * window.introVox.start(), from the console or the docs
 *
 * @return {Promise<void>}
 */
export function startManually() {
  return mount({}).startTour()
}

/**
 * The admin's tour preview: WizardManager in preview mode replaces the
 * bootstrap's window.introVoxPreview with its own.
 *
 * @return {object} window.introVoxPreview
 */
export function mountPreview() {
  mount({ preview: true })
  return window.introVoxPreview
}
