<template>
  <div class="tour-editor">
    <NcSettingsSection
      :name="title"
      :description="t('introvox', 'Manage the steps of this tour for each language')"
    >
      <div class="tour-editor-bar">
        <NcButton variant="tertiary" @click="close">
          <template #icon>
            <ArrowLeft :size="20" />
          </template>
          <!-- TRANSLATORS: Button: back to the list of all tours -->
          {{ t('introvox', 'All tours') }}
        </NcButton>
        <NcButton v-if="tour.id !== 'welcome'" variant="tertiary" @click="$emit('settings')">
          <template #icon>
            <Cog :size="20" />
          </template>
          {{ t('introvox', 'Tour settings') }}
        </NcButton>
      </div>
      <div class="language-selector-row">
        <!-- input-id, not id: NcSelect renders its own search input, so :id
             lands on a wrapper div and the label would point at something
             that is not a form control -- the select then has no
             accessible name at all. -->
        <label class="language-selector-row__label" for="introvox-language-select">
          <!-- TRANSLATORS: Noun: label of the list of languages -->
          {{ t('introvox', 'Language') }}
        </label>
        <!-- update:model-value, not @input: NcSelect never sends input, and
             the listener fell through to the search box as a DOM event. -->
        <NcSelect
          :model-value="selectedLanguageObj"
          input-id="introvox-language-select"
          :options="overrideLanguages"
          label="name"
          :clearable="false"
          @update:model-value="onLanguageChange"
        >
          <template #selected-option="{ name }">
            {{ name }}
          </template>
          <template #option="{ name }">
            {{ name }}
          </template>
        </NcSelect>
        <NcButton @click="openAddOverrideDialog">
          <template #icon>
            <Translate :size="20" />
          </template>
          <!-- TRANSLATORS: Button and dialog title: write your own steps for one language instead of the translated ones -->
          {{ t('introvox', 'Add language override') }}
        </NcButton>
      </div>

      <NcDialog
        v-model:open="showAddOverride"
        :name="t('introvox', 'Add language override')"
      >
        <p class="add-override__hint">
          {{ t('introvox', 'Pick a language to customize. Until you save, no data is written.') }}
        </p>
        <label class="hidden-visually" for="introvox-add-override-select">
          {{ t('introvox', 'Language') }}
        </label>
        <!-- TRANSLATORS: Placeholder of a search field in a list of languages -->
        <NcSelect :placeholder="t('introvox', 'Search language …')"
          v-model="pendingOverrideLanguage"
          input-id="introvox-add-override-select"
          :options="addableLanguages"
          label="name"
          :clearable="false"
        >
          <template #selected-option="{ name }">
            {{ name }}
          </template>
          <template #option="{ name }">
            {{ name }}
          </template>
        </NcSelect>
        <template #actions>
          <NcButton @click="cancelAddOverride">
            {{ t('introvox', 'Cancel') }}
          </NcButton>
          <NcButton variant="primary" :disabled="!pendingOverrideLanguage" @click="confirmAddOverride">
            <!-- TRANSLATORS: Button: confirms adding a language override -->
            {{ t('introvox', 'Add override') }}
          </NcButton>
        </template>
      </NcDialog>

      <div class="action-buttons">
        <NcButton class="introvox-admin__add" variant="primary" :disabled="!stepsLoaded" @click="addStep">
          <template #icon>
            <Plus :size="20" />
          </template>
          <!-- TRANSLATORS: Button: adds a step to the tour -->
          {{ t('introvox', 'Add step') }}
        </NcButton>
        <NcButton class="introvox-admin__preview" :disabled="!stepsLoaded || steps.length === 0" @click="openPreview()">
          <template #icon>
            <Play :size="20" />
          </template>
          <!-- TRANSLATORS: Button: shows the whole tour as users get it -->
          {{ t('introvox', 'Preview tour') }}
        </NcButton>
        <template v-if="assistantAvailable">
          <NcButton :disabled="!stepsLoaded || steps.length === 0" @click="assistant = 'translate'">
            <template #icon>
              <Creation :size="20" />
            </template>
            {{ t('introvox', 'Translate with AI') }}
          </NcButton>
          <NcButton :disabled="!stepsLoaded" @click="assistant = 'draft'">
            <template #icon>
              <Creation :size="20" />
            </template>
            {{ t('introvox', 'Write steps with AI') }}
          </NcButton>
        </template>
        <NcButton @click="exportSteps">
          <template #icon>
            <Download :size="20" />
          </template>
          <!-- TRANSLATORS: Button (verb): downloads the steps of this language as a file -->
          {{ t('introvox', 'Export') }}
        </NcButton>
        <NcButton @click="triggerImport">
          <template #icon>
            <Upload :size="20" />
          </template>
          <!-- TRANSLATORS: Button (verb): loads steps from a file -->
          {{ t('introvox', 'Import') }}
        </NcButton>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          @change="handleImportFile"
          style="display: none"
        />
        <NcButton variant="error" @click="resetToDefault">
          <template #icon>
            <Restore :size="20" />
          </template>
          <!-- TRANSLATORS: Button (verb): deletes the steps written for this language, so the translated default steps come back -->
          {{ t('introvox', 'Reset') }}
        </NcButton>
        <NcButton
          v-if="hasChanges"
          variant="success"
          :disabled="saving"
          @click="persistSteps({ notify: true })">
          <template #icon>
            <NcLoadingIcon v-if="saving" :size="20" />
            <ContentSave v-else :size="20" />
          </template>
          <!-- TRANSLATORS: Button: saves the changes that could not be saved before -->
          {{ t('introvox', 'Save changes') }}
        </NcButton>
      </div>
    </NcSettingsSection>

    <div v-if="loading" class="loading">
      <NcLoadingIcon :size="32" :name="t('introvox', 'Loading …')" />
    </div>

    <!-- A failed load must not look like an empty tour: every change is saved
         straight away, so adding a step to that empty list would replace the
         whole tour for this language. -->
    <NcEmptyContent
      v-else-if="!stepsLoaded"
      :name="t('introvox', 'The steps could not be loaded.')"
      :description="t('introvox', 'Nothing was changed. Check the connection and try again.')">
      <template #icon>
        <FormatListNumbered />
      </template>
      <template #action>
        <NcButton @click="loadSteps">
          <template #icon>
            <Replay :size="20" />
          </template>
          <!-- TRANSLATORS: Button: loads the steps again -->
          {{ t('introvox', 'Try again') }}
        </NcButton>
      </template>
    </NcEmptyContent>

    <div v-else ref="stepsListRef" class="steps-list">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{ editing: editingStep === step.id }"
      >
        <div class="step-header">
          <!-- TRANSLATORS: Invisible label (for screen readers) of the drag handle of a step -->
          <div class="drag-handle" role="img" :aria-label="t('introvox', 'Drag to reorder')">
            <DragVertical :size="20" />
          </div>
          <!-- The same move as the drag handle, for keyboard and screen
               reader: a pointer drag reaches neither. -->
          <div class="step-move">
            <!-- TRANSLATORS: Invisible label (for screen readers) of an arrow button that moves the step one place up -->
            <NcButton variant="tertiary-no-background" :aria-label="t('introvox', 'Move step up')"
              :disabled="index === 0"
              @click="moveStep(index, -1)">
              <template #icon>
                <ChevronUp :size="20" />
              </template>
            </NcButton>
            <!-- TRANSLATORS: Invisible label (for screen readers) of an arrow button that moves the step one place down -->
            <NcButton variant="tertiary-no-background" :aria-label="t('introvox', 'Move step down')"
              :disabled="index === steps.length - 1"
              @click="moveStep(index, 1)">
              <template #icon>
                <ChevronDown :size="20" />
              </template>
            </NcButton>
          </div>
          <h3>
            <!-- TRANSLATORS: {number} is the position of the step in the tour: 1, 2, 3 -->
            <span class="step-number">{{ t('introvox', 'Step {number}', { number: index + 1 }, undefined, TEXT) }}</span>
            <span class="step-title" :class="{ 'step-disabled': !step.enabled }">{{ step.title }}</span>
            <!-- TRANSLATORS: {id} is the technical identifier of a step, such as "files" or "new_1728470000000" -->
            <span class="step-id">{{ t('introvox', 'ID: {id}', { id: step.id }, undefined, TEXT) }}</span>
          </h3>
          <div class="step-actions">
            <NcCheckboxRadioSwitch
              v-model="step.enabled"
              :aria-label="switchLabel(step.enabled)"
              type="switch"
              @update:model-value="persistSteps()"
            />
            <NcButton variant="tertiary" @click="editStep(step)">
              <template #icon>
                <Pencil :size="20" />
              </template>
              <!-- TRANSLATORS: Button (verb): opens the step for editing -->
              {{ t('introvox', 'Edit') }}
            </NcButton>
            <NcButton variant="tertiary" @click="deleteStep(step.id)">
              <template #icon>
                <TrashCanOutline :size="20" />
              </template>
              <!-- TRANSLATORS: Button (verb): deletes a step or a tour -->
              {{ t('introvox', 'Delete') }}
            </NcButton>
          </div>
        </div>

        <div class="step-preview">
          <img v-if="step.media && !isVideo(step.media.file)"
            class="preview-media"
            :src="mediaUrl(step.media.file)"
            :alt="step.media.alt || ''">
          <video v-else-if="step.media"
            class="preview-media"
            :src="mediaUrl(step.media.file)"
            :aria-label="step.media.alt || undefined"
            muted
            preload="metadata" />
          <div class="preview-text" v-html="sanitizeStepHtml(step.text)"></div>
          <div v-if="step.page" class="preview-meta">
            <!-- TRANSLATORS: Label, followed by the address of the page the step is on, such as "/apps/spreed/" -->
            <span><Web :size="16" /> {{ t('introvox', 'Page:') }} <code>{{ step.page }}</code></span>
          </div>
          <div v-if="step.attachTo" class="preview-meta">
            <!-- TRANSLATORS: Label, followed by the CSS selector of the element the step points at, such as "#user-menu" -->
            <span><Crosshairs :size="16" /> {{ t('introvox', 'Element:') }} <code>{{ step.attachTo }}</code></span>
            <!-- TRANSLATORS: Label, followed by where the step shows next to its element: Right, Left, Top or Bottom -->
            <span><TooltipOutline :size="16" /> {{ t('introvox', 'Position:') }} {{ positionLabel(step.position) }}</span>
            <!-- TRANSLATORS: Label, followed by the CSS selector of the menu button the tour clicks before the step -->
            <span v-if="step.openFirst"><MenuOpen :size="16" /> {{ t('introvox', 'Opens first:') }} <code>{{ step.openFirst }}</code></span>
            <!-- TRANSLATORS: Status: users go on by clicking the element instead of pressing Next -->
            <span v-if="step.advance === 'click'"><CursorDefaultClickOutline :size="16" /> {{ t('introvox', 'Continues on click') }}</span>
          </div>
          <div v-else class="preview-meta">
            <span><FormatAlignCenter :size="16" /> {{ t('introvox', 'Centered step') }}</span>
          </div>
          <div class="preview-meta">
            <!-- TRANSLATORS: Label, followed by a comma-separated list of groups, or "All users" -->
            <span><AccountGroupOutline :size="16" /> {{ t('introvox', 'Visible to:') }} {{ formatGroupNames(step.visibleToGroups) }}</span>
          </div>
        </div>
      </div>

      <!-- TRANSLATORS: Shown when a tour has no steps in this language -->
      <NcEmptyContent v-if="steps.length === 0" :name="t('introvox', 'No steps defined yet.')">
        <template #icon>
          <FormatListNumbered />
        </template>
        <template #action>
          <NcButton variant="primary" @click="addStep">
            <template #icon>
              <Plus :size="20" />
            </template>
            <!-- TRANSLATORS: Button: adds the first step to an empty tour -->
            {{ t('introvox', 'Add first step') }}
          </NcButton>
        </template>
      </NcEmptyContent>
    </div>

    <AssistantDialog
      v-if="assistant"
      :mode="assistant"
      :tour="tour"
      :language="selectedLanguageObj"
      :languages="languages"
      :existing="overrideLanguages.map(l => l.code)"
      :write="assistant === 'translate' ? saveTranslation : addSteps"
      @close="assistant = null"
    />

    <TourPreview
      v-if="preview"
      :steps="preview.steps"
      :start-page="preview.startPage || ''"
      :groups="groups"
      @close="preview = null"
    />

    <StepWizard
      v-if="stepBeingEdited"
      ref="wizardRef"
      :key="stepBeingEdited.id"
      :step="stepBeingEdited"
      :is-new="stepBeingEdited.id === unsavedNewStepId"
      :groups="groups"
      :saving="saving"
      :start-page="tourPage"
      @save="saveEdit"
      @cancel="cancelEdit"
    />
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { showConfirmation, showError } from '@nextcloud/dialogs'
import Sortable from 'sortablejs'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcDialog from '@nextcloud/vue/components/NcDialog'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import NcSelect from '@nextcloud/vue/components/NcSelect'
import NcSettingsSection from '@nextcloud/vue/components/NcSettingsSection'

