<template>
  <div ref="rootRef" class="step-text">
    <span :id="labelId" class="step-text__label">{{ label }}</span>
    <div class="step-text__box">
      <!-- mousedown.prevent: a click on a button must not take the focus
           out of the text, or what is typed next goes nowhere -->
      <!-- TRANSLATORS: Invisible label (for screen readers) of the toolbar with the formatting buttons of the text editor -->
      <div class="step-text__toolbar" :aria-label="t('introvox', 'Formatting')"
        role="toolbar"
        @mousedown.prevent>
        <!-- Kept, disabled, in the HTML view: the bar does not jump, and it
             shows the formatting is not what is being edited there -->
        <template v-if="editor">
          <NcButton
            v-for="action in actions"
            :key="action.id"
            variant="tertiary"
            :aria-label="action.label"
            :title="action.label"
            :pressed="!htmlMode && action.active()"
            :disabled="htmlMode"
            @click="action.run">
            <template #icon>
              <component :is="action.icon" :size="20" />
            </template>
          </NcButton>
          <NcEmojiPicker :container="emojiContainer" @select="insertEmoji">
            <!-- TRANSLATORS: Invisible label and tooltip of the emoji button -->
            <NcButton :aria-label="t('introvox', 'Insert emoji')"
              variant="tertiary"
              :disabled="htmlMode"
              :title="t('introvox', 'Insert emoji')">
              <template #icon>
                <EmoticonOutline :size="20" />
              </template>
            </NcButton>
          </NcEmojiPicker>
        </template>
        <!-- TRANSLATORS: Invisible label and tooltip of a button that shows the text as HTML code -->
        <NcButton :aria-label="t('introvox', 'Edit as HTML')"
          class="step-text__mode"
          variant="tertiary"
          :title="t('introvox', 'Edit as HTML')"
          :pressed="htmlMode"
          @click="toggleHtml">
          <template #icon>
            <CodeTags :size="20" />
          </template>
        </NcButton>
      </div>

      <div v-if="linkOpen && !htmlMode" class="step-text__link">
        <!-- TRANSLATORS: Label of the text field for the address (URL) of a link -->
        <NcTextField :label="t('introvox', 'Link address')"
          ref="linkFieldRef"
          v-model="linkHref"
          :error="linkInvalid"
          :helper-text="linkInvalid ? linkHelp : ''"
          @update:model-value="linkInvalid = false"
          @keydown.enter.prevent="applyLink"
          @keydown.esc.stop.prevent="closeLink"
        />
        <NcButton variant="primary" @click="applyLink">
          <!-- TRANSLATORS: Button (verb): applies the link address -->
          {{ t('introvox', 'Apply') }}
        </NcButton>
        <NcButton v-if="editor?.isActive('link')" variant="tertiary" @click="removeLink">
          <template #icon>
            <LinkVariantOff :size="20" />
          </template>
          <!-- TRANSLATORS: Button: removes the link from the text -->
          {{ t('introvox', 'Remove link') }}
        </NcButton>
        <NcButton variant="tertiary" @click="closeLink">
          {{ t('introvox', 'Cancel') }}
        </NcButton>
      </div>

      <textarea
        v-if="htmlMode"
        class="step-text__html"
        :value="modelValue"
        :aria-labelledby="labelId"
        rows="8"
        spellcheck="false"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <!-- v-show: the editor keeps its own DOM while the HTML is shown -->
      <EditorContent v-show="!htmlMode" :editor="editor" />
    </div>
    <p v-if="hidden.length > 0" class="step-text__hidden">
      {{ hiddenNotice }}
    </p>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { NcButton, NcEmojiPicker, NcTextField } from '@nextcloud/vue'
