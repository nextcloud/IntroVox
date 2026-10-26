/**
 * The tours a user can start, for other apps, as <introvox-tour-list>.
 *
 * The same tours as IntroVox's personal settings: the welcome tour again, and
 * each tour this user may get, as plain links the host app styles itself
 * (TourLinks.vue has the class names). A custom
 * element rather than a Vue component: a host on another Vue version, or on
 * none, places a tag and depends on nothing else (MetaVox's
 * <metavox-metadata-form> works the same way).
 *
 * The host loads this bundle with \OCA\IntroVox\Embed\TourListEmbed::load()
 * and places the element:
 *
 *   container.appendChild(document.createElement('introvox-tour-list'))
 *
 * Events, bubbling: introvox:loaded { tours, welcome } (both empty or false
 * when there is nothing to start, so a host can hide its own frame),
 * introvox:error { message }.
 */
import { createApp, h } from 'vue'
import { getRequestToken } from '@nextcloud/auth'

import EmbeddedTourList from './EmbeddedTourList.vue'

// Chunks this bundle loads come with a script tag of their own, on the host
// app's page: Nextcloud's CSP admits them by the nonce, as in src/main.js.
// eslint-disable-next-line no-undef, camelcase
__webpack_nonce__ = btoa(getRequestToken() || '')

const TAG_NAME = 'introvox-tour-list'

class IntroVoxTourListElement extends HTMLElement {

  constructor() {
    super()
    this._app = null
  }

  connectedCallback() {
    if (this._app) {
      return
    }
    const forward = (name) => (detail) => {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
    }
    const mountPoint = document.createElement('div')
    this.appendChild(mountPoint)
    this._app = createApp({
      render: () => h(EmbeddedTourList, {
        onLoaded: forward('introvox:loaded'),
        onError: (message) => forward('introvox:error')({ message })
      })
    })
    this._app.mount(mountPoint)
  }

  disconnectedCallback() {
    this._app?.unmount()
    this._app = null
    this.replaceChildren()
  }

}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, IntroVoxTourListElement)
}