import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Crosshairs from 'vue-material-design-icons/Crosshairs.vue'
import Creation from 'vue-material-design-icons/Creation.vue'
import CursorDefaultClickOutline from 'vue-material-design-icons/CursorDefaultClickOutline.vue'
import Download from 'vue-material-design-icons/Download.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import FormatAlignCenter from 'vue-material-design-icons/FormatAlignCenter.vue'
import FormatListNumbered from 'vue-material-design-icons/FormatListNumbered.vue'
import MenuOpen from 'vue-material-design-icons/MenuOpen.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Play from 'vue-material-design-icons/Play.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Replay from 'vue-material-design-icons/Replay.vue'
import Restore from 'vue-material-design-icons/Restore.vue'
import TooltipOutline from 'vue-material-design-icons/TooltipOutline.vue'
import Translate from 'vue-material-design-icons/Translate.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import Web from 'vue-material-design-icons/Web.vue'

import TourPreview from '../preview/TourPreview.vue'
import { triggerPage } from '../utils/pages.mjs'
import { sanitizeStepHtml } from '../utils/stepHtml.js'
import { isVideo, mediaUrl } from '../utils/stepMedia.js'
import AssistantDialog from './AssistantDialog.vue'
import StepWizard from './StepWizard.vue'
import { useAssistant } from './useAssistant.js'
import { useStepFiles } from './useStepFiles.js'
import { useStepSaving } from './useStepSaving.js'
import { isStepEnabled } from '../utils/steps.mjs'
import { centerScroll } from '../utils/motion.js'

