<template>
  <Teleport to="body">
    <div
      ref="dialogRef"
      class="introvox-frame"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="title"
    >
      <div class="introvox-frame__bar">
        <span class="introvox-frame__title">
          <slot name="icon" />
          {{ title }}
        </span>
        <slot name="bar" />
        <NcButton @click="$emit('close')">
          <template #icon>
            <Close :size="20" />
          </template>
          {{ closeLabel }}
        </NcButton>
      </div>

      <div class="introvox-frame__stage">
        <!-- No allow-top-navigation: whatever loads in the frame can never
             navigate the admin's own tab away. -->
        <!-- TRANSLATORS: Invisible title (for screen readers) of the frame that shows a page of Nextcloud in a preview -->
        <iframe :title="t('introvox', 'Nextcloud page')"
          ref="frameRef"
          :src="startUrl"
          :name="name"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          @load="onFrameLoad"
        />
        <slot />
        <div v-if="blocked" class="introvox-frame__blocked">
          <NcNoteCard
            type="error"
            :text="t('introvox', 'Nextcloud could not be shown here. Check your connection and try again. If this keeps happening, your server probably does not allow Nextcloud to be embedded in a frame.')"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcNoteCard } from '@nextcloud/vue'

import Close from 'vue-material-design-icons/Close.vue'

import { normalizePage } from '../utils/pages.mjs'

import { FRAME_READY_EVENT } from './frameNames.js'

/**
 * Full-screen overlay on the admin page with a live Nextcloud page in an
 * iframe, for the element picker and the tour preview. The frame is on the
 * same origin, so the parent reads and drives its DOM directly; the frame's
 * name (see frameNames.js) tells main.js inside it what it is for.
 */
export default {
  name: 'NextcloudFrame',
  components: {
    NcButton,
    NcNoteCard,
    Close
  },
  props: {
    // Frame name from frameNames.js
    name: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    closeLabel: {
      type: String,
      required: true
    },
    // Where the frame opens, such as a tour's app (/apps/spreed/); the
    // default app when empty. Only a plain path on this instance.
    startPage: {
      type: String,
      default: ''
    }
  },
  // load: the frame's window after every full page load in it, or null when
  // the browser refused to frame the page. ready: the same window earlier,
  // as soon as the page's DOM is ready (pages with IntroVox's script only).
  // escape: Escape outside the frame.
  emits: ['load', 'ready', 'close', 'escape'],
  setup(props, { emit }) {
    const dialogRef = ref(null)
    const frameRef = ref(null)
    const blocked = ref(false)
    let previousFocus = null

    const startUrl = generateUrl(normalizePage(props.startPage) || '/')

    const onFrameLoad = () => {
      let view = null
      try {
        view = frameRef.value.contentWindow
        // Throws for the cross-origin error page a browser shows when
        // X-Frame-Options or the CSP refuses to frame the page, and just
        // the same when the page could not be loaded at all.
        if (view.location.href === 'about:blank') {
          return
        }
        if (!view.document.body) {
          view = null
        }
      } catch (e) {
        view = null
      }
      blocked.value = !view
      emit('load', view)
    }

    // main.js inside the frame sends FRAME_READY_EVENT on this <iframe>
    const onFrameReady = () => {
      const view = frameRef.value?.contentWindow
      if (view?.document?.body) {
        emit('ready', view)
      }
    }

    const onWindowKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        emit('escape')
      }
    }

    // aria-modal alone keeps neither Tab nor a screen reader out of the admin
    // page underneath: everything else in <body> is inert while the frame is
    // open. Menus and toasts that open later are added after this, so they
    // stay usable.
    let madeInert = []

    onMounted(() => {
      previousFocus = document.activeElement
      madeInert = [...document.body.children].filter((el) => el !== dialogRef.value && !el.inert)
      madeInert.forEach((el) => { el.inert = true })
      dialogRef.value?.focus()
      window.addEventListener('keydown', onWindowKeydown)
      frameRef.value?.addEventListener(FRAME_READY_EVENT, onFrameReady)
    })

    onBeforeUnmount(() => {
      madeInert.forEach((el) => { el.inert = false })
      madeInert = []
      window.removeEventListener('keydown', onWindowKeydown)
      frameRef.value?.removeEventListener(FRAME_READY_EVENT, onFrameReady)
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus()
      }
    })

    return {
      dialogRef,
      frameRef,
      blocked,
      startUrl,
      onFrameLoad,
      t
    }
  }
}
</script>

<style scoped>
.introvox-frame {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: var(--color-main-background);
  color: var(--color-main-text);
}

/* The dialog itself takes focus on open (tabindex="-1") so the screen reader
   lands inside it; that is not keyboard navigation, and a ring around the
   whole overlay would only read as an error. Focus-visible on the controls
   inside is untouched. */
.introvox-frame:focus:not(:focus-visible) {
  outline: none;
}

.introvox-frame__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-main-background);
}

.introvox-frame__title {
  display: inline-flex;
  align-items: center;
  /* 8px: spacing comes off the 4px scale. */
  gap: 8px;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.introvox-frame__stage {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.introvox-frame__stage iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.introvox-frame__blocked {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-main-background);
}
</style>
