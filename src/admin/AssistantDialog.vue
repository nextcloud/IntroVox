<template>
  <NcDialog
    :name="dialogName"
    :size="phase === 'review' ? 'large' : 'normal'"
    @update:open="open => { if (!open) close() }">
    <div class="assistant">
      <template v-if="phase === 'ask' && mode === 'translate'">
        <p class="assistant__hint">
          <!-- TRANSLATORS: {language} is a language name, such as "German". "the Assistant" is the Nextcloud Assistant app (AI) -->
          {{ t('introvox', 'The steps in {language} are translated by the Assistant. Only the words change: elements, pages and images stay as they are. You check the translation before it is saved.', { language: language.name }, undefined, TEXT) }}
        </p>
        <!-- TRANSLATORS: Label of a list where you choose the languages to translate into, as in "translate into" -->
        <NcSelect :input-label="t('introvox', 'Into')"
          v-model="targets"
          :options="targetOptions"
          :multiple="true"
          label="name"
          track-by="code"
          :placeholder="targetsPlaceholder"
          :close-on-select="false" />
        <NcNoteCard v-if="replaced.length > 0" type="warning">
          <!-- TRANSLATORS: {languages} is a comma-separated list of language names, such as "German, French" -->
          {{ t('introvox', 'Saving replaces the steps there are now in {languages}.', { languages: replaced.join(', ') }, undefined, TEXT) }}
        </NcNoteCard>
      </template>

      <template v-else-if="phase === 'ask'">
        <p class="assistant__hint">
          <!-- TRANSLATORS: {language} is a language name, such as "German". "The Assistant" is the Nextcloud Assistant app (AI) -->
          {{ t('introvox', 'Describe what the tour should explain. The Assistant writes the steps in {language}; you check them before they are added.', { language: language.name }, undefined, TEXT) }}
        </p>
        <NcTextArea
          v-model="description"
          :label="t('introvox', 'What should the tour explain?')"
          :placeholder="t('introvox', 'For example: how to make a board, add cards to it and share it with your team')"
          :maxlength="maxDescription"
          rows="5"
          resize="vertical" />
        <NcNoteCard type="info">
          {{ t('introvox', 'The new steps show in the middle of the screen. Pick an element for each of them in the editor afterwards.') }}
        </NcNoteCard>
      </template>

      <ul v-else-if="phase === 'work'" class="assistant__progress">
        <li v-for="result in results" :key="result.code">
          <NcLoadingIcon v-if="result.status === 'running'" :size="20" />
          <Check v-else-if="result.status === 'done'" :size="20" />
          <AlertCircleOutline v-else-if="result.status === 'failed'" :size="20" />
          <ClockOutline v-else :size="20" />
          <span>{{ result.name }}</span>
          <span class="assistant__status">{{ statusLabel(result) }}</span>
        </li>
      </ul>

      <template v-else>
        <section v-for="result in results" :key="result.code" class="assistant__result">
          <h3 v-if="mode === 'translate'">
            {{ result.name }}
            <!-- TRANSLATORS: Status: tooltip of a check mark next to a language whose translation was saved -->
            <Check v-if="result.saved" :size="20" :title="t('introvox', 'Saved')" />
          </h3>
          <NcNoteCard v-if="result.status === 'failed'" type="error">
            {{ assistantError(result.error) }}
          </NcNoteCard>
          <ol v-else class="assistant__steps">
            <li v-for="(step, index) in result.steps" :key="step.id">
              <!-- TRANSLATORS: Label of a text field; {number} is the position of the step in the tour: 1, 2, 3 -->
              <NcTextField :label="t('introvox', 'Title of step {number}', { number: index + 1 }, undefined, TEXT)"
                v-model="step.title"
                :error="step.title.trim() === ''" />
              <!-- TRANSLATORS: Label of a text editor; {number} is the position of the step in the tour: 1, 2, 3 -->
              <StepTextEditor v-if="editingText.has(step.id)" :label="t('introvox', 'Text of step {number}', { number: index + 1 }, undefined, TEXT)"
                v-model="step.text"/>
              <div v-else class="assistant__text">
                <div class="assistant__html" v-html="sanitizeStepHtml(step.text)" />
                <NcButton variant="tertiary" @click="editingText.add(step.id)">
                  <template #icon>
                    <Pencil :size="20" />
                  </template>
                  <!-- TRANSLATORS: Button: opens the editor for the text of a step -->
                  {{ t('introvox', 'Edit text') }}
                </NcButton>
              </div>
            </li>
          </ol>
        </section>
      </template>
    </div>

    <template #actions>
      <NcButton @click="close">
        <!-- TRANSLATORS: Button: closes a dialog without saving -->
        {{ t('introvox', 'Cancel') }}
      </NcButton>
      <NcButton v-if="phase === 'ask'"
        variant="primary"
        :disabled="mode === 'translate' ? targets.length === 0 : description.trim() === ''"
        @click="start">
        {{ startLabel }}
      </NcButton>
      <NcButton v-else-if="phase === 'review' && usable.length > 0"
        variant="primary"
        :disabled="saving || !titlesFilled"
        @click="save">
        <template #icon>
          <NcLoadingIcon v-if="saving" :size="20" />
        </template>
        {{ saveLabel }}
      </NcButton>
    </template>
  </NcDialog>