/**
 * The steps of one tour, in one language at a time: add, edit (StepWizard),
 * reorder, switch on and off, delete, preview, and per-language reset,
 * export and import. Every change is saved straight away.
 *
 * AdminApp mounts one per open tour (keyed by its id) and may call addStep()
 * and ready() on it: the admin intro waits for ready() before it points at
 * the editor.
 */
export default {
  name: 'TourEditor',
  components: {
    AccountGroupOutline,
    ArrowLeft,
    AssistantDialog,
    ChevronDown,
    ChevronUp,
    Cog,
    ContentSave,
    Creation,
    Crosshairs,
    CursorDefaultClickOutline,
    Download,
    DragVertical,
    FormatAlignCenter,
    FormatListNumbered,
    MenuOpen,
    NcButton,
    NcCheckboxRadioSwitch,
    NcDialog,
    NcEmptyContent,
    NcLoadingIcon,
    NcSelect,
    NcSettingsSection,
    Pencil,
    Play,
    Plus,
    Replay,
    Restore,
    StepWizard,
    TooltipOutline,
    TourPreview,
    Translate,
    TrashCanOutline,
    Upload,
    Web
  },
  props: {
    // The tour, as the Tours list has it
    tour: {
      type: Object,
      required: true
    },
    // [{ code, name }]: every language, for "Add language override"
    languages: {
      type: Array,
      default: () => []
    },
    // [{ id, displayName }]
    groups: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'settings'],
  setup(props, { emit }) {
    const tourId = computed(() => props.tour.id)
    // TRANSLATORS: Name of the tour new users get after their first login
    const title = computed(() => (props.tour.id === 'welcome' ? t('introvox', 'Welcome tour') : props.tour.name))
    // An app tour's own page: new steps, the picker and the preview go there
    const tourPage = computed(() => (props.tour.id === 'welcome' ? '' : triggerPage(props.tour.trigger)))

    const steps = ref([])
    // Whether steps holds what the server has. Until then nothing may be saved.
    const stepsLoaded = ref(false)
    const loading = ref(true)
    const editingStep = ref(null)
    const hasChanges = ref(false)
    const stepsListRef = ref(null)
    // A tour for an app opens in its main language
    const selectedLanguage = ref(props.tour.id === 'welcome' ? 'en' : props.tour.mainLanguage)
    const overrideLanguages = ref([{ code: 'en', name: t('introvox', 'English') }])
    const showAddOverride = ref(false)
    const pendingOverrideLanguage = ref(null)
    const wizardRef = ref(null)
    // { steps, startPage } while the tour preview is open
    const preview = ref(null)
    // "Add step" creates the step locally; it is only written once its
    // editor is saved. Cancelling removes exactly this one step.
    const unsavedNewStepId = ref(null)
    // translate or draft while AssistantDialog is open
    const assistant = ref(null)
    const { available: assistantAvailable, loadAvailable: loadAssistant } = useAssistant()

    // The selected option in the language dropdown
    const selectedLanguageObj = computed(() =>
      overrideLanguages.value.find(lang => lang.code === selectedLanguage.value)
        || props.languages.find(lang => lang.code === selectedLanguage.value))

    // Languages an admin can still add an override for
    const addableLanguages = computed(() => {
      const existing = new Set(overrideLanguages.value.map(l => l.code))
      return props.languages.filter(l => !existing.has(l.code))
    })

    const loadSteps = async () => {
      const lang = selectedLanguage.value
      const tour = tourId.value
      // Another language or tour was picked meanwhile; its own load fills
      // the list
      const stale = () => lang !== selectedLanguage.value || tour !== tourId.value
      // Nothing may be saved from a list that is being replaced (persistSteps)
      stepsLoaded.value = false
      try {
        loading.value = true
        const response = await axios.get(generateUrl('/apps/introvox/admin/steps'), {
          params: { lang, tour }
        })
        if (stale()) {
          return
        }
        // Imported configurations may carry enabled as "false" or 0; the
        // tour treats those as off (WizardManager), so the switch must too.
        steps.value = response.data.steps.map(step => ({
          ...step,
          enabled: isStepEnabled(step)
        }))
        hasChanges.value = false
        stepsLoaded.value = true
        unsavedNewStepId.value = null
        closeEditor()
      } catch (error) {
        if (stale()) {
          return
        }
        stepsLoaded.value = false
        steps.value = []
        // TRANSLATORS: Error message; {error} is the technical reason, in English
        showError(t('introvox', 'Error loading steps: {error}', {error: error.message}))
      } finally {
        if (!stale()) {
          loading.value = false
        }
      }
    }

    const initSortable = () => {
      if (!stepsListRef.value) {
        return
      }

      if (stepsListRef.value._sortable) {
        return
      }

      stepsListRef.value._sortable = Sortable.create(stepsListRef.value, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'step-item-ghost',
        dragClass: 'step-item-drag',
        forceFallback: true,
        onEnd: (evt) => {
          // Don't do anything if position hasn't changed
          if (evt.oldIndex === evt.newIndex) {
            return
          }

          // Create a new array with reordered items to trigger Vue reactivity
          const newSteps = [...steps.value]
          const movedItem = newSteps.splice(evt.oldIndex, 1)[0]
          newSteps.splice(evt.newIndex, 0, movedItem)

          // Replace the entire array to ensure Vue detects the change
          steps.value = newSteps
          persistSteps()
        }
      })
    }

    // Reordering must not be drag-only: a pointer drag is unusable by
    // keyboard and by a screen reader, so the same move is available as two
    // buttons that write through the same path Sortable's onEnd does.
    const moveStep = (index, delta) => {
      const target = index + delta
      if (target < 0 || target >= steps.value.length) {
        return
      }
      const newSteps = [...steps.value]
      const [moved] = newSteps.splice(index, 1)
      newSteps.splice(target, 0, moved)
      steps.value = newSteps
      persistSteps()
    }

    const loadOverrides = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/overrides'), {
          params: { tour: tourId.value }
        })
        if (response.data.success && Array.isArray(response.data.overrides)) {
          overrideLanguages.value = response.data.overrides
        }
      } catch (error) {
        overrideLanguages.value = [{ code: 'en', name: t('introvox', 'English') }]
      }
    }

    // Saves already queued keep their own language and list (persistSteps),
    // so switching never mixes two languages up. hasChanges is a save that
    // failed; switching away discards it.
    const onLanguageChange = async (value) => {
      if (!value?.code || value.code === selectedLanguage.value) {
        return
      }
      if (hasChanges.value) {
        const confirmed = await showConfirmation({
          // TRANSLATORS: Title of a dialog that asks whether to discard changes
          name: t('introvox', 'Unsaved changes'),
          text: t('introvox', 'You have unsaved changes. Do you want to discard them?'),
        })
        if (!confirmed) {
          return
        }
      }
      // The watcher on selectedLanguage loads its steps
      selectedLanguage.value = value.code
    }

    const openAddOverrideDialog = () => {
      pendingOverrideLanguage.value = null
      showAddOverride.value = true
    }

    const cancelAddOverride = () => {
      pendingOverrideLanguage.value = null
      showAddOverride.value = false
    }

    const confirmAddOverride = async () => {
      const lang = pendingOverrideLanguage.value
      if (!lang || !lang.code) {
        return
      }
      // In-memory only — the DB row appears with the first saved change
      if (!overrideLanguages.value.find(l => l.code === lang.code)) {
        overrideLanguages.value = [...overrideLanguages.value, lang].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      }
      // The watcher on selectedLanguage loads its steps
      selectedLanguage.value = lang.code
      showAddOverride.value = false
      pendingOverrideLanguage.value = null
    }

    const discardUnsavedNewStep = () => {
      if (unsavedNewStepId.value) {
        steps.value = steps.value.filter(s => s.id !== unsavedNewStepId.value)
        unsavedNewStepId.value = null
      }
    }

    const addStep = () => {
      discardUnsavedNewStep()
      const newStep = {
        id: 'new_' + Date.now(),
        title: t('introvox', 'New step'),
        // Empty: the editor shows what belongs here (StepTextEditor)
        text: '',
        attachTo: '',
        position: 'right',
        enabled: true,
        visibleToGroups: [],
        // A step of an app tour belongs to its app
        ...(tourPage.value ? { page: tourPage.value } : {})
      }
      steps.value.push(newStep)
      unsavedNewStepId.value = newStep.id
      editStep(newStep)

      // Scroll to the new step
      nextTick(() => {
        const stepElements = document.querySelectorAll('.step-item')
        const lastStep = stepElements[stepElements.length - 1]
        if (lastStep) {
          lastStep.scrollIntoView(centerScroll())
        }
      })
    }

    const editStep = (step) => {
      // Opening another step abandons a new one that was never saved.
      if (unsavedNewStepId.value && unsavedNewStepId.value !== step.id) {
        discardUnsavedNewStep()
      }
      editingStep.value = step.id
    }

    const stepBeingEdited = computed(() => steps.value.find(s => s.id === editingStep.value) || null)

    const closeEditor = () => {
      editingStep.value = null
    }

    // The wizard hands over the finished step (StepWizard)
    const saveEdit = async (data) => {
      const index = steps.value.findIndex(s => s.id === editingStep.value)
      if (index !== -1) {
        steps.value[index] = data
      }
      if (unsavedNewStepId.value === editingStep.value) {
        unsavedNewStepId.value = null
      }
      closeEditor()
      await persistSteps({ notify: true })
    }

    // Only a step that was never saved goes away. Saved steps created with
    // "Add step" keep their new_… id for good, so the id says nothing.
    const cancelEdit = () => {
      if (editingStep.value === unsavedNewStepId.value) {
        discardUnsavedNewStep()
      }
      closeEditor()
    }

    // The whole tour for the language being edited, as saved. A single step
    // is tested from its wizard instead.
    const openPreview = () => {
      preview.value = { steps: steps.value.filter(s => s.id !== unsavedNewStepId.value), startPage: tourPage.value }
    }

    const deleteStep = async (id) => {
      const confirmed = await showConfirmation({
        // TRANSLATORS: Title of the dialog that asks whether to delete a step
        name: t('introvox', 'Delete step'),
        text: t('introvox', 'Are you sure you want to delete this step?'),
      })
      if (confirmed) {
        steps.value = steps.value.filter(s => s.id !== id)
        if (editingStep.value === id) {
          closeEditor()
        }
        if (unsavedNewStepId.value === id) {
          unsavedNewStepId.value = null
          return
        }
        await persistSteps({ notify: true })
      }
    }

    // Every change is written straight away, like the global settings
    // switch. Edits used to reach the server only through a separate "Save
    // changes" button at the top of the list, and were lost on reload when
    // that was missed. That button now only appears to retry a failed save.
    //
    const { saving, persistSteps, saveTranslation, whenSaved } = useStepSaving({ steps, stepsLoaded, unsavedNewStepId, selectedLanguage, tourId, hasChanges, loadOverrides })

    // New steps checked in AssistantDialog, after the ones there are. Once
    // in the list they are the editor's: a failed save shows "Save changes"
    // like any other change, so the dialog is done either way.
    const addSteps = async (lang, list) => {
      discardUnsavedNewStep()
      steps.value = [...steps.value, ...list]
      await persistSteps()
      return true
    }

    // Warn before leaving with a failed save or an editor with changes.
    const onBeforeUnload = (event) => {
      const editorDirty = !!wizardRef.value?.isDirty()
      if (hasChanges.value || saving.value || editorDirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    const { fileInputRef, resetToDefault, exportSteps, triggerImport, handleImportFile } = useStepFiles({ selectedLanguage, tourId, loading, overrideLanguages, loadSteps, loadOverrides, whenSaved })

    // The switch of a step, for screen readers. One string per line, so
    // each keeps its own translator hint.
    const switchLabel = (enabled) => (enabled
      // TRANSLATORS: Status: invisible label (for screen readers) of the switch of a step that is on
      ? t('introvox', 'Enabled')
      // TRANSLATORS: Status: invisible label (for screen readers) of the switch of a step that is off
      : t('introvox', 'Disabled'))

    const positionLabel = (position) => {
      const labels = {
        right: t('introvox', 'Right'),
        left: t('introvox', 'Left'),
        top: t('introvox', 'Top'),
        bottom: t('introvox', 'Bottom')
      }
      return labels[position] || labels.right
    }

    // Helper function to format group names for display
    const formatGroupNames = (groupIds) => {
      // TRANSLATORS: Shown instead of a list of groups when a step is for everyone
      if (!groupIds || groupIds.length === 0) return t('introvox', 'All users')
      const names = groupIds.map(id => {
        const group = props.groups.find(g => g.id === id)
        return group ? group.displayName : id
      })
      return names.join(', ')
    }

    // Watch for stepsListRef to become available and initialize Sortable
    watch(stepsListRef, (newVal) => {
      if (newVal && !loading.value) {
        nextTick(() => {
          initSortable()
        })
      }
    })

    // Watch for loading to become false and initialize Sortable
    watch(loading, (newVal) => {
      if (!newVal && stepsListRef.value) {
        nextTick(() => {
          initSortable()
        })
      }
    })

    // Watch for language changes and reload steps
    watch(selectedLanguage, async (newLang, oldLang) => {
      if (newLang !== oldLang) {
        await loadSteps()
      }
    })

    // Back to the list once every change is written
    const close = async () => {
      await whenSaved()
      closeEditor()
      emit('close')
    }

    const readyPromise = (async () => {
      await loadOverrides()
      await loadSteps()
    })()
    // For AdminApp: the admin intro points at the editor once it is filled
    const ready = () => readyPromise

    onMounted(() => {
      window.addEventListener('beforeunload', onBeforeUnload)
      loadAssistant()
    })
    onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

    return {
      TEXT,
      t,
      title,
      tourPage,
      steps,
      stepsLoaded,
      loading,
      editingStep,
      hasChanges,
      stepsListRef,
      selectedLanguageObj,
      overrideLanguages,
      addableLanguages,
      fileInputRef,
      showAddOverride,
      pendingOverrideLanguage,
      wizardRef,
      preview,
      saving,
      unsavedNewStepId,
      assistant,
      assistantAvailable,
      saveTranslation,
      addSteps,
      stepBeingEdited,
      sanitizeStepHtml,
      isVideo,
      mediaUrl,
      positionLabel,
      switchLabel,
      formatGroupNames,
      onLanguageChange,
      openAddOverrideDialog,
      cancelAddOverride,
      confirmAddOverride,
      loadSteps,
      addStep,
      editStep,
      saveEdit,
      cancelEdit,
      openPreview,
      deleteStep,
      moveStep,
      persistSteps,
      resetToDefault,
      exportSteps,
      triggerImport,
      handleImportFile,
      close,
      ready
    }
  }
}
</script>

