<template>
  <NextcloudFrame
    :name="frameName"
    :start-page="startPage"
    :title="pickerTitle"
    :close-label="t('introvox', 'Cancel')"
    @ready="onFrameLoad"
    @load="onFrameLoad"
    @escape="onEscape"
    @close="$emit('close')"
  >
    <template #icon>
      <Crosshairs :size="20" />
    </template>

    <template #bar>
      <!-- TRANSLATORS: Invisible group label of two choices: Select or Browse -->
      <NcRadioGroup :label="t('introvox', 'Picker mode')"
        v-model="mode"
        class="introvox-picker__modes"
        hide-label>
        <!-- TRANSLATORS: Choice (verb): clicking picks the element; keep it short -->
        <NcRadioGroupButton value="select" :label="t('introvox', 'Select')">
          <template #icon>
            <CursorDefaultClickOutline :size="20" />
          </template>
        </NcRadioGroupButton>
        <!-- TRANSLATORS: Choice (verb): use the page normally, clicking does not pick; keep it short -->
        <NcRadioGroupButton value="browse" :label="t('introvox', 'Browse')">
          <template #icon>
            <Web :size="20" />
          </template>
        </NcRadioGroupButton>
      </NcRadioGroup>
      <span class="introvox-picker__hint">
        {{ mode === 'select'
          ? t('introvox', 'Click the element this step should point at.')
          : t('introvox', 'Use the page as usual, for example to open a menu. To pick something inside it, hold Shift and click.') }}
      </span>
    </template>

    <div
      v-if="hoverBox"
      class="introvox-picker__box introvox-picker__box--hover"
      :style="boxStyle(hoverBox)">
      <span class="introvox-picker__label" :class="{ 'introvox-picker__label--below': hoverBox.top < 24 }">
        {{ hoverBox.label }}
      </span>
    </div>
    <div
      v-if="selectedBox"
      class="introvox-picker__box introvox-picker__box--selected"
      :style="boxStyle(selectedBox)"
    />

    <div
      v-if="candidates.length"
      class="introvox-picker__panel"
      :class="{ 'introvox-picker__panel--top': panelOnTop }">
      <!-- TRANSLATORS: Heading of a panel about the element you picked -->
      <h3>{{ t('introvox', 'Selected element') }}</h3>
      <!-- TRANSLATORS: Noun: invisible label of a list of CSS selectors (a web development term) -->
      <div role="radiogroup" :aria-label="t('introvox', 'Selector')">
        <NcCheckboxRadioSwitch
          v-for="candidate in candidates"
          :key="candidate.selector"
          v-model="chosenSelector"
          type="radio"
          name="introvox-picker-selector"
          :value="candidate.selector">
          <code class="introvox-picker__selector">{{ candidate.selector }}</code>
        </NcCheckboxRadioSwitch>
      </div>
      <p class="introvox-picker__page">
        {{ pageNotice }}
      </p>
      <NcNoteCard v-if="insidePopup && openFirst" type="info">
        <p>{{ t('introvox', 'This element is inside a menu. During the tour, the menu is opened first with:') }}</p>
        <code class="introvox-picker__selector">{{ openFirst }}</code>
      </NcNoteCard>
      <NcNoteCard
        v-else-if="insidePopup"
        type="warning"
        :text="t('introvox', 'This element is inside a menu or pop-up that only exists while it is open. Open it in Browse mode, then hold Shift and click the element, so the tour knows which button opens it.')"
      />
      <NcNoteCard
        v-if="reachedByUsing"
        type="info"
        :text="t('introvox', 'You got here by using the page. The tour cannot do that for someone, but the step waits until this element is there. So let the steps before it lead the way: one step for each click, with Continue with: Click on the element.')"
      />
      <NcNoteCard
        v-if="chosenCandidate && chosenCandidate.fragile"
        type="warning"
        :text="t('introvox', 'This selector depends on where the element sits in the page and may stop working after a Nextcloud update.')"
      />
      <div class="introvox-picker__actions">
        <NcButton :disabled="!canSelectParent" @click="selectParent">
          <template #icon>
            <ArrowUp :size="20" />
          </template>
          <!-- TRANSLATORS: Button: selects the element that contains the selected one -->
          {{ t('introvox', 'Parent element') }}
        </NcButton>
        <NcButton variant="primary" @click="usePick">
          <template #icon>
            <Check :size="20" />
          </template>
          <!-- TRANSLATORS: Button: the step points at the selected element -->
          {{ t('introvox', 'Use this element') }}
        </NcButton>
      </div>
    </div>
  </NextcloudFrame>