import { EditorContent, Mark, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'

import CodeBraces from 'vue-material-design-icons/CodeBraces.vue'
import CodeTags from 'vue-material-design-icons/CodeTags.vue'
import EmoticonOutline from 'vue-material-design-icons/EmoticonOutline.vue'
import FormatBold from 'vue-material-design-icons/FormatBold.vue'
import FormatHeader3 from 'vue-material-design-icons/FormatHeader3.vue'
import FormatItalic from 'vue-material-design-icons/FormatItalic.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import FormatListNumbered from 'vue-material-design-icons/FormatListNumbered.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'

import { cleanEditorHtml, hiddenHtml, normalizeHref } from './stepTextHtml.mjs'

let lastId = 0

// Small print is in the tour's allowlist, so the editor keeps it; there is
// no button for it, it only comes in with a text that has it.
const Small = Mark.create({
  name: 'small',
  parseHTML: () => [{ tag: 'small' }],
  renderHTML: ({ HTMLAttributes }) => ['small', HTMLAttributes, 0]
})

/**
 * The text of a step, written with formatting instead of HTML. It still
 * stores HTML, so imports, exports and the translated default steps work as
 * before. The editor knows exactly what the tour keeps (utils/stepHtml.js),
 * so it shows a text the way users see it; HTML they never see is left out,
 * and said so (stepTextHtml.mjs). Edit as HTML shows the HTML itself.
 */
export default {
  name: 'StepTextEditor',
  components: {
    CodeTags,
    EditorContent,
    EmoticonOutline,
    LinkVariantOff,
    NcButton,
    NcEmojiPicker,
    NcTextField
  },
  props: {
    // The step text, HTML
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const labelId = `introvox-step-text-${++lastId}`
    const hidden = computed(() => hiddenHtml(props.modelValue))
    const htmlMode = ref(false)
    // In script, one string per line, so each keeps its own translator hint
    const hiddenNotice = computed(() => (htmlMode.value
      // TRANSLATORS: {parts} is a comma-separated list of HTML code, such as "<script>, onclick"
      ? t('introvox', 'The tour removes this HTML, so nobody sees it: {parts}.', { parts: hidden.value.join(', ') }, undefined, TEXT)
      // TRANSLATORS: {parts} is a comma-separated list of HTML code, such as "<script>, onclick"
      : t('introvox', 'This text has HTML that the tour never shows: {parts}. The editor leaves it out, and it goes once you change the text.', { parts: hidden.value.join(', ') }, undefined, TEXT)))
    // TRANSLATORS: Error message; {address} is "nextcloud.com" and {path} is "/apps/files/"
    const linkHelp = t('introvox', 'Use a web address such as {address}, or a path on this Nextcloud such as {path}.', { address: 'nextcloud.com', path: '/apps/files/' }, undefined, TEXT)
    const linkOpen = ref(false)
    const linkHref = ref('')
    const linkInvalid = ref(false)
    const linkFieldRef = ref(null)
    // What the editor sent last, to tell its own updates from outside ones
    let lastEmitted = props.modelValue

    const editor = useEditor({
      content: props.modelValue,
      extensions: [
        Small,
        StarterKit.configure({
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          strike: false,
          // It would add an empty paragraph after a closing list or heading
          trailingNode: false,
          heading: { levels: [3, 4] },
          link: {
            openOnClick: false,
            defaultProtocol: 'https',
            // A link in a step opens in a new tab: following it in the same
            // one would end the tour. The tour adds rel (utils/stepHtml.js).
            HTMLAttributes: { target: '_blank', rel: null, class: null }
          }
        }),
        Placeholder.configure({
          placeholder: t('introvox', 'What should people know at this step?')
        })
      ],
      editorProps: {
        attributes: {
          class: 'step-text__content',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-labelledby': labelId
        }
      },
      onUpdate: ({ editor: current }) => {
        lastEmitted = cleanEditorHtml(current.getHTML())
        emit('update:modelValue', lastEmitted)
      }
    })

    watch(() => props.modelValue, (value) => {
      if (!htmlMode.value && editor.value && value !== lastEmitted) {
        lastEmitted = value
        editor.value.commands.setContent(value || '', { emitUpdate: false })
      }
    })

    const chain = () => editor.value.chain().focus()

    const openLink = () => {
      linkHref.value = editor.value.getAttributes('link').href || ''
      linkInvalid.value = false
      linkOpen.value = true
      nextTick(() => linkFieldRef.value?.focus())
    }

    const closeLink = () => {
      linkOpen.value = false
      editor.value?.commands.focus()
    }

    const applyLink = () => {
      if (!linkHref.value.trim()) {
        removeLink()
        return
      }
      const href = normalizeHref(linkHref.value)
      if (!href) {
        linkInvalid.value = true
        return
      }
      const { empty } = editor.value.state.selection
      if (empty && !editor.value.isActive('link')) {
        // Nothing selected: the address itself becomes the link text
        chain().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
      } else {
        chain().extendMarkRange('link').setLink({ href }).run()
      }
      linkOpen.value = false
    }

    const removeLink = () => {
      chain().extendMarkRange('link').unsetLink().run()
      linkOpen.value = false
    }

    const actions = [
      // TRANSLATORS: Invisible label and tooltip of the bold button in the text editor
      { id: 'bold', label: t('introvox', 'Bold'), icon: FormatBold, active: () => editor.value.isActive('bold'), run: () => chain().toggleBold().run() },
      // TRANSLATORS: Invisible label and tooltip of the italic button in the text editor
      { id: 'italic', label: t('introvox', 'Italic'), icon: FormatItalic, active: () => editor.value.isActive('italic'), run: () => chain().toggleItalic().run() },
      // TRANSLATORS: Invisible label and tooltip of the heading button in the text editor
      { id: 'heading', label: t('introvox', 'Heading'), icon: FormatHeader3, active: () => editor.value.isActive('heading'), run: () => chain().toggleHeading({ level: 3 }).run() },
      // TRANSLATORS: Invisible label and tooltip of the bulleted list button in the text editor
      { id: 'bullets', label: t('introvox', 'Bulleted list'), icon: FormatListBulleted, active: () => editor.value.isActive('bulletList'), run: () => chain().toggleBulletList().run() },
      // TRANSLATORS: Invisible label and tooltip of the numbered list button in the text editor
      { id: 'numbers', label: t('introvox', 'Numbered list'), icon: FormatListNumbered, active: () => editor.value.isActive('orderedList'), run: () => chain().toggleOrderedList().run() },
      // TRANSLATORS: Noun: invisible label and tooltip of the link button in the text editor
      { id: 'link', label: t('introvox', 'Link'), icon: LinkVariant, active: () => editor.value.isActive('link'), run: openLink },
      // TRANSLATORS: Noun: invisible label and tooltip of the button that formats text as program code
      { id: 'code', label: t('introvox', 'Code'), icon: CodeBraces, active: () => editor.value.isActive('code'), run: () => chain().toggleCode().run() }
    ]

    // In a dialog the picker must open inside it: the dialog's focus trap
    // pulls the focus back from anything outside, and its search field
    // could not be typed in.
    const rootRef = ref(null)
    const emojiContainer = ref('body')
    onMounted(() => {
      emojiContainer.value = rootRef.value?.closest('.modal-mask') || 'body'
    })

    // At the cursor, which the editor keeps while the picker has the focus
    const insertEmoji = (emoji) => {
      chain().insertContent(emoji).run()
    }

    const toggleHtml = () => {
      if (htmlMode.value) {
        lastEmitted = props.modelValue
        editor.value.commands.setContent(props.modelValue || '', { emitUpdate: false })
        htmlMode.value = false
        nextTick(() => editor.value.commands.focus())
      } else {
        linkOpen.value = false
        htmlMode.value = true
      }
    }

    return {
      t,
      labelId,
      editor,
      actions,
      rootRef,
      emojiContainer,
      insertEmoji,
      htmlMode,
      hidden,
      hiddenNotice,
      linkHelp,
      toggleHtml,
      linkOpen,
      linkHref,
      linkInvalid,
      linkFieldRef,
      applyLink,
      removeLink,
      closeLink
    }
  }
}
</script>

<style scoped>
.step-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-text__hidden {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.step-text__box {
  border: var(--border-width-input) solid var(--color-border-maxcontrast);
  border-radius: var(--border-radius-element);
  background: var(--color-main-background);
  overflow: hidden;
}

/* The box stands in for one input, so it takes the input's focus ring: the
   toolbar and the text are one field. */
.step-text__box:focus-within {
  border-color: var(--color-main-text);
  box-shadow: 0 0 0 1px var(--color-main-text);
}

.step-text__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border-bottom: 1px solid var(--color-border);
}

.step-text__mode {
  margin-inline-start: auto;
}

.step-text__link {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}

.step-text__link > :first-child {
  flex: 1 1 240px;
}

/* Text sizes and spacing as the tour shows them (css/wizard.css), so what
   the admin sees here is what users get. */
.step-text__box :deep(.step-text__content) {
  width: 100%;
  height: auto;
  min-height: 160px;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  outline: none;
  font-size: var(--default-font-size);
  line-height: 1.7;
  color: var(--color-main-text);
  overflow-wrap: anywhere;
}

/* Core styles every div[contenteditable] as a small input of its own (130px
   wide, 36px high, with a border that changes on hover and focus); here the
   box around the toolbar and the text is the field. */
.step-text__box :deep(.step-text__content:hover),
.step-text__box :deep(.step-text__content:focus),
.step-text__box :deep(.step-text__content:active) {
  border: none;
  box-shadow: none;
  outline: none;
}

.step-text__box :deep(.step-text__content p) {
  margin: 0 0 14px;
}

.step-text__box :deep(.step-text__content p:last-child),
.step-text__box :deep(.step-text__content li p) {
  margin: 0;
}

.step-text__box :deep(.step-text__content h3) {
  margin: 16px 0 4px;
  font-size: 18px;
  font-weight: var(--font-weight-heading);
}

.step-text__box :deep(.step-text__content h4) {
  margin: 12px 0 4px;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.step-text__box :deep(.step-text__content h3:first-child),
.step-text__box :deep(.step-text__content h4:first-child) {
  margin-top: 0;
}

.step-text__box :deep(.step-text__content ul),
.step-text__box :deep(.step-text__content ol) {
  margin: 8px 0;
  padding-inline-start: 20px;
}

.step-text__box :deep(.step-text__content ul) {
  list-style: disc;
}

.step-text__box :deep(.step-text__content ol) {
  list-style: decimal;
}

.step-text__box :deep(.step-text__content li) {
  margin: 4px 0;
}

.step-text__box :deep(.step-text__content a) {
  color: var(--color-primary-element);
  text-decoration: underline;
  font-weight: var(--font-weight-element);
}

.step-text__box :deep(.step-text__content code) {
  padding: 0 4px;
  border-radius: var(--border-radius-small);
  background: var(--color-background-dark);
  font-family: monospace;
}

.step-text__box :deep(.step-text__content p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: inline-start;
  height: 0;
  color: var(--color-text-maxcontrast);
  pointer-events: none;
}

/* Core styles every <textarea> as a field of its own; here the box is the
   field. */
.step-text__box .step-text__html {
  display: block;
  width: 100%;
  min-height: 160px;
  margin: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-family: monospace;
  font-size: var(--default-font-size);
  resize: vertical;
}

.step-text__box .step-text__html:focus,
.step-text__box .step-text__html:hover {
  border: none;
  box-shadow: none;
  outline: none;
}
</style>