<style scoped>
/* The dialog is rendered outside .introvox-admin, out of reach of the shared hint style */
.add-override__hint {
  margin-bottom: 16px;
  color: var(--color-text-maxcontrast);
}

.language-selector-row {
  margin-bottom: 20px;
  max-width: 300px;
}

.language-selector-row > * + * {
  margin-top: 8px;
}

/* A field label is supporting text for the control under it, and it must bind
   tighter to that control (4px) than fields are spaced apart (8px) -- once the
   per-field rules are gone, proximity is all that says which label belongs to
   which input. */
.language-selector-row__label {
  display: block;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.language-selector-row > .language-selector-row__label + * {
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  margin: 0 28px;
  max-width: 900px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 28px 28px;
  max-width: 900px;
}

.step-item {
  background: var(--color-main-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 16px;
  transition: border-color 0.2s;
}

.step-item.editing {
  border-color: var(--color-primary-element);
}

.step-move {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: grab;
  user-select: none;
  color: var(--color-text-maxcontrast);
  padding: 4px;
  transition: color 0.2s;
  flex-shrink: 0;
}

.drag-handle:hover {
  color: var(--color-main-text);
}

.drag-handle:active {
  cursor: grabbing;
}

.step-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.step-number {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
  padding: 2px 6px;
  border-radius: var(--border-radius);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-heading);
}

.step-title {
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.step-id {
  font-size: var(--font-size-small);
  /* --color-text-lighter is core's deprecated alias for this, set on <body>
     rather than :root. It resolves today, but an alias can be dropped; the
     token it points at is the one to name. */
  color: var(--color-text-maxcontrast);
  font-weight: normal;
  font-family: monospace;
}

.step-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.step-disabled {
  opacity: 0.5;
  text-decoration: line-through;
}

.step-preview {
  margin-top: 10px;
}

.preview-text {
  padding: 8px;
  background: var(--color-background-dark);
  border-radius: var(--border-radius);
  margin-bottom: 8px;
}

.preview-media {
  display: block;
  max-width: 240px;
  max-height: 120px;
  margin-bottom: 8px;
  border-radius: var(--border-radius-large);
  object-fit: contain;
  background: var(--color-background-dark);
}

.preview-text p:first-child {
  margin-top: 0;
}

.preview-text p:last-child {
  margin-bottom: 0;
}

/* Lists as the tour shows them (css/wizard.css). The text comes in through
   v-html, which scoped styles only reach with :deep. */
.preview-text :deep(ul),
.preview-text :deep(ol) {
  margin: 8px 0;
  padding-inline-start: 20px;
}

.preview-text :deep(ul) {
  list-style: disc;
}

.preview-text :deep(ol) {
  list-style: decimal;
}

.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.preview-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-meta code {
  background: var(--color-background-dark);
  padding: 2px 4px;
  border-radius: var(--border-radius);
  font-family: monospace;
}

/* Drag and drop styles; Sortable sets these classes (ghostClass, dragClass) */
.step-item-ghost {
  opacity: 0.4;
  background: var(--color-background-dark);
}

.step-item-drag {
  opacity: 1;
  cursor: grabbing;
  transform: rotate(2deg);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.sortable-chosen .drag-handle {
  cursor: grabbing;
}
</style>