</template>

<script>
import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcRadioGroup, NcRadioGroupButton } from '@nextcloud/vue'

import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Crosshairs from 'vue-material-design-icons/Crosshairs.vue'
import CursorDefaultClickOutline from 'vue-material-design-icons/CursorDefaultClickOutline.vue'
import Web from 'vue-material-design-icons/Web.vue'

import NextcloudFrame from '../frame/NextcloudFrame.vue'
import { PICKER_FRAME_NAME } from '../frame/frameNames.js'
import { buildSelectors, describeElement, promoteTarget, suggestPosition } from './selector.mjs'
import { stepPageFor } from '../utils/pages.mjs'
import { openTriggerFor, popupOf } from '../utils/popups.mjs'

// Events that would activate whatever is under the pointer. While picking
// they are swallowed at the frame's window, before the page sees them, so
// picking a link does not follow it and picking inside an open menu does not
// close the menu.
const SWALLOWED_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu']
const CURSOR_STYLE_ID = 'introvox-picker-cursor'
// How many browse-mode clicks to remember when looking for a menu's button
const RECENT_CLICKS = 5

export default {
  name: 'ElementPicker',
  components: {
    NcButton,
    NcCheckboxRadioSwitch,
    NcNoteCard,
    NcRadioGroup,
    NcRadioGroupButton,
    ArrowUp,
    Check,
    Crosshairs,
    CursorDefaultClickOutline,
    Web,
    NextcloudFrame
  },
  props: {
    // Where the picker opens: the tour's own page, for a tour that starts in
    // an app; the default app when empty
    startPage: {
      type: String,
      default: ''
    }
  },
  emits: ['pick', 'close'],
  setup(props, { emit }) {
    const mode = ref('select')
    const hoverBox = ref(null)
    const selectedBox = ref(null)
    const selected = shallowRef(null)
    const selectedConnected = ref(false)
    const candidates = ref([])
    const chosenSelector = ref('')
    const insidePopup = ref(false)
    const openFirst = ref('')
    const page = ref('')
    // Picked after clicking around on this page, outside a menu: something
    // the user does makes it appear, such as a conversation they create
    const reachedByUsing = ref(false)

    // The page runs in the frame on the same origin, so its DOM is ours to
    // read directly. These track it outside Vue's reactivity on purpose.
    let frameWindow = null
    // The page the listeners are on. The frame's window object stays the same
    // across page loads in it; its document does not.
    let frameDocument = null
    let hovered = null
    let lastPointerTarget = null
    let recentClicks = []
    // Clicks in browse mode since this page loaded
    let browsedHere = 0
    let shiftHeld = false
    let suggestedPosition = 'bottom'
    let animationFrame = 0

    const chosenCandidate = computed(() => candidates.value.find(c => c.selector === chosenSelector.value))

    const canSelectParent = computed(() => {
      const parent = selected.value?.parentElement
      return selectedConnected.value && !!parent
        && parent !== parent.ownerDocument.body && parent !== parent.ownerDocument.documentElement
    })

    // Keep the panel clear of the element it describes.
    const panelOnTop = computed(() => {
      const box = selectedBox.value
      return !!box && !!frameWindow && box.top + box.height / 2 > frameWindow.innerHeight / 2
    })

    // Browse mode picks too while Shift is held. Switching modes in the bar
    // would move focus out of the frame, and an open menu closes on that.
    const isPicking = (event) => mode.value === 'select' || !!event?.shiftKey || shiftHeld

    const boxStyle = (box) => ({
      top: box.top + 'px',
      left: box.left + 'px',
      width: box.width + 'px',
      height: box.height + 'px'
    })

    const rectOf = (el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    }

    // A picked menu item leaves the page once the menu closes. Its selectors
    // stay valid, so the selection is kept; only the outline goes.
    const updateBoxes = () => {
      animationFrame = 0
      if (hovered && !hovered.isConnected) {
        hovered = null
      }
      hoverBox.value = hovered && hovered !== selected.value
        ? { ...rectOf(hovered), label: describeElement(hovered) }
        : null
      selectedConnected.value = !!selected.value?.isConnected
      selectedBox.value = selectedConnected.value ? rectOf(selected.value) : null
    }

    const scheduleUpdate = () => {
      if (!animationFrame) {
        animationFrame = requestAnimationFrame(updateBoxes)
      }
    }

    // The button that opened the menu the element sits in: the admin clicked
    // it in browse mode just before. Clicks inside that same menu, such as
    // one that opened a submenu, don't count. Menus that open on hover, like
    // Nextcloud 35's apps menu, saw no click; their button says it is open.
    const findOpener = (popup) => {
      for (let i = recentClicks.length - 1; i >= 0; i--) {
        const candidate = recentClicks[i]
        if (candidate.isConnected && !popup.contains(candidate)) {
          return candidate
        }
      }
      return openTriggerFor(popup)
    }

    const select = (el) => {
      const view = el.ownerDocument.defaultView
      const popup = popupOf(el)
      const opener = popup ? findOpener(popup) : null
      selected.value = el
      candidates.value = buildSelectors(el)
      chosenSelector.value = candidates.value[0].selector
      insidePopup.value = !!popup
      openFirst.value = opener ? buildSelectors(opener)[0].selector : ''
      // The Nextcloud header, and menus opened from it, are on every page.
      // Anything else belongs to the app the admin picked it in.
      page.value = (opener || el).closest('#header') ? '' : stepPageFor(view.location.pathname)
      reachedByUsing.value = !popup && page.value !== '' && browsedHere > 0
      suggestedPosition = suggestPosition(el.getBoundingClientRect(), view.innerWidth, view.innerHeight)
      scheduleUpdate()
    }

    const clearSelection = () => {
      selected.value = null
      candidates.value = []
      insidePopup.value = false
      openFirst.value = ''
      page.value = ''
      reachedByUsing.value = false
      scheduleUpdate()
    }

    const selectParent = () => {
      if (canSelectParent.value) {
        select(selected.value.parentElement)
      }
    }

    const usePick = () => {
      emit('pick', {
        selector: chosenSelector.value,
        position: suggestedPosition,
        openFirst: openFirst.value,
        page: page.value
      })
    }

    const applyCursor = () => {
      const doc = frameWindow?.document
      if (!doc?.head) {
        return
      }
      const existing = doc.getElementById(CURSOR_STYLE_ID)
      const picking = isPicking()
      if (picking && !existing) {
        const style = doc.createElement('style')
        style.id = CURSOR_STYLE_ID
        style.textContent = '* { cursor: crosshair !important; }'
        doc.head.appendChild(style)
      } else if (!picking && existing) {
        existing.remove()
      }
    }

    watch(mode, (value) => {
      hovered = null
      if (value === 'browse') {
        clearSelection()
      }
      applyCursor()
      scheduleUpdate()
    })

    // Cross-realm safe: the frame has its own Element constructor.
    const isElement = (node) => node?.nodeType === 1

    const onSwallowed = (event) => {
      if (!isPicking(event)) {
        if (event.type === 'click' && isElement(event.target)) {
          recentClicks = [...recentClicks.slice(1 - RECENT_CLICKS), promoteTarget(event.target)]
          browsedHere++
        }
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.type === 'click' && isElement(event.target)) {
        select(promoteTarget(event.target))
      }
    }

    const onMouseMove = (event) => {
      if (!isElement(event.target)) {
        return
      }
      lastPointerTarget = event.target
      const el = isPicking(event) ? promoteTarget(event.target) : null
      if (el !== hovered) {
        hovered = el
        scheduleUpdate()
      }
    }

    const onMouseLeave = () => {
      lastPointerTarget = null
      hovered = null
      scheduleUpdate()
    }

    const onEscape = () => {
      if (selected.value) {
        clearSelection()
      } else {
        emit('close')
      }
    }

    // Shift shows the outline straight away, without waiting for the mouse
    // to move. In browse mode Escape belongs to the page (closing its menus).
    const onFrameKeydown = (event) => {
      if (event.key === 'Shift' && !shiftHeld) {
        shiftHeld = true
        hovered = lastPointerTarget ? promoteTarget(lastPointerTarget) : null
        applyCursor()
        scheduleUpdate()
      } else if (event.key === 'Escape' && mode.value === 'select') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onEscape()
      }
    }

    const releaseShift = () => {
      shiftHeld = false
      if (mode.value !== 'select') {
        hovered = null
      }
      applyCursor()
      scheduleUpdate()
    }

    const onFrameKeyup = (event) => {
      if (event.key === 'Shift') {
        releaseShift()
      }
    }

    const detachFrame = () => {
      if (!frameWindow) {
        return
      }
      try {
        SWALLOWED_EVENTS.forEach(type => frameWindow.removeEventListener(type, onSwallowed, true))
        frameWindow.removeEventListener('mousemove', onMouseMove, true)
        frameWindow.removeEventListener('keydown', onFrameKeydown, true)
        frameWindow.removeEventListener('keyup', onFrameKeyup, true)
        frameWindow.removeEventListener('blur', releaseShift)
        frameWindow.removeEventListener('scroll', scheduleUpdate, true)
        frameWindow.removeEventListener('resize', scheduleUpdate)
        frameWindow.document.removeEventListener('mouseleave', onMouseLeave)
      } catch (e) {
        // The frame navigated away or is gone; its listeners went with it.
      }
      frameWindow = null
      frameDocument = null
    }

    // Runs on every full page load inside the frame, including when the admin
    // browses to another app, so listeners are re-attached each time. Each
    // page reports twice: ready as soon as its DOM is, and load after its
    // images; the second one finds the listeners in place.
    const onFrameLoad = (view) => {
      if (view && frameWindow && view.document === frameDocument) {
        return
      }
      detachFrame()
      hovered = null
      lastPointerTarget = null
      recentClicks = []
      browsedHere = 0
      shiftHeld = false
      clearSelection()
      if (!view) {
        return
      }

      frameWindow = view
      frameDocument = view.document
      SWALLOWED_EVENTS.forEach(type => view.addEventListener(type, onSwallowed, true))
      view.addEventListener('mousemove', onMouseMove, true)
      view.addEventListener('keydown', onFrameKeydown, true)
      view.addEventListener('keyup', onFrameKeyup, true)
      // A Shift released outside the frame never sends keyup here.
      view.addEventListener('blur', releaseShift)
      view.addEventListener('scroll', scheduleUpdate, true)
      view.addEventListener('resize', scheduleUpdate)
      view.document.addEventListener('mouseleave', onMouseLeave)
      applyCursor()
    }

    onBeforeUnmount(() => {
      detachFrame()
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    })

    // In script, one string per line, so each keeps its own translator hint
    // TRANSLATORS: Title of the screen where you click the element a step points at
    const pickerTitle = t('introvox', 'Pick an element')
    const pageNotice = computed(() => (page.value
      // TRANSLATORS: {page} is an address of this Nextcloud, such as "/apps/spreed/"
      ? t('introvox', 'This element is on {page}. The tour opens that page first.', { page: page.value }, undefined, TEXT)
      : t('introvox', 'This element is in the header, so the step works on every page.')))

    return {
      frameName: PICKER_FRAME_NAME,
      pickerTitle,
      pageNotice,
      mode,
      hoverBox,
      selectedBox,
      candidates,
      chosenSelector,
      chosenCandidate,
      insidePopup,
      openFirst,
      reachedByUsing,
      page,
      canSelectParent,
      panelOnTop,
      boxStyle,
      selectParent,
      usePick,
      onFrameLoad,
      onEscape,
      t
    }
  }
}
</script>

