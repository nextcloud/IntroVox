<template>
  <div class="introvox-admin">
    <!-- Tab Navigation - IntraVox style -->
    <div class="tab-navigation">
      <button
        :class="['tab-button', { active: activeTab === 'settings' }]"
        @click="activeTab = 'settings'">
        <Cog :size="16" />
        <!-- TRANSLATORS: Noun: tab on the administration page with the global settings; keep it short -->
        {{ t('introvox', 'Settings') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'steps' }]"
        @click="activeTab = 'steps'">
        <FormatListNumbered :size="16" />
        <!-- TRANSLATORS: Noun: tab on the administration page with the steps of the tour; keep it short -->
        {{ t('introvox', 'Steps') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'statistics' }]"
        @click="activeTab = 'statistics'">
        <ChartBox :size="16" />
        <!-- TRANSLATORS: Noun: tab and section heading on the administration page; keep it short -->
        {{ t('introvox', 'Statistics') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'support' }]"
        @click="activeTab = 'support'">
        <Lifebuoy :size="16" />
        <!-- TRANSLATORS: Noun: tab on the administration page with help and contact information; keep it short -->
        {{ t('introvox', 'Support') }}
      </button>
    </div>

    <!-- Tab: Instellingen (Settings) -->
    <!-- TRANSLATORS: Section heading on the administration page -->
    <NcSettingsSection :name="t('introvox', 'Global settings')"
      v-if="activeTab === 'settings'"
      :description="t('introvox', 'Configure wizard availability and languages')"
    >
      <NcCheckboxRadioSwitch
        v-model="wizardEnabled"
        type="switch"
      >
        <!-- TRANSLATORS: Label of the main switch: when it is off, the tour does not start by itself -->
        {{ t('introvox', 'Enable wizard for all users') }}
      </NcCheckboxRadioSwitch>
      <p class="settings-hint">
        {{ t('introvox', 'When disabled, the wizard will not automatically start for new users.') }}
      </p>

      <p class="settings-hint language-coverage-hint">
        <!-- TRANSLATORS: %n is the number of languages for which an administrator wrote steps of their own of the welcome tour -->
        {{ n('introvox', 'The tour is auto-translated into every Nextcloud-supported language. %n language currently has an override.', 'The tour is auto-translated into every Nextcloud-supported language. %n languages currently have an override.', overrideLanguages.length) }}
      </p>

      <div class="show-to-all-section">
        <NcButton @click="showToAllUsers" type="warning">
          🔄 {{ t('introvox', 'Show wizard to all users') }}
        </NcButton>
        <p class="settings-hint">
          {{ t('introvox', 'This will reset the wizard for ALL users, including those who have permanently disabled it in their personal settings. Their "disable wizard" preference will be cleared, and the wizard will be shown again on their next login.') }}
        </p>
      </div>
    </NcSettingsSection>

    <!-- Tab: Stappen (Steps) -->
    <!-- TRANSLATORS: Button: opens the steps of a tour -->
    <NcSettingsSection :name="t('introvox', 'Edit steps')"
      v-if="activeTab === 'steps'"
      :description="t('introvox', 'Manage wizard steps for each language')"
    >
      <div class="language-selector-row">
        <NcSelect
          v-model="selectedLanguageObj"
          :options="overrideLanguages"
          label="name"
          @input="onLanguageChange"
          :clearable="false"
        >
          <template #selected-option="{ name }">
            {{ name }}
          </template>
          <template #option="{ name }">
            {{ name }}
          </template>
        </NcSelect>
        <NcButton @click="openAddOverrideDialog" type="secondary">
          <!-- TRANSLATORS: Button and dialog title: write your own steps for one language instead of the translated ones -->
          ➕ {{ t('introvox', 'Add language override') }}
        </NcButton>
      </div>

      <div v-if="showAddOverride" class="add-override-modal">
        <div class="add-override-content">
          <h3>{{ t('introvox', 'Add language override') }}</h3>
          <p class="settings-hint">
            {{ t('introvox', 'Pick a language to customize. Until you save, no data is written.') }}
          </p>
          <!-- TRANSLATORS: Placeholder of a search field in a list of languages -->
          <NcSelect :placeholder="t('introvox', 'Search language …')"
            v-model="pendingOverrideLanguage"
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
          <div class="add-override-actions">
            <NcButton @click="cancelAddOverride">
              <!-- TRANSLATORS: Button: closes a dialog without saving -->
              {{ t('introvox', 'Cancel') }}
            </NcButton>
            <NcButton type="primary" :disabled="!pendingOverrideLanguage" @click="confirmAddOverride">
              <!-- TRANSLATORS: Button: confirms adding a language override -->
              {{ t('introvox', 'Add override') }}
            </NcButton>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <NcButton @click="addStep" type="primary">
          <!-- TRANSLATORS: Button: adds a step to the tour -->
          ➕ {{ t('introvox', 'Add step') }}
        </NcButton>
        <NcButton @click="exportSteps">
          <!-- TRANSLATORS: Button (verb): downloads the steps of this language as a file -->
          📥 {{ t('introvox', 'Export') }}
        </NcButton>
        <NcButton @click="triggerImport">
          <!-- TRANSLATORS: Button (verb): loads steps from a file -->
          📤 {{ t('introvox', 'Import') }}
        </NcButton>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          @change="handleImportFile"
          style="display: none"
        />
        <NcButton @click="resetToDefault" type="error">
          <!-- TRANSLATORS: Button (verb): deletes the steps written for this language, so the translated default steps come back -->
          🔄 {{ t('introvox', 'Reset') }}
        </NcButton>
        <NcButton @click="saveSteps" type="success" :disabled="!hasChanges">
          <!-- TRANSLATORS: Button: saves the changes that could not be saved before -->
          💾 {{ t('introvox', 'Save changes') }}
        </NcButton>
      </div>
    </NcSettingsSection>

    <div v-if="activeTab === 'steps' && loading" class="loading">
      <!-- TRANSLATORS: Shown while data is loading -->
      {{ t('introvox', 'Loading …') }}
    </div>

    <div v-else-if="activeTab === 'steps'" ref="stepsListRef" class="steps-list">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{ editing: editingStep === step.id }"
      >
        <div class="step-header">
          <!-- TRANSLATORS: Invisible label (for screen readers) of the drag handle of a step -->
          <div class="drag-handle" :title="t('introvox', 'Drag to reorder')">
            ⋮⋮
          </div>
          <h3>
            <!-- TRANSLATORS: {number} is the position of the step in the tour: 1, 2, 3 -->
            <span class="step-number">{{ t('introvox', 'Step {number}', { number: index + 1 }) }}</span>
            <span class="step-title" :class="{ 'step-disabled': !step.enabled }">{{ step.title }}</span>
            <!-- TRANSLATORS: {id} is the technical identifier of a step, such as "files" or "new_1728470000000" -->
            <span class="step-id">{{ t('introvox', 'ID: {id}', { id: step.id }) }}</span>
          </h3>
          <div class="step-actions">
            <label class="toggle-checkbox" :title="switchLabel(step.enabled)">
              <input type="checkbox" v-model="step.enabled" @change="markChanged" />
              <span class="toggle-label">{{ step.enabled ? '✓' : '✗' }}</span>
            </label>
            <button @click="editStep(step)" class="icon-button">
              <!-- TRANSLATORS: Button (verb): opens the step for editing -->
              ✏️ {{ t('introvox', 'Edit') }}
            </button>
            <button @click="deleteStep(step.id)" class="icon-button delete">
              <!-- TRANSLATORS: Button (verb): deletes a step or a tour -->
              🗑️ {{ t('introvox', 'Delete') }}
            </button>
          </div>
        </div>

        <div v-if="editingStep === step.id" class="step-editor">
          <div class="form-group">
            <!-- TRANSLATORS: Label of a read-only field with the technical identifier of a step -->
            <label>{{ t('introvox', 'ID (not editable)') }}</label>
            <input type="text" :value="step.id" disabled class="disabled-input" />
          </div>

          <div class="form-group">
            <!-- TRANSLATORS: Noun: label of the text field for the title of a checklist task or a step -->
            <label>{{ t('introvox', 'Title') }} *</label>
            <input :placeholder="titlePlaceholder"
              v-model="editingData.title"
              type="text"
              required
            />
          </div>

          <div class="form-group">
            <!-- TRANSLATORS: Label of the field for the text of a step, which is written in HTML -->
            <label>{{ t('introvox', 'Text (HTML)') }} *</label>
            <!-- TRANSLATORS: Placeholder of the field for the HTML text of a step -->
            <textarea :placeholder="t('introvox', 'HTML content placeholder')"
              v-model="editingData.text"
              rows="6"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>{{ t('introvox', 'Attach to element (CSS selector)') }}</label>
            <input
              v-model="editingData.attachTo"
              type="text"
              :placeholder="t('introvox', 'For example: {example}', {example: '.app-menu__waffle, .unified-search-input, #user-menu'})"
            />
            <small class="hint">{{ t('introvox', 'Leave empty for a centered step.') }}</small>
            <small class="hint">{{ t('introvox', 'Tip: most apps and settings live inside menus (the apps "waffle" top-left, the avatar top-right) and only exist in the page once opened. Point at the always-visible button instead — e.g. .app-menu__waffle for apps, #user-menu for settings, .unified-search-input for search.') }}</small>
          </div>

          <div class="form-group" v-if="editingData.attachTo">
            <!-- TRANSLATORS: Noun: label of four choices for where the step shows next to its element -->
            <label>{{ t('introvox', 'Position') }}</label>
            <select v-model="editingData.position">
              <!-- TRANSLATORS: Choice: the step shows to the right of its element; keep it short -->
              <option value="right">{{ t('introvox', 'Right') }}</option>
              <!-- TRANSLATORS: Choice: the step shows to the left of its element; keep it short -->
              <option value="left">{{ t('introvox', 'Left') }}</option>
              <!-- TRANSLATORS: Choice: the step shows above its element; keep it short -->
              <option value="top">{{ t('introvox', 'Top') }}</option>
              <!-- TRANSLATORS: Choice: the step shows below its element; keep it short -->
              <option value="bottom">{{ t('introvox', 'Bottom') }}</option>
            </select>
          </div>

          <div class="form-group">
            <!-- TRANSLATORS: Label of a list of groups that get this step -->
            <label>{{ t('introvox', 'Visible to groups') }}</label>
            <!-- TRANSLATORS: Placeholder of the list of groups: when no group is chosen, everyone gets it -->
            <NcSelect :placeholder="t('introvox', 'All users (no restriction)')"
              v-model="editingData.visibleToGroups"
              :options="availableGroups"
              :multiple="true"
              label="displayName"
              track-by="id"
              :reduce="group => group.id"
              :close-on-select="false"
            />
            <small class="hint">{{ t('introvox', 'Leave empty to show to all users, or select groups to restrict visibility') }}</small>
          </div>

          <div class="editor-actions">
            <button @click="saveEdit" class="primary">
              <!-- TRANSLATORS: Button (verb): saves the changes -->
              ✓ {{ t('introvox', 'Save') }}
            </button>
            <button @click="cancelEdit" class="secondary">
              ✗ {{ t('introvox', 'Cancel') }}
            </button>
          </div>
        </div>

        <div v-else class="step-preview">
          <div class="preview-text" v-html="step.text"></div>
          <div v-if="step.attachTo" class="preview-meta">
            <!-- TRANSLATORS: Label, followed by the CSS selector of the element the step points at, such as "#user-menu" -->
            <span>📍 {{ t('introvox', 'Element:') }} <code>{{ step.attachTo }}</code></span>
            <!-- TRANSLATORS: Label, followed by where the step shows next to its element: Right, Left, Top or Bottom -->
            <span>📐 {{ t('introvox', 'Position:') }} {{ positionLabel(step.position) }}</span>
          </div>
          <div v-else class="preview-meta">
            <!-- TRANSLATORS: Status: the step shows in the middle of the screen, not next to an element -->
            <span>📍 {{ t('introvox', 'Centered step') }}</span>
          </div>
          <div class="preview-meta">
            <!-- TRANSLATORS: Label, followed by a comma-separated list of groups, or "All users" -->
            <span>👥 {{ t('introvox', 'Visible to:') }} {{ formatGroupNames(step.visibleToGroups) }}</span>
          </div>
        </div>
      </div>

      <div v-if="steps.length === 0" class="empty-state">
        <!-- TRANSLATORS: Shown when a tour has no steps in this language -->
        <p>{{ t('introvox', 'No steps defined yet.') }}</p>
        <button @click="addStep" class="primary">
          <!-- TRANSLATORS: Button: adds the first step to an empty tour -->
          {{ t('introvox', 'Add first step') }}
        </button>
      </div>
    </div>

    <!-- Tab: Statistieken (Statistics) -->
    <NcSettingsSection
      v-if="activeTab === 'statistics'"
      :name="t('introvox', 'Statistics')"
      :description="t('introvox', 'Wizard usage statistics and telemetry settings')"
    >
      <div v-if="statisticsLoading" class="loading">
        {{ t('introvox', 'Loading …') }}
      </div>

      <div v-else class="statistics-content">
        <!-- Wizard Statistics -->
        <!-- TRANSLATORS: Heading of the tour usage figures -->
        <h3 class="section-title">📊 {{ t('introvox', 'Wizard usage') }}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ statistics.usersStartedWizard || 0 }}</span>
            <!-- TRANSLATORS: Label under a number: how many people started the tour -->
            <span class="stat-label">{{ t('introvox', 'Users started') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ statistics.usersCompletedWizard || 0 }}</span>
            <!-- TRANSLATORS: Label under a number: how many people finished the tour -->
            <span class="stat-label">{{ t('introvox', 'Users completed') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ statistics.wizardSkippedCount || 0 }}</span>
            <!-- TRANSLATORS: Label under a number: how often the tour was skipped -->
            <span class="stat-label">{{ t('introvox', 'Times skipped') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ completionRateText }}</span>
            <!-- TRANSLATORS: Label under a percentage: how many of the people who started the tour finished it -->
            <span class="stat-label">{{ t('introvox', 'Completion rate') }}</span>
          </div>
        </div>

        <!-- Instance Statistics -->
        <!-- TRANSLATORS: Heading of figures about this Nextcloud server -->
        <h3 class="section-title">🖥️ {{ t('introvox', 'Instance information') }}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ statistics.totalUsers || 0 }}</span>
            <!-- TRANSLATORS: Label under a number: how many accounts this Nextcloud has -->
            <span class="stat-label">{{ t('introvox', 'Total users') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ statistics.activeUsers30d || 0 }}</span>
            <!-- TRANSLATORS: Label under a number: accounts that logged in during the last 30 days. "30d" means 30 days -->
            <span class="stat-label">{{ t('introvox', 'Active users (30d)') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalStepsCount }}</span>
            <!-- TRANSLATORS: Label under a number: how many steps all tours have together -->
            <span class="stat-label">{{ t('introvox', 'Total steps') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ (statistics.languagesWithOverrides || []).length }}</span>
            <!-- TRANSLATORS: Label under a number: languages for which an administrator wrote steps of their own -->
            <span class="stat-label">{{ t('introvox', 'Languages with overrides') }}</span>
          </div>
        </div>

        <!-- Telemetry Settings - IntraVox style -->
        <!-- TRANSLATORS: Section heading -->
        <h3 class="section-title">{{ t('introvox', 'Anonymous usage statistics') }}</h3>
        <p class="settings-hint">
          {{ t('introvox', 'Help improve IntroVox by sharing anonymous usage statistics.') }}
        </p>

        <div class="telemetry-settings">
          <div class="engagement-option">
            <NcCheckboxRadioSwitch
              type="switch"
              :model-value="telemetryEnabled"
              @update:model-value="toggleTelemetry"
            >
              <div class="option-info">
                <!-- TRANSLATORS: Label of a switch that turns the anonymous usage statistics on or off -->
                <span class="option-label">{{ t('introvox', 'Share anonymous usage statistics') }}</span>
                <span class="option-desc">{{ t('introvox', 'We collect: step counts per language, user counts, version info (IntroVox, Nextcloud, PHP), and basic server configuration. No personal data or step content is shared.') }}</span>
              </div>
            </NcCheckboxRadioSwitch>
          </div>

          <div v-if="telemetryEnabled" class="telemetry-info">
            <NcNoteCard type="success">
              <p>{{ t('introvox', 'Thank you for helping improve IntroVox!') }}</p>
              <p v-if="statistics.lastTelemetrySent">
                <!-- TRANSLATORS: {date} is a date and time, such as "10/9/2026, 11:30:00 AM", or the word "Never" -->
                {{ t('introvox', 'Last report sent: {date}', { date: formatDate(statistics.lastTelemetrySent) }) }}
              </p>
              <NcButton type="secondary"
                :disabled="sendingTelemetry"
                @click="sendTelemetryNow">
                <template v-if="sendingTelemetry">
                  <!-- TRANSLATORS: Button label while the report is being sent -->
                  {{ t('introvox', 'Sending …') }}
                </template>
                <template v-else>
                  <!-- TRANSLATORS: Button: sends the anonymous usage report now -->
                  {{ t('introvox', 'Send report now') }}
                </template>
              </NcButton>
            </NcNoteCard>
          </div>

          <div class="telemetry-details">
            <!-- TRANSLATORS: Heading of a list of the data the anonymous usage statistics contain -->
            <h4>{{ t('introvox', 'What we collect:') }}</h4>
            <ul>
              <li>{{ t('introvox', 'Step counts per language (e.g., EN: 8, NL: 5)') }}</li>
              <li>{{ t('introvox', 'Total user count and active users') }}</li>
              <li>{{ t('introvox', 'IntroVox, Nextcloud, and PHP version numbers') }}</li>
              <li>{{ t('introvox', 'A unique hash of your instance URL (privacy-friendly identifier)') }}</li>
              <li>{{ t('introvox', 'Basic server configuration (database, OS, web server, language, timezone)') }}</li>
            </ul>
            <!-- TRANSLATORS: Heading of a list of data the anonymous usage statistics never contain -->
            <h4>{{ t('introvox', 'What we never collect:') }}</h4>
            <ul class="not-collected">
              <!-- TRANSLATORS: Item in a list of data the usage statistics never contain -->
              <li>{{ t('introvox', 'Step content or titles') }}</li>
              <li>{{ t('introvox', 'User names or email addresses') }}</li>
              <!-- TRANSLATORS: Item in a list of data the usage statistics never contain -->
              <li>{{ t('introvox', 'Your actual server URL') }}</li>
              <!-- TRANSLATORS: Item in a list of data the usage statistics never contain -->
              <li>{{ t('introvox', 'Any personal or sensitive data') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </NcSettingsSection>

    <!-- Tab: Support -->
    <SupportSettings v-if="activeTab === 'support'" />

    <div v-if="message" class="message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCanonicalLocale, translate, translatePlural } from '@nextcloud/l10n'
import { showSuccess, showError, showWarning, showInfo, showConfirmation } from '@nextcloud/dialogs'
import '@nextcloud/dialogs/style.css'
import Sortable from 'sortablejs'

import { NcSettingsSection, NcCheckboxRadioSwitch, NcSelect, NcButton, NcNoteCard } from '@nextcloud/vue'

// Material Design Icons - same as IntraVox
import Cog from 'vue-material-design-icons/Cog.vue'
import FormatListNumbered from 'vue-material-design-icons/FormatListNumbered.vue'
import ChartBox from 'vue-material-design-icons/ChartBox.vue'
import Lifebuoy from 'vue-material-design-icons/Lifebuoy.vue'

import SupportSettings from '../components/SupportSettings.vue'

export default {
  name: 'AdminApp',
  components: {
    NcSettingsSection,
    NcCheckboxRadioSwitch,
    NcSelect,
    NcButton,
    NcNoteCard,
    Cog,
    FormatListNumbered,
    ChartBox,
    Lifebuoy,
    SupportSettings
  },
  setup() {
    const steps = ref([])
    const loading = ref(true)
    const editingStep = ref(null)
    const editingData = ref({})
    const message = ref(null)
    const hasChanges = ref(false)
    const originalSteps = ref([])
    const wizardEnabled = ref(true)
    const stepsListRef = ref(null)
    const selectedLanguage = ref('en')
    // TRANSLATORS: The language name, shown in a language list when the list of languages could not be loaded
    const overrideLanguages = ref([{ code: 'en', name: t('introvox', 'English') }])
    const fileInputRef = ref(null)
    const allLanguages = ref([])
    const availableGroups = ref([])
    const showAddOverride = ref(false)
    const pendingOverrideLanguage = ref(null)

    // Tab navigation
    const activeTab = ref('settings')

    // Statistics
    const statistics = ref({})
    const statisticsLoading = ref(false)
    const telemetryEnabled = ref(false)
    const sendingTelemetry = ref(false)

    // Computed completion rate
    const completionRate = computed(() => {
      const started = statistics.value.usersStartedWizard || 0
      const completed = statistics.value.usersCompletedWizard || 0
      if (started === 0) return 0
      return Math.round((completed / started) * 100)
    })
    // As text, in the user's locale: "50 %" in French, "50%" in English
    const percentFormat = new Intl.NumberFormat(getCanonicalLocale(), { style: 'percent' })
    const completionRateText = computed(() => percentFormat.format(completionRate.value / 100))

    // Computed total steps count (sum of all languages)
    const totalStepsCount = computed(() => {
      if (!statistics.value.totalSteps) return 0
      return Object.values(statistics.value.totalSteps).reduce((a, b) => a + b, 0)
    })

    // Computed property for NcSelect — selected option in the override-dropdown
    const selectedLanguageObj = computed({
      get: () => overrideLanguages.value.find(lang => lang.code === selectedLanguage.value)
        || allLanguages.value.find(lang => lang.code === selectedLanguage.value),
      set: (val) => {
        if (val && val.code) {
          selectedLanguage.value = val.code
        }
      }
    })

    // Languages an admin can still add as override (all Transifex langs minus those that already have an override)
    const addableLanguages = computed(() => {
      const existing = new Set(overrideLanguages.value.map(l => l.code))
      return allLanguages.value.filter(l => !existing.has(l.code))
    })

    // Load available languages from backend
    const loadAvailableLanguages = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/languages'))
        if (response.data.success && response.data.languages) {
          allLanguages.value = response.data.languages
        }
      } catch (error) {
        // Fallback to English only if loading fails
        allLanguages.value = [{ code: 'en', name: t('introvox', 'English') }]
        showWarning(t('introvox', 'Could not load available languages, using English only'))
      }
    }

    // Load available groups for group visibility selection
    const loadAvailableGroups = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/groups'))
        if (response.data.success && response.data.groups) {
          availableGroups.value = response.data.groups
        }
      } catch (error) {
        availableGroups.value = []
      }
    }

    const loadSteps = async () => {
      try {
        loading.value = true
        const response = await axios.get(generateUrl('/apps/introvox/admin/steps'), {
          params: { lang: selectedLanguage.value }
        })
        steps.value = response.data.steps
        originalSteps.value = JSON.parse(JSON.stringify(response.data.steps))
        hasChanges.value = false
      } catch (error) {
        // TRANSLATORS: Error message; {error} is the technical reason, in English
        showError(t('introvox', 'Error loading steps: {error}', {error: error.message}))
      } finally {
        loading.value = false
      }
    }

    const loadStepsForLanguage = async () => {
      if (hasChanges.value) {
        const confirmed = await showConfirmation({
          // TRANSLATORS: Title of a dialog that asks whether to discard changes
          name: t('introvox', 'Unsaved changes'),
          text: t('introvox', 'You have unsaved changes. Do you want to discard them?'),
        })
        if (confirmed) {
          await loadSteps()
        }
      } else {
        await loadSteps()
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
          hasChanges.value = true
        }
      })
    }

    const loadGlobalSettings = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/settings'))
        wizardEnabled.value = response.data.enabled === true
      } catch (error) {
        // Use defaults on error (e.g., 404 on fresh install before app is fully initialized)
        wizardEnabled.value = true
        showInfo(t('introvox', 'Using default settings. Save your changes to persist them.'))
      }
    }

    const loadOverrides = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/overrides'))
        if (response.data.success && Array.isArray(response.data.overrides)) {
          overrideLanguages.value = response.data.overrides
        }
      } catch (error) {
        overrideLanguages.value = [{ code: 'en', name: t('introvox', 'English') }]
      }
    }

    const onLanguageChange = async (value) => {
      if (hasChanges.value) {
        const confirmed = await showConfirmation({
          name: t('introvox', 'Unsaved changes'),
          text: t('introvox', 'You have unsaved changes. Do you want to discard them?'),
        })
        if (!confirmed) {
          return
        }
      }
      selectedLanguage.value = value.code
      await loadSteps()
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
      // In-memory only — actual DB row appears when admin clicks Save changes
      if (!overrideLanguages.value.find(l => l.code === lang.code)) {
        overrideLanguages.value = [...overrideLanguages.value, lang].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      }
      selectedLanguage.value = lang.code
      showAddOverride.value = false
      pendingOverrideLanguage.value = null
      await loadSteps()
    }

    const saveGlobalSettings = async () => {
      try {
        await axios.post(generateUrl('/apps/introvox/admin/settings'), {
          enabled: wizardEnabled.value
        })
        // TRANSLATORS: Message after a setting was saved
        showSuccess(t('introvox', 'Global settings saved'))
      } catch (error) {
        // TRANSLATORS: Shown in an error message when the server gave no reason
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
        showError(t('introvox', 'Error saving global settings: {error}', { error: errorMsg }))
      }
    }

    const showToAllUsers = async () => {
      // Show Nextcloud confirmation dialog
      const confirmed = await showConfirmation({
        name: t('introvox', 'Show wizard to all users'),
        text: t('introvox', 'This will show the wizard again to all users who have already seen it. Continue?'),
      })
      if (!confirmed) {
        return
      }

      try {
        await axios.post(generateUrl('/apps/introvox/admin/settings'), {
          enabled: wizardEnabled.value,
          showToAll: true
        })
        showSuccess(t('introvox', 'Wizard will be shown to all users on their next login'))
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
        showError(t('introvox', 'Error triggering show to all: {error}', { error: errorMsg }))
      }
    }

    const addStep = () => {
      const newStep = {
        id: 'new_' + Date.now(),
        // TRANSLATORS: Dialog title, and the title a new step gets until you change it
        title: t('introvox', 'New step'),
        // TRANSLATORS: The text a new step gets until you change it
        text: '<p>' + t('introvox', 'Description of this step …') + '</p>',
        attachTo: '',
        position: 'right',
        enabled: true,
        visibleToGroups: []
      }
      steps.value.push(newStep)
      editStep(newStep)
      hasChanges.value = true

      // Scroll to the new step
      nextTick(() => {
        const stepElements = document.querySelectorAll('.step-item')
        const lastStep = stepElements[stepElements.length - 1]
        if (lastStep) {
          lastStep.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }

    const markChanged = () => {
      hasChanges.value = true
    }

    const editStep = (step) => {
      editingStep.value = step.id
      editingData.value = { ...step }
    }

    const saveEdit = () => {
      const index = steps.value.findIndex(s => s.id === editingStep.value)
      if (index !== -1) {
        steps.value[index] = { ...editingData.value }
        hasChanges.value = true
      }
      editingStep.value = null
      editingData.value = {}
    }

    const cancelEdit = () => {
      // If it's a new step that hasn't been saved, remove it
      if (editingStep.value && editingStep.value.startsWith('new_')) {
        steps.value = steps.value.filter(s => s.id !== editingStep.value)
      }
      editingStep.value = null
      editingData.value = {}
    }

    const deleteStep = async (id) => {
      const confirmed = await showConfirmation({
        // TRANSLATORS: Title of the dialog that asks whether to delete a step
        name: t('introvox', 'Delete step'),
        text: t('introvox', 'Are you sure you want to delete this step?'),
      })
      if (confirmed) {
        steps.value = steps.value.filter(s => s.id !== id)
        hasChanges.value = true
      }
    }

    const saveSteps = async () => {
      try {
        loading.value = true
        await axios.post(generateUrl('/apps/introvox/admin/steps'), {
          steps: steps.value,
          lang: selectedLanguage.value
        })
        // TRANSLATORS: Message after the steps were saved
        showSuccess(t('introvox', 'Steps saved'))
        hasChanges.value = false
        originalSteps.value = JSON.parse(JSON.stringify(steps.value))
        // New override may have been created; refresh the dropdown
        await loadOverrides()
      } catch (error) {
        // TRANSLATORS: Error message; {error} is the technical reason, in English
        showError(t('introvox', 'Error saving: {error}', {error: error.message}))
      } finally {
        loading.value = false
      }
    }

    const resetToDefault = async () => {
      const confirmed = await showConfirmation({
        // TRANSLATORS: Title of the dialog that asks whether to delete the steps written for this language
        name: t('introvox', 'Discard override'),
        text: t('introvox', 'Discard the custom steps for this language and fall back to the auto-translated defaults?'),
      })
      if (confirmed) {
        try {
          loading.value = true
          const langBeingReset = selectedLanguage.value
          await axios.post(generateUrl('/apps/introvox/admin/reset'), {
            lang: langBeingReset
          })
          await loadOverrides()
          // If we just removed the currently selected non-English language, jump back to English
          if (langBeingReset !== 'en' && !overrideLanguages.value.find(l => l.code === langBeingReset)) {
            selectedLanguage.value = 'en'
          }
          await loadSteps()
          showSuccess(t('introvox', 'Override discarded — language now uses auto-translated defaults'))
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
          // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
          showError(t('introvox', 'Error resetting: {error}', { error: errorMsg }))
        } finally {
          loading.value = false
        }
      }
    }

    const exportSteps = async () => {
      try {
        loading.value = true
        const response = await axios.post(generateUrl('/apps/introvox/admin/export'), {
          lang: selectedLanguage.value
        })

        if (response.data.success) {
          // Create a blob and download the file
          const blob = new Blob([response.data.data], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = response.data.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          // TRANSLATORS: Message after the steps were downloaded as a file
          showSuccess(t('introvox', 'Steps exported'))
        } else {
          // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
          showError(t('introvox', 'Error exporting steps: {error}', { error: response.data.error }))
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        showError(t('introvox', 'Error exporting steps: {error}', { error: errorMsg }))
      } finally {
        loading.value = false
      }
    }

    const triggerImport = () => {
      if (fileInputRef.value) {
        fileInputRef.value.click()
      }
    }

    const handleImportFile = async (event) => {
      const file = event.target.files[0]
      if (!file) {
        return
      }

      try {
        loading.value = true
        const fileContent = await file.text()

        const response = await axios.post(generateUrl('/apps/introvox/admin/import'), {
          fileContent: fileContent
        })

        if (response.data.success) {
          showSuccess(
            // TRANSLATORS: %n is the number of imported steps; {language} is a language code, such as "de" or "pt_BR"
            n('introvox', 'Imported %n step ({language})', 'Imported %n steps ({language})', response.data.stepsCount, {
              language: response.data.language
            })
          )

          // If imported language is different from current, switch to it
          if (response.data.language !== selectedLanguage.value) {
            selectedLanguage.value = response.data.language
          }

          // Reload steps to show imported data
          await loadSteps()
        } else {
          // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
          showError(t('introvox', 'Error importing steps: {error}', { error: response.data.error }))
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        showError(t('introvox', 'Error importing steps: {error}', { error: errorMsg }))
      } finally {
        loading.value = false
        // Reset file input
        if (fileInputRef.value) {
          fileInputRef.value.value = ''
        }
      }
    }

    const showMessage = (text, type = 'info') => {
      message.value = { text, type }
      setTimeout(() => {
        message.value = null
      }, 5000)
    }

    // Translation helper.
    //
    // App id first, and every call-site passes it literally. That is not
    // decoration: the Nextcloud Transifex extractor runs xgettext with
    // --keyword=t:2 over the <script> block and matches a literal t() call
    // with the app id as its first argument in <template>, so a wrapper with an implicit app id makes every string it
    // wraps invisible to translators. This file once had 38 such calls and all
    // of them were untranslatable.
    const t = (app, key, vars = {}) => {
      return translate(app, key, vars)
    }
    const n = (app, singular, plural, count, vars = {}) => translatePlural(app, singular, plural, count, vars)

    // Load statistics from backend
    const loadStatistics = async () => {
      try {
        statisticsLoading.value = true
        const response = await axios.get(generateUrl('/apps/introvox/admin/statistics'))
        if (response.data.success) {
          statistics.value = response.data.statistics
          // Telemetry enabled status comes from telemetry object, not statistics
          telemetryEnabled.value = response.data.telemetry?.enabled || false
          // Store last sent time in statistics for display
          if (response.data.telemetry?.lastReport) {
            statistics.value.lastTelemetrySent = response.data.telemetry.lastReport
          }
        }
      } catch (error) {
        // TRANSLATORS: Error message
        showError(t('introvox', 'Error loading statistics'))
      } finally {
        statisticsLoading.value = false
      }
    }

    // Toggle telemetry setting
    const toggleTelemetry = async (enabled) => {
      try {
        const response = await axios.post(generateUrl('/apps/introvox/admin/telemetry'), {
          enabled: enabled
        })
        if (response.data.success) {
          telemetryEnabled.value = enabled
          showSuccess(enabled
            // TRANSLATORS: Message after the anonymous usage statistics were switched on
            ? t('introvox', 'Telemetry enabled')
            // TRANSLATORS: Message after the anonymous usage statistics were switched off
            : t('introvox', 'Telemetry disabled'))
        }
      } catch (error) {
        // Revert the switch
        telemetryEnabled.value = !enabled
        // TRANSLATORS: Error message
        showError(t('introvox', 'Error saving telemetry setting'))
      }
    }

    // Send telemetry now
    const sendTelemetryNow = async () => {
      try {
        sendingTelemetry.value = true
        const response = await axios.post(generateUrl('/apps/introvox/admin/telemetry/send'))
        if (response.data.success) {
          // TRANSLATORS: Message after the usage report was sent
          showSuccess(t('introvox', 'Statistics sent'))
          // Reload statistics to update last sent time
          await loadStatistics()
        } else {
          // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
          showError(t('introvox', 'Error sending statistics: {error}', { error: response.data.error || t('introvox', 'Unknown error') }))
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        showError(t('introvox', 'Error sending statistics: {error}', { error: errorMsg }))
      } finally {
        sendingTelemetry.value = false
      }
    }

    // Format date helper
    const formatDate = (timestamp) => {
      // TRANSLATORS: Shown instead of a date when no report was sent yet
      if (!timestamp) return t('introvox', 'Never')
      const date = new Date(timestamp * 1000)
      return date.toLocaleString(getCanonicalLocale())
    }

    // The switch of a step, for screen readers. One string per line, so
    // each keeps its own translator hint.
    const switchLabel = (enabled) => (enabled
      // TRANSLATORS: Status: invisible label (for screen readers) of the switch of a step that is on
      ? t('introvox', 'Enabled')
      // TRANSLATORS: Status: invisible label (for screen readers) of the switch of a step that is off
      : t('introvox', 'Disabled'))

    // In script, one string per line, so each keeps its own translator hint
    // TRANSLATORS: Placeholder of a text field; {example} is an example value, such as "/apps/spreed/" or a step title
    const titlePlaceholder = t('introvox', 'For example: {example}', {
      // TRANSLATORS: An example title of a step, shown in a placeholder: "For example: 👋 Welcome to Nextcloud"
      example: '👋 ' + t('introvox', 'Welcome to Nextcloud'),
    })

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
        const group = availableGroups.value.find(g => g.id === id)
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

    // Watch for wizard enabled changes and save immediately
    let isInitializing = true
    watch(wizardEnabled, async (newVal, oldVal) => {
      // Skip saving during initial load
      if (isInitializing) {
        return
      }

      if (newVal !== oldVal) {
        await saveGlobalSettings()
      }
    })

    // Watch for tab changes and load statistics when statistics tab is selected
    watch(activeTab, async (newTab) => {
      if (newTab === 'statistics' && Object.keys(statistics.value).length === 0) {
        await loadStatistics()
      }
    })

    const initializeAdmin = async () => {
      await loadAvailableLanguages()
      await loadAvailableGroups()
      await loadOverrides()
      await loadGlobalSettings()
      await loadSteps()
      isInitializing = false
    }
    initializeAdmin()

    return {
      steps,
      loading,
      editingStep,
      editingData,
      message,
      hasChanges,
      wizardEnabled,
      stepsListRef,
      selectedLanguage,
      selectedLanguageObj,
      overrideLanguages,
      addableLanguages,
      allLanguages,
      availableGroups,
      showAddOverride,
      pendingOverrideLanguage,
      openAddOverrideDialog,
      cancelAddOverride,
      confirmAddOverride,
      loadAvailableLanguages,
      loadAvailableGroups,
      loadOverrides,
      formatGroupNames,
      positionLabel,
      switchLabel,
      titlePlaceholder,
      onLanguageChange,
      saveGlobalSettings,
      showToAllUsers,
      loadStepsForLanguage,
      addStep,
      editStep,
      saveEdit,
      cancelEdit,
      deleteStep,
      saveSteps,
      resetToDefault,
      exportSteps,
      triggerImport,
      handleImportFile,
      fileInputRef,
      markChanged,
      // Tab navigation
      activeTab,
      // Statistics
      statistics,
      statisticsLoading,
      telemetryEnabled,
      sendingTelemetry,
      completionRate,
      completionRateText,
      totalStepsCount,
      loadStatistics,
      toggleTelemetry,
      sendTelemetryNow,
      formatDate,
      t,
      n
    }
  }
}
</script>

<style scoped>
.introvox-admin {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.settings-hint {
  color: var(--color-text-maxcontrast);
  margin-top: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.language-coverage-hint {
  margin-top: 16px;
}

.add-override-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.add-override-content {
  background: var(--color-main-background);
  color: var(--color-main-text);
  padding: 24px;
  border-radius: var(--border-radius-large, 12px);
  min-width: 360px;
  max-width: 480px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.add-override-content h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.add-override-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.show-to-all-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.show-to-all-section .settings-hint {
  margin-top: 8px;
  max-width: 600px;
}

.language-selector-row {
  margin-bottom: 20px;
  max-width: 300px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* Custom button styles for edit buttons */
.icon-button {
  background: transparent;
  border: none;
  padding: 5px 10px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-main-text);
  transition: color 0.2s;
}

.icon-button:hover {
  color: var(--color-primary-element);
}

.icon-button.delete:hover {
  color: var(--color-error);
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--color-text-lighter);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.drag-handle {
  cursor: grab;
  user-select: none;
  font-size: 20px;
  color: var(--color-text-maxcontrast);
  padding: 4px 8px;
  line-height: 1;
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
  font-size: 15px;
  font-weight: bold;
}

.step-number {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
  padding: 2px 6px;
  border-radius: var(--border-radius);
  font-size: 11px;
  font-weight: bold;
}

.step-title {
  font-size: 15px;
  font-weight: bold;
}

.step-id {
  font-size: 12px;
  color: var(--color-text-lighter);
  font-weight: normal;
  font-family: monospace;
}

.step-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.toggle-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  padding: 5px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toggle-checkbox:hover {
  background-color: var(--color-background-hover);
}

.toggle-checkbox input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.toggle-label {
  font-size: 14px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}

.step-disabled {
  opacity: 0.5;
  text-decoration: line-through;
}

.step-editor {
  border-top: 1px solid var(--color-border);
  padding-top: 15px;
  margin-top: 10px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
  color: var(--color-main-text);
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-main-background);
  color: var(--color-main-text);
  font-family: inherit;
}

.form-group textarea {
  font-family: monospace;
  resize: vertical;
}

.disabled-input {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-background-dark);
}

.hint {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--color-text-lighter);
}

.editor-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
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

.preview-text p:first-child {
  margin-top: 0;
}

.preview-text p:last-child {
  margin-bottom: 0;
}

.preview-meta {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: var(--color-text-lighter);
}

.preview-meta code {
  background: var(--color-background-dark);
  padding: 2px 4px;
  border-radius: var(--border-radius);
  font-family: monospace;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-lighter);
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 20px;
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 10000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.message.success {
  background: #46ba61;
  color: white;
}

.message.error {
  background: #e9322d;
  color: white;
}

.message.info {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
}

/* Drag and drop styles */
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

/* Removed old custom section styles - using NcSettingsSection now */

/* Tab Navigation - IntraVox style */
.tab-navigation {
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--color-text-lighter);
  font-size: 14px;
  transition: all 0.2s ease;
}

.tab-button:hover:not(.active) {
  background: var(--color-background-hover);
}

.tab-button.active {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-element-light);
}

/* Statistics Section */
.statistics-content {
  padding: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 16px 0;
  color: var(--color-main-text);
}

.section-title:first-child {
  margin-top: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-background-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-large, 10px);
  padding: 20px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary-element);
  line-height: 1.2;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: var(--color-text-maxcontrast);
  margin-top: 8px;
}

/* Telemetry section - IntraVox style */
.telemetry-settings {
  margin-top: 20px;
}

.engagement-option {
  margin-bottom: 16px;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label {
  font-weight: 600;
}

.option-desc {
  font-size: 13px;
  color: var(--color-text-maxcontrast);
}

.telemetry-info {
  margin-top: 16px;
}

.telemetry-info p {
  margin: 0;
}

.telemetry-info p + p {
  margin-top: 8px;
}

.telemetry-details {
  margin-top: 24px;
  padding: 16px;
  background: var(--color-background-hover);
  border-radius: var(--border-radius-large);
}

.telemetry-details h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-main-text);
}

.telemetry-details h4:not(:first-child) {
  margin-top: 20px;
}

.telemetry-details ul {
  margin: 0;
  padding-left: 24px;
  color: var(--color-text-maxcontrast);
}

.telemetry-details ul li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.telemetry-details ul.not-collected {
  list-style: none;
  padding-left: 0;
  color: var(--color-main-text);
}

.telemetry-details ul.not-collected li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.telemetry-details ul.not-collected li::before {
  content: '✓';
  color: var(--color-success-text, #2d7b43);
  font-weight: 600;
  flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .tab-navigation {
    flex-direction: column;
    gap: 0;
  }

  .tab-button {
    width: 100%;
    justify-content: flex-start;
    border-bottom: none;
    border-left: 2px solid transparent;
    padding: 10px 16px;
    font-size: 14px;
  }

  .tab-button.active {
    border-bottom: none;
    border-left-color: var(--color-primary);
  }

  .telemetry-details {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