</template>

<script>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { showSuccess } from '@nextcloud/dialogs'
import {
  NcButton,
  NcDialog,
  NcLoadingIcon,
  NcNoteCard,
  NcSelect,
  NcTextArea,
  NcTextField
} from '@nextcloud/vue'

import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Check from 'vue-material-design-icons/Check.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'

import StepTextEditor from './StepTextEditor.vue'
import { useAssistant } from './useAssistant.js'
import { sanitizeStepHtml } from '../utils/stepHtml.js'

// Server side: lib/Service/TourPrompts.php
const MAX_DESCRIPTION = 2000

/**
 * Translating the steps of a tour, or writing new ones from a description,
 * with the Nextcloud Assistant. The admin checks the result here; the editor
 * writes it (write prop), so every save goes through its queue.
 */
export default {
  name: 'AssistantDialog',
  components: {
    AlertCircleOutline,
    Check,
    ClockOutline,
    NcButton,
    NcDialog,
    NcLoadingIcon,
    NcNoteCard,
    NcSelect,
    NcTextArea,
    NcTextField,
    Pencil,
    StepTextEditor
  },
  props: {
    // translate or draft
    mode: {
      type: String,
      required: true
    },
    tour: {
      type: Object,
      required: true
    },
    // { code, name }: the language being edited. What is translated, or
    // what new steps are written in.
    language: {
      type: Object,
      required: true
    },
    // [{ code, name }]: every language
    languages: {
      type: Array,
      default: () => []
    },
    // Codes of the languages that have steps of their own
    existing: {
      type: Array,
      default: () => []
    },
    // (code, steps) => Promise<boolean>: writes checked steps
    write: {
      type: Function,
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { runTask, assistantError } = useAssistant()

    // ask, work, review
    const phase = ref('ask')
    const targets = ref([])
    const description = ref('')
    // [{ code, name, status, error?, steps?, saved? }], one per language
    const results = ref([])
    // Steps whose text is open in the editor rather than shown
    const editingText = reactive(new Set())
    const saving = ref(false)
    let closed = false

    const targetOptions = computed(() => props.languages.filter(l => l.code !== props.language.code))
    const replaced = computed(() => targets.value.filter(l => props.existing.includes(l.code)).map(l => l.name))
    const usable = computed(() => results.value.filter(r => r.status === 'done' && !r.saved))
    const titlesFilled = computed(() => usable.value.every(r => r.steps.every(s => s.title.trim() !== '')))

    // TRANSLATORS: Placeholder of the list of languages to translate into
    const targetsPlaceholder = t('introvox', 'Choose languages')
    // The title and the two buttons depend on the mode. One translation per
    // line, so each string keeps its own translator hint.
    const dialogName = computed(() => (props.mode === 'translate'
      // TRANSLATORS: Dialog title and button: let the Nextcloud Assistant (AI) translate the steps of a tour
      ? t('introvox', 'Translate with AI')
      // TRANSLATORS: Dialog title and button: let the Nextcloud Assistant (AI) write steps from a description
      : t('introvox', 'Write steps with AI')))
    const startLabel = computed(() => (props.mode === 'translate'
      // TRANSLATORS: Button (verb): starts the AI translation
      ? t('introvox', 'Translate')
      // TRANSLATORS: Button: lets the AI write the steps
      : t('introvox', 'Write steps')))
    const saveLabel = computed(() => (props.mode === 'translate'
      // TRANSLATORS: Button: saves the AI translations after you checked them
      ? t('introvox', 'Save translations')
      // TRANSLATORS: Button: adds the steps the AI wrote, after you checked them
      : t('introvox', 'Add steps')))

    const statusLabel = (result) => {
      switch (result.status) {
      case 'running':
        return props.mode === 'translate'
          // TRANSLATORS: Status of one language while the AI is translating it
          ? t('introvox', 'Translating …')
          // TRANSLATORS: Status while the AI is writing the steps
          : t('introvox', 'Writing …')
      case 'done':
        // TRANSLATORS: Status (adjective): a task is finished, such as an AI translation or a checklist task
        return t('introvox', 'Completed')
      case 'failed':
        // TRANSLATORS: Status (adjective) of one language whose AI translation failed
        return t('introvox', 'Failed')
      default:
        // TRANSLATORS: Status of a language whose AI translation has not started yet
        return t('introvox', 'Waiting')
      }
    }

    // One task after another: a provider with a rate limit gets no burst
    const start = async () => {
      const languages = props.mode === 'translate' ? targets.value : [props.language]
      results.value = languages.map(l => ({ code: l.code, name: l.name, status: 'waiting' }))
      phase.value = 'work'
      for (const result of results.value) {
        result.status = 'running'
        const body = props.mode === 'translate'
          ? { tour: props.tour.id, from: props.language.code, to: result.code }
          : { tour: props.tour.id, description: description.value, lang: result.code }
        const answer = await runTask(props.mode, body, () => closed)
        if (answer === null) {
          return
        }
        Object.assign(result, answer.status === 'done'
          ? { status: 'done', steps: answer.steps }
          : { status: 'failed', error: answer.error })
      }
      phase.value = 'review'
    }

    // A language that could not be saved stays, with what was checked
    const save = async () => {
      saving.value = true
      try {
        for (const result of usable.value) {
          if (!await props.write(result.code, result.steps)) {
            return
          }
          result.saved = true
        }
        showSuccess(props.mode === 'translate'
          // TRANSLATORS: "Language" is the label of the list of languages in the step editor
          ? t('introvox', 'Translations saved. Choose a language under Language to see them.')
          // TRANSLATORS: Message after the steps written by the AI were added to the tour
          : t('introvox', 'Steps added'))
        close()
      } finally {
        saving.value = false
      }
    }

    const close = () => {
      closed = true
      emit('close')
    }
    onBeforeUnmount(() => {
      closed = true
    })

    return {
      TEXT,
      assistantError,
      close,
      description,
      editingText,
      maxDescription: MAX_DESCRIPTION,
      phase,
      replaced,
      results,
      sanitizeStepHtml,
      save,
      saving,
      start,
      dialogName,
      targetsPlaceholder,
      startLabel,
      saveLabel,
      statusLabel,
      t,
      targetOptions,
      targets,
      titlesFilled,
      usable
    }
  }
}
</script>

<style scoped>
.assistant {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.assistant__hint {
  margin: 0;
  color: var(--color-text-maxcontrast);
}

.assistant__progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant__progress li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assistant__status {
  color: var(--color-text-maxcontrast);
}

.assistant__result h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
}

.assistant__steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant__steps li {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assistant__text {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--border-radius-large);
  background: var(--color-background-hover);
}

/* A long text wraps; the button keeps its whole label */
.assistant__html {
  flex: 1 1 auto;
  min-width: 0;
}

.assistant__text > .button-vue {
  flex-shrink: 0;
}

/* The step text comes in through v-html, which scoped styles only reach
   with :deep; lists as the tour shows them (css/wizard.css) */
.assistant__html :deep(p) {
  margin: 0 0 8px;
}

.assistant__html :deep(p:last-child) {
  margin-bottom: 0;
}

.assistant__html :deep(ul),
.assistant__html :deep(ol) {
  margin: 8px 0;
  padding-inline-start: 20px;
}

.assistant__html :deep(ul) {
  list-style: disc;
}

.assistant__html :deep(ol) {
  list-style: decimal;
}
</style>
