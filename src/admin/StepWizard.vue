<template>
  <!-- Unmounted while the picker or the preview covers the screen: they need
       the focus, which the dialog would otherwise keep trapped. -->
  <NcDialog
    v-if="!pickerOpen && !previewSteps"
    :name="dialogName"
    size="normal"
    :navigation-aria-label="navigationLabel"
    @update:open="onOpenChange"
  >
    <template #navigation>
      <ol class="step-wizard__nav">
        <li v-for="(page, index) in pages" :key="page.id">
          <button
            type="button"
            class="step-wizard__nav-item"
            :class="{ active: index === current }"
            :aria-current="index === current ? 'step' : undefined"
            @click="current = index">
            <span class="step-wizard__nav-number">{{ index + 1 }}</span>
            {{ page.label }}
          </button>
        </li>
      </ol>
    </template>

    <div class="step-wizard__page">
      <template v-if="page.id === 'content'">
        <!-- The title stays plain text (the tour shows it as a heading,
             escaped); an emoji is the one thing worth adding to it. -->
        <div class="step-wizard__title">
          <NcTextField
            ref="titleFieldRef"
            v-model="form.title"
            :label="t('introvox', 'Title') + ' *'"
            :placeholder="titlePlaceholder"
            required
          />
          <NcEmojiPicker :container="emojiContainer" @select="insertTitleEmoji">
            <NcButton
              variant="tertiary"
              :aria-label="t('introvox', 'Insert emoji')"
              :title="t('introvox', 'Insert emoji')">
              <template #icon>
                <EmoticonOutline :size="20" />
              </template>
            </NcButton>
          </NcEmojiPicker>
        </div>
        <StepMediaBlock v-model="form.media" />
        <!-- TRANSLATORS: Noun: label of the editor for the text of a step -->
        <StepTextEditor :label="t('introvox', 'Text') + ' *'"
          v-model="form.text"
        />
      </template>

      <template v-else-if="page.id === 'element'">
        <div class="step-wizard__target">
          <div class="step-wizard__target-text">
            <code v-if="form.attachTo" class="step-wizard__selector">{{ form.attachTo }}</code>
            <span v-else class="step-wizard__detail">
              <!-- TRANSLATORS: Status: the step shows in the middle of the screen, not next to an element -->
              <FormatAlignCenter :size="16" /> {{ t('introvox', 'Centered step') }}
            </span>
            <span v-if="form.page" class="step-wizard__detail">
              <!-- TRANSLATORS: {page} is a path of this Nextcloud, such as "/apps/spreed/" -->
              <Web :size="16" /> {{ t('introvox', 'On page {page}', { page: form.page }, undefined, TEXT) }}
            </span>
            <span v-if="form.attachTo && form.openFirst" class="step-wizard__detail">
              <!-- TRANSLATORS: {element} is a CSS selector of the menu button the tour clicks first, such as ".app-menu__waffle" -->
              <MenuOpen :size="16" /> {{ t('introvox', 'Opens {element} first', { element: form.openFirst }, undefined, TEXT) }}
            </span>
          </div>
          <div class="step-wizard__target-actions">
            <NcButton v-if="form.attachTo" variant="tertiary" @click="removeElement">
              <template #icon>
                <Close :size="20" />
              </template>
              <!-- TRANSLATORS: Button: the step no longer points at an element -->
              {{ t('introvox', 'Remove element') }}
            </NcButton>
            <NcButton @click="pickerOpen = true">
              <template #icon>
                <Crosshairs :size="20" />
              </template>
              <!-- TRANSLATORS: Button: opens Nextcloud so you can click the element the step points at -->
              {{ t('introvox', 'Pick element') }}
            </NcButton>
          </div>
        </div>

        <!-- The picker fills these in; they are here for fine-tuning. -->
        <details class="step-wizard__manual">
          <!-- TRANSLATORS: Heading of a section that can be expanded, with the technical fields of a step -->
          <summary>{{ t('introvox', 'Edit by hand') }}</summary>
          <div class="step-wizard__manual-fields">
            <NcTextField
              v-model="form.attachTo"
              :label="t('introvox', 'Attach to element (CSS selector)')"
              :placeholder="t('introvox', 'For example: {example}', {example: '.app-menu__waffle, .unified-search-input, #user-menu'}, undefined, TEXT)"
              :helper-text="t('introvox', 'Leave empty for a centered step.')"
            />
            <NcTextField
              v-model="form.page"
              :label="t('introvox', 'Page')"
              :placeholder="t('introvox', 'For example: {example}', {example: '/apps/spreed/'}, undefined, TEXT)"
              :helper-text="t('introvox', 'Leave empty to show this step on any page. With a page, the tour opens it first. Pick element fills this in.')"
            />
            <!-- TRANSLATORS: Label of a technical text field. "CSS selector" is a web development term -->
            <NcTextField :label="t('introvox', 'Open first (CSS selector)')"
              v-if="form.attachTo"
              v-model="form.openFirst"
              :placeholder="t('introvox', 'For example: {example}', {example: '.app-menu__waffle'}, undefined, TEXT)"
              :helper-text="t('introvox', 'For an element inside a menu: the button the tour clicks to open that menu before showing this step. Pick element fills this in when you pick inside a menu.')"
            />
          </div>
        </details>
      </template>

      <template v-else-if="page.id === 'behavior'">
        <!-- TRANSLATORS: Noun: label of four choices for where the step shows next to its element -->
        <NcRadioGroup v-model="form.position" :label="t('introvox', 'Position')">
          <!-- TRANSLATORS: Choice: the step shows to the right of its element; keep it short -->
          <NcRadioGroupButton value="right" :label="t('introvox', 'Right')">
            <template #icon>
              <ArrowRight :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the step shows to the left of its element; keep it short -->
          <NcRadioGroupButton value="left" :label="t('introvox', 'Left')">
            <template #icon>
              <ArrowLeft :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the step shows above its element; keep it short -->
          <NcRadioGroupButton value="top" :label="t('introvox', 'Top')">
            <template #icon>
              <ArrowUp :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the step shows below its element; keep it short -->
          <NcRadioGroupButton value="bottom" :label="t('introvox', 'Bottom')">
            <template #icon>
              <ArrowDown :size="20" />
            </template>
          </NcRadioGroupButton>
        </NcRadioGroup>
        <!-- TRANSLATORS: Label of three choices for how the user goes to the next step, as in "continue with the Next button" -->
        <NcRadioGroup :label="t('introvox', 'Continue with')"
          v-model="form.advance"
          :description="form.advance === 'input'
            ? t('introvox', 'Next only works once the field the step points at has text, such as the name of a new conversation. If the field is missing, Next works as usual.')
            : t('introvox', 'With a click on the element, people do what the step asks instead of pressing Next, and the step tells them so. If the element is missing, a Next button appears instead.')">
          <!-- TRANSLATORS: Choice: the user presses the Next button; keep it short -->
          <NcRadioGroupButton value="button" :label="t('introvox', 'Next button')">
            <template #icon>
              <ArrowRight :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the user clicks the highlighted element; keep it short -->
          <NcRadioGroupButton value="click" :label="t('introvox', 'Click on the element')">
            <template #icon>
              <CursorDefaultClickOutline :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the user types something into the highlighted field; keep it short -->
          <NcRadioGroupButton value="input" :label="t('introvox', 'Filling in the field')">
            <template #icon>
              <FormTextbox :size="20" />
            </template>
          </NcRadioGroupButton>
        </NcRadioGroup>
      </template>

      <template v-else>
        <!-- TRANSLATORS: Label of a list of groups that get this step -->
        <NcSelect :input-label="t('introvox', 'Visible to groups')"
          v-model="form.visibleToGroups"
          :options="groups"
          :multiple="true"
          label="displayName"
          track-by="id"
          :reduce="group => group.id"
          :placeholder="t('introvox', 'All users (no restriction)')"
          :close-on-select="false"
        />
        <p class="step-wizard__hint">
          {{ t('introvox', 'Leave empty to show to all users, or select groups to restrict visibility') }}
        </p>
      </template>
    </div>

    <template #actions>
      <NcButton variant="tertiary" @click="testStep">
        <template #icon>
          <Play :size="20" />
        </template>
        <!-- TRANSLATORS: Button: shows this one step as users will see it -->
        {{ t('introvox', 'Test this step') }}
      </NcButton>
      <span class="step-wizard__spacer" />
      <NcButton v-if="current > 0" @click="current--">
        <template #icon>
          <ArrowLeft :size="20" />
        </template>
        {{ t('introvox', 'Back') }}
      </NcButton>
      <NcButton
        v-if="!isLast"
        :variant="isNew ? 'primary' : 'secondary'"
        alignment="center-reverse"
        :disabled="!hasTitle"
        @click="current++">
        <template #icon>
          <ArrowRight :size="20" />
        </template>
        {{ t('introvox', 'Next') }}
      </NcButton>
      <NcButton
        v-if="isLast || !isNew"
        variant="primary"
        :disabled="saving || !hasTitle || !mediaReady"
        @click="save">
        <template #icon>
          <Check :size="20" />
        </template>
        {{ t('introvox', 'Save') }}
      </NcButton>
    </template>
  </NcDialog>

  <ElementPicker
    v-if="pickerOpen"
    :start-page="startPage"
    @pick="applyPick"
    @close="pickerOpen = false"
  />

  <TourPreview
    v-if="previewSteps"
    :start-page="startPage"
    :steps="previewSteps"
    :step-id="form.id"
    @close="previewSteps = null"
  />