<style scoped>
.introvox-picker__modes {
  flex: 0 0 auto;
  width: auto;
}

.introvox-picker__hint {
  flex: 1;
  min-width: 200px;
  color: var(--color-text-maxcontrast);
}

/* Drawn over the frame, not inside it, so the page's DOM stays untouched. */
.introvox-picker__box {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 4px;
}

.introvox-picker__box--hover {
  border: 2px solid var(--color-primary-element);
  background: color-mix(in srgb, var(--color-primary-element) 12%, transparent);
}

.introvox-picker__box--selected {
  border: 3px solid var(--color-success);
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
}

.introvox-picker__label {
  position: absolute;
  bottom: 100%;
  left: -2px;
  margin-bottom: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
  font-family: monospace;
  font-size: var(--font-size-small);
  white-space: nowrap;
}

.introvox-picker__label--below {
  top: 100%;
  bottom: auto;
  margin-top: 2px;
  margin-bottom: 0;
}

.introvox-picker__panel {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, calc(100% - 32px));
  max-height: 45%;
  overflow-y: auto;
  padding: 16px;
  border-radius: var(--border-radius-large);
  background: var(--color-main-background);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.introvox-picker__panel--top {
  top: 16px;
  bottom: auto;
}

.introvox-picker__panel h3 {
  margin: 0 0 8px;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.introvox-picker__page {
  margin: 8px 0 0;
  color: var(--color-text-maxcontrast);
  font-size: var(--font-size-small);
}

.introvox-picker__selector {
  overflow-wrap: anywhere;
}

.introvox-picker__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