</template>

<script>
import { ref, computed, nextTick, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import {
  NcButton,
  NcDialog,
  NcEmojiPicker,
  NcRadioGroup,
  NcRadioGroupButton,
  NcSelect,
  NcTextField
} from '@nextcloud/vue'

import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Crosshairs from 'vue-material-design-icons/Crosshairs.vue'
import CursorDefaultClickOutline from 'vue-material-design-icons/CursorDefaultClickOutline.vue'
import FormTextbox from 'vue-material-design-icons/FormTextbox.vue'
import EmoticonOutline from 'vue-material-design-icons/EmoticonOutline.vue'
import FormatAlignCenter from 'vue-material-design-icons/FormatAlignCenter.vue'
import MenuOpen from 'vue-material-design-icons/MenuOpen.vue'
import Play from 'vue-material-design-icons/Play.vue'
import Web from 'vue-material-design-icons/Web.vue'

import ElementPicker from '../picker/ElementPicker.vue'
import StepMediaBlock from './StepMediaBlock.vue'
import StepTextEditor from './StepTextEditor.vue'
import TourPreview from '../preview/TourPreview.vue'
import { withTargetFlag } from './stepTarget.js'

/**
 * Edits one tour step in a dialog, a page at a time: content, the element it
 * points at, how it behaves there, and who sees it. The form is a copy; the
 * list only changes when the admin saves (AdminApp writes it to the server).
 */
export default {
  name: 'StepWizard',
  components: {
    NcButton,
    NcDialog,
    NcEmojiPicker,
    NcRadioGroup,
    NcRadioGroupButton,
    NcSelect,
    NcTextField,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Check,
    Close,
    Crosshairs,
    CursorDefaultClickOutline,
    FormTextbox,
    EmoticonOutline,
    FormatAlignCenter,
    MenuOpen,
    Play,
    Web,
    ElementPicker,
    StepMediaBlock,
    StepTextEditor,
    TourPreview
  },
  props: {
    // The step as it is in the list
    step: {
      type: Object,
      required: true
    },
    // Just created with "Add step": walk through the pages, save at the end
    isNew: {
      type: Boolean,
      default: false
    },
    // [{ id, displayName }]
    groups: {
      type: Array,
      default: () => []
    },
    saving: {
      type: Boolean,
      default: false
    },
    // The tour's own page, for a tour that starts in an app: the picker and
    // the test open there
    startPage: {
      type: String,
      default: ''
    }
  },
  emits: ['save', 'cancel'],
  setup(props, { emit, expose }) {
    // The tour falls back to 'right' and to the Next button too (WizardManager)
    const form = ref({
      ...props.step,
      position: props.step.position || 'right',
      advance: props.step.advance || 'button',
      visibleToGroups: props.step.visibleToGroups || []
    })
    const initial = JSON.stringify(form.value)
    const current = ref(0)
    const pickerOpen = ref(false)
    const previewSteps = ref(null)
    const titleFieldRef = ref(null)

    // Position and click-to-continue only mean something with an element.
    const pages = computed(() => [
      // TRANSLATORS: Noun: name of the first page of the step dialog (title, image and text); keep it short
      { id: 'content', label: t('introvox', 'Content') },
      // TRANSLATORS: Noun: name of the page of the step dialog where you choose the element on the screen the step points at; keep it short
      { id: 'element', label: t('introvox', 'Element') },
      // TRANSLATORS: Noun: name of the page of the step dialog with where the step shows and how users continue; keep it short
      ...(form.value.attachTo ? [{ id: 'behavior', label: t('introvox', 'Behavior') }] : []),
      { id: 'visibility', label: t('introvox', 'Visible to') }
    ])
    const page = computed(() => pages.value[current.value])

    // In script, one string per line, so each keeps its own translator hint
    const dialogName = computed(() => (props.isNew
      // TRANSLATORS: Dialog title, and the title a new step gets until you change it
      ? t('introvox', 'New step')
      // TRANSLATORS: Dialog title: change a step
      : t('introvox', 'Edit step')))
    // TRANSLATORS: Invisible label (for screen readers) of the list of pages in the step dialog
    const navigationLabel = t('introvox', 'Step settings')
    // TRANSLATORS: Placeholder of a text field; {example} is an example value, such as "/apps/spreed/" or a step title
    const titlePlaceholder = t('introvox', 'For example: {example}', {
      // TRANSLATORS: An example title of a step, shown in a placeholder: "For example: 👋 Welcome to Nextcloud"
      example: '👋 ' + t('introvox', 'Welcome to Nextcloud'),
    }, undefined, TEXT)
    const isLast = computed(() => current.value === pages.value.length - 1)
    const hasTitle = computed(() => !!(form.value.title || '').trim())
    // An image or video needs a description unless it is decorative
    const mediaReady = computed(() => !form.value.media || form.value.media.decorative === true || !!(form.value.media.alt || '').trim())

    watch(() => pages.value.length, (length) => {
      current.value = Math.min(current.value, length - 1)
    })

    // The picker suggests a position from where the element sits. Only take
    // it for a step that had no element yet; re-picking the same element
    // must not undo a position the admin chose on purpose.
    const applyPick = ({ selector, position, openFirst, page: pickedPage }) => {
      if (!form.value.attachTo && position) {
        form.value.position = position
      }
      form.value.attachTo = selector
      // Empty when the element is not in a menu or app, so a re-pick clears them
      form.value.openFirst = openFirst || ''
      form.value.page = pickedPage || ''
      pickerOpen.value = false
    }

    // Inside the dialog, as in StepTextEditor: outside it, the dialog's focus
    // trap takes the focus from the picker's search field. Looked up again
    // whenever the title field is: the dialog is rebuilt after the element
    // picker and the preview.
    const emojiContainer = ref('body')
    watch(titleFieldRef, (field) => {
      emojiContainer.value = field?.$el.closest('.modal-mask') || 'body'
    }, { flush: 'post' })

    // At the cursor in the title; the input keeps it while the picker has the
    // focus. A space separates it from the words around it, as in
    // "👋 Welcome" or "Welcome 👋".
    const insertTitleEmoji = (emoji) => {
      const input = titleFieldRef.value?.$el.querySelector('input')
      const title = form.value.title || ''
      const start = input?.selectionStart ?? title.length
      const end = input?.selectionEnd ?? start
      const before = title.slice(0, start)
      const after = title.slice(end)
      const inserted = (before && !/\s$/.test(before) ? ' ' : '') + emoji + (after && !/^\s/.test(after) ? ' ' : '')
      form.value.title = before + inserted + after
      nextTick(() => {
        input?.focus()
        input?.setSelectionRange(start + inserted.length, start + inserted.length)
      })
    }

    // Back to a centered step. The page stays: a centered step can still
    // belong to an app.
    const removeElement = () => {
      form.value.attachTo = ''
      form.value.openFirst = ''
    }

    const testStep = () => {
      previewSteps.value = [withTargetFlag(form.value, props.step)]
    }

    const save = () => {
      emit('save', withTargetFlag(form.value, props.step))
    }

    const onOpenChange = (open) => {
      if (!open) {
        emit('cancel')
      }
    }

    // For AdminApp's warning when leaving the page with unsaved edits
    expose({
      isDirty: () => JSON.stringify(form.value) !== initial
    })

    return {
      TEXT,
      form,
      current,
      pages,
      page,
      isLast,
      hasTitle,
      mediaReady,
      pickerOpen,
      previewSteps,
      applyPick,
      titleFieldRef,
      emojiContainer,
      insertTitleEmoji,
      removeElement,
      testStep,
      save,
      onOpenChange,
      dialogName,
      navigationLabel,
      titlePlaceholder,
      t
    }
  }
}
</script>

<style scoped>
.step-wizard__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A vertical row of choices: typography stays constant and only colour
   carries the state. @nextcloud/vue 9.8.2 has no grouped button variant of
   NcCheckboxRadioSwitch to use instead -- neither buttonVariant nor the
   vertical value exists in the package -- so this stays a bare <button>. */
.step-wizard__nav .step-wizard__nav-item {
  display: flex;
  align-items: center;
  /* 8px, not 10: spacing comes off the 4px scale. Core also gives a bare
     <button> a 3px block margin, which the list's own 4px gap already
     covers. */
  gap: 8px;
  width: 100%;
  min-height: var(--default-clickable-area);
  margin-block: 0;
  margin-inline: 0;
  padding: 8px 12px;
  border: none;
  border-radius: var(--border-radius-element);
  background: transparent;
  color: var(--color-main-text);
  font-size: var(--default-font-size);
  font-weight: normal;
  text-align: start;
  cursor: pointer;
}

.step-wizard__nav .step-wizard__nav-item:hover {
  background: var(--color-background-hover);
}

/* Core tints a bare <button> on :focus, not :focus-visible, so it would stay
   highlighted after a mouse click. */
.step-wizard__nav .step-wizard__nav-item:focus:not(:focus-visible) {
  background-color: transparent;
}

.step-wizard__nav .step-wizard__nav-item.active:focus:not(:focus-visible) {
  background-color: color-mix(in srgb, var(--color-primary-element) 8%, transparent);
}

/* color-mix, not --color-primary-element-light: that is marked deprecated for
   the active item in a row. The weight stays put -- varying it between active
   and inactive is what the row must not do. */
.step-wizard__nav .step-wizard__nav-item.active {
  background: color-mix(in srgb, var(--color-primary-element) 8%, transparent);
  color: var(--color-primary-element);
}

.step-wizard__nav-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-background-dark);
  font-size: var(--font-size-small);
}

.step-wizard__nav .step-wizard__nav-item.active .step-wizard__nav-number {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
}

.step-wizard__page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
}

.step-wizard__title {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.step-wizard__title > :first-child {
  flex: 1;
}

.step-wizard__target {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-large);
}

.step-wizard__target-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.step-wizard__target-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.step-wizard__selector {
  font-family: monospace;
  overflow-wrap: anywhere;
}

.step-wizard__detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.step-wizard__manual summary {
  cursor: pointer;
  width: fit-content;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.step-wizard__manual-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.step-wizard__hint {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.step-wizard__spacer {
  flex: 1;
}
</style>
