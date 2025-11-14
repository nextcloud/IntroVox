<template>
  <div class="introvox-admin">
    <NcSettingsSection :name="t('Global settings')" :description="t('Configure wizard availability and languages')">
      <NcCheckboxRadioSwitch
        v-model="wizardEnabled"
        type="switch"
      >
        {{ t('Enable wizard for all users') }}
      </NcCheckboxRadioSwitch>
      <p class="settings-hint">
        {{ t('When disabled, the wizard will not automatically start for new users.') }}
      </p>

      <div class="language-settings">
        <label class="language-label">{{ t('Available languages') }}</label>
        <div class="language-grid">
          <label
            v-for="lang in allLanguages"
            :key="lang.code"
            class="language-checkbox-item"
            :class="{
              disabled: isLastLanguage(lang.code),
              enabled: enabledLanguages.includes(lang.code)
            }"
          >
            <input
              type="checkbox"
              :checked="enabledLanguages.includes(lang.code)"
              :disabled="isLastLanguage(lang.code)"
              @change="toggleLanguage(lang.code, $event.target.checked)"
              class="checkbox"
            />
            <span class="language-label-text">
              {{ lang.flag }} {{ lang.name }}
              <span v-if="isLastLanguage(lang.code)" class="language-badge">{{ t('Required') }}</span>
            </span>
          </label>
        </div>
        <p class="settings-hint">{{ t('At least one language must be selected') }}</p>
      </div>

      <div class="show-to-all-section">
        <NcButton @click="showToAllUsers" type="warning">
          🔄 {{ t('Show wizard to all users') }}
        </NcButton>
        <p class="settings-hint">
          {{ t('This will reset the wizard for ALL users, including those who have permanently disabled it in their personal settings. Their "disable wizard" preference will be cleared, and the wizard will be shown again on their next login.') }}
        </p>
      </div>
    </NcSettingsSection>

    <NcSettingsSection :name="t('Edit steps')" :description="t('Manage wizard steps for each language')">
      <div class="language-selector-row">
        <NcSelect
          v-model="selectedLanguageObj"
          :options="availableLanguages"
          label="name"
          @input="onLanguageChange"
          :clearable="false"
        >
          <template #selected-option="{ flag, name }">
            {{ flag }} {{ name }}
          </template>
          <template #option="{ flag, name }">
            {{ flag }} {{ name }}
          </template>
        </NcSelect>
      </div>

      <div class="action-buttons">
        <NcButton @click="addStep" type="primary">
          ➕ {{ t('Add step') }}
        </NcButton>
        <NcButton @click="exportSteps">
          📥 {{ t('Export') }}
        </NcButton>
        <NcButton @click="triggerImport">
          📤 {{ t('Import') }}
        </NcButton>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          @change="handleImportFile"
          style="display: none"
        />
        <NcButton @click="resetToDefault" type="error">
          🔄 {{ t('Reset') }}
        </NcButton>
        <NcButton @click="saveSteps" type="success" :disabled="!hasChanges">
          💾 {{ t('Save changes') }}
        </NcButton>
      </div>
    </NcSettingsSection>

    <div v-if="loading" class="loading">
      {{ t('Loading...') }}
    </div>

    <div v-else ref="stepsListRef" class="steps-list">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{ editing: editingStep === step.id }"
      >
        <div class="step-header">
          <div class="drag-handle" :title="t('Drag to reorder')">
            ⋮⋮
          </div>
          <h3>
            <span class="step-number">{{ t('Step') }} {{ index + 1 }}</span>
            <span class="step-title" :class="{ 'step-disabled': !step.enabled }">{{ step.title }}</span>
            <span class="step-id">ID: {{ step.id }}</span>
          </h3>
          <div class="step-actions">
            <label class="toggle-checkbox" :title="step.enabled ? t('Enabled') : t('Disabled')">
              <input type="checkbox" v-model="step.enabled" @change="markChanged" />
              <span class="toggle-label">{{ step.enabled ? '✓' : '✗' }}</span>
            </label>
            <button @click="editStep(step)" class="icon-button">
              ✏️ {{ t('Edit') }}
            </button>
            <button @click="deleteStep(step.id)" class="icon-button delete">
              🗑️ {{ t('Delete') }}
            </button>
          </div>
        </div>

        <div v-if="editingStep === step.id" class="step-editor">
          <div class="form-group">
            <label>{{ t('ID (not editable)') }}</label>
            <input type="text" :value="step.id" disabled class="disabled-input" />
          </div>

          <div class="form-group">
            <label>{{ t('Title') }} *</label>
            <input
              v-model="editingData.title"
              type="text"
              :placeholder="t('For example: %s', {example: '👋 ' + t('Welcome to Nextcloud')})"
              required
            />
          </div>

          <div class="form-group">
            <label>{{ t('Text (HTML)') }} *</label>
            <textarea
              v-model="editingData.text"
              rows="6"
              placeholder="<p>HTML content...</p>"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>{{ t('Attach to element (CSS selector)') }}</label>
            <input
              v-model="editingData.attachTo"
              type="text"
              :placeholder="t('For example: %s', {example: '#header, .button, [data-id=files]'})"
            />
            <small class="hint">{{ t('Leave empty for a centered step') }}</small>
          </div>

          <div class="form-group" v-if="editingData.attachTo">
            <label>{{ t('Position') }}</label>
            <select v-model="editingData.position">
              <option value="right">{{ t('Right') }}</option>
              <option value="left">{{ t('Left') }}</option>
              <option value="top">{{ t('Top') }}</option>
              <option value="bottom">{{ t('Bottom') }}</option>
            </select>
          </div>

          <div class="editor-actions">
            <button @click="saveEdit" class="primary">
              ✓ {{ t('Save') }}
            </button>
            <button @click="cancelEdit" class="secondary">
              ✗ {{ t('Cancel') }}
            </button>
          </div>
        </div>

        <div v-else class="step-preview">
          <div class="preview-text" v-html="step.text"></div>
          <div v-if="step.attachTo" class="preview-meta">
            <span>📍 Element: <code>{{ step.attachTo }}</code></span>
            <span>📐 {{ t('Position') }}: {{ step.position || 'right' }}</span>
          </div>
          <div v-else class="preview-meta">
            <span>📍 {{ t('Centered step') }}</span>
          </div>
        </div>
      </div>

      <div v-if="steps.length === 0" class="empty-state">
        <p>{{ t('No steps defined yet.') }}</p>
        <button @click="addStep" class="primary">
          {{ t('Add first step') }}
        </button>
      </div>
    </div>

    <div v-if="message" class="message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate } from '@nextcloud/l10n'
import Sortable from 'sortablejs'

import { NcSettingsSection, NcCheckboxRadioSwitch, NcSelect, NcButton } from '@nextcloud/vue'

export default {
  name: 'AdminApp',
  components: {
    NcSettingsSection,
    NcCheckboxRadioSwitch,
    NcSelect,
    NcButton
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
    const enabledLanguages = ref(['en'])
    const fileInputRef = ref(null)
    const allLanguages = ref([])

    // Computed property for NcSelect
    const selectedLanguageObj = computed({
      get: () => allLanguages.value.find(lang => lang.code === selectedLanguage.value),
      set: (val) => {
        if (val && val.code) {
          selectedLanguage.value = val.code
        }
      }
    })

    // Load available languages from backend
    const loadAvailableLanguages = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/languages'))
        if (response.data.success && response.data.languages) {
          allLanguages.value = response.data.languages
          console.log('Loaded available languages:', allLanguages.value)
        }
      } catch (error) {
        console.error('Error loading available languages:', error)
        // Fallback to English only if loading fails
        allLanguages.value = [{ code: 'en', name: 'English', flag: '🇬🇧' }]
        OCP.Toast.warning(trans('Could not load available languages, using English only'))
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
        OCP.Toast.error(trans('Error loading steps: %s', {error: error.message}))
      } finally {
        loading.value = false
      }
    }

    const loadStepsForLanguage = async () => {
      if (hasChanges.value) {
        if (!await OC.dialogs.confirm(
          trans('You have unsaved changes. Do you want to discard them?'),
          trans('Unsaved changes'),
          (result) => result,
          true
        )) {
          return
        }
      }
      await loadSteps()
    }

    const initSortable = () => {
      if (!stepsListRef.value) {
        console.warn('stepsListRef not available yet')
        return
      }

      if (stepsListRef.value._sortable) {
        console.log('Sortable already initialized')
        return
      }

      console.log('Initializing Sortable on:', stepsListRef.value)

      stepsListRef.value._sortable = Sortable.create(stepsListRef.value, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'step-item-ghost',
        dragClass: 'step-item-drag',
        forceFallback: true,
        onStart: (evt) => {
          console.log('Drag started:', evt.oldIndex)
        },
        onEnd: (evt) => {
          console.log('Drag ended. Old:', evt.oldIndex, 'New:', evt.newIndex)

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

          console.log('Steps reordered, hasChanges:', hasChanges.value)
          console.log('New order:', steps.value.map(s => s.id))
        }
      })

      console.log('Sortable initialized successfully')
    }

    const loadGlobalSettings = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/settings'))
        console.log('Loaded global settings from server:', response.data)
        wizardEnabled.value = response.data.enabled === true
        console.log('wizardEnabled.value set to:', wizardEnabled.value)
        if (response.data.enabledLanguages) {
          enabledLanguages.value = response.data.enabledLanguages

          // Set selectedLanguage to first available language if current selection is not enabled
          if (!enabledLanguages.value.includes(selectedLanguage.value)) {
            selectedLanguage.value = enabledLanguages.value[0] || 'en'
            console.log('Selected language not available, switching to:', selectedLanguage.value)
            // Load steps for the new language
            await loadSteps()
          }
        }
      } catch (error) {
        console.error('Error loading global settings:', error)
        // Use defaults on error (e.g., 404 on fresh install before app is fully initialized)
        wizardEnabled.value = true
        enabledLanguages.value = ['en']
        selectedLanguage.value = 'en'
        console.log('Using default settings: wizard enabled, English only')
        OCP.Toast.info(trans('Using default settings. Save your changes to persist them.'))
      }
    }

    const isLastLanguage = (langCode) => {
      return enabledLanguages.value.length === 1 && enabledLanguages.value.includes(langCode)
    }

    const toggleLanguage = async (langCode, checked) => {
      console.log('toggleLanguage called:', { langCode, checked, type: typeof checked })

      if (isLastLanguage(langCode) && !checked) {
        console.log('Prevented disabling last language')
        return // Don't allow disabling the last language
      }

      if (checked) {
        if (!enabledLanguages.value.includes(langCode)) {
          enabledLanguages.value.push(langCode)
          console.log('Added language:', langCode, 'Current languages:', enabledLanguages.value)
        }
      } else {
        const index = enabledLanguages.value.indexOf(langCode)
        if (index > -1) {
          enabledLanguages.value.splice(index, 1)
          console.log('Removed language:', langCode, 'Current languages:', enabledLanguages.value)
        }
      }

      // If only one language is enabled, automatically select it
      if (enabledLanguages.value.length === 1) {
        selectedLanguage.value = enabledLanguages.value[0]
        await loadSteps()
      }

      await saveGlobalSettings()
    }

    const onLanguageChange = async (value) => {
      if (hasChanges.value) {
        if (!await OC.dialogs.confirm(
          trans('You have unsaved changes. Do you want to discard them?'),
          trans('Unsaved changes'),
          (result) => result,
          true
        )) {
          return
        }
      }
      selectedLanguage.value = value.code
      await loadSteps()
    }

    const saveGlobalSettings = async () => {
      try {
        console.log('Saving global settings:', {
          enabled: wizardEnabled.value,
          enabledLanguages: enabledLanguages.value
        })
        const response = await axios.post(generateUrl('/apps/introvox/admin/settings'), {
          enabled: wizardEnabled.value,
          enabledLanguages: enabledLanguages.value
        })
        console.log('Global settings saved:', response.data)
        OCP.Toast.success(trans('Global settings saved'))
      } catch (error) {
        console.error('Error saving global settings:', error)
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
        OCP.Toast.error(trans('Error saving global settings') + ': ' + errorMsg)
      }
    }

    const showToAllUsers = async () => {
      // Show Nextcloud confirmation dialog
      if (!await OC.dialogs.confirm(
        trans('This will show the wizard again to all users who have already seen it. Continue?'),
        trans('Show wizard to all users'),
        (result) => result,
        true
      )) {
        return
      }

      try {
        const response = await axios.post(generateUrl('/apps/introvox/admin/settings'), {
          enabled: wizardEnabled.value,
          enabledLanguages: enabledLanguages.value,
          showToAll: true
        })
        console.log('Wizard version incremented:', response.data)
        OCP.Toast.success(trans('Wizard will be shown to all users on their next login'))
      } catch (error) {
        console.error('Error triggering show to all:', error)
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
        OCP.Toast.error(trans('Error triggering show to all') + ': ' + errorMsg)
      }
    }

    const addStep = () => {
      const newStep = {
        id: 'new_' + Date.now(),
        title: trans('New step'),
        text: '<p>' + trans('Description of this step...') + '</p>',
        attachTo: '',
        position: 'right',
        enabled: true
      }
      steps.value.push(newStep)
      editStep(newStep)
      hasChanges.value = true
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
      if (await OC.dialogs.confirm(
        trans('Are you sure you want to delete this step?'),
        trans('Delete step'),
        (result) => result,
        true
      )) {
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
        OCP.Toast.success(trans('Steps saved successfully!'))
        hasChanges.value = false
        originalSteps.value = JSON.parse(JSON.stringify(steps.value))
      } catch (error) {
        OCP.Toast.error(trans('Error saving: %s', {error: error.message}))
      } finally {
        loading.value = false
      }
    }

    const resetToDefault = async () => {
      if (await OC.dialogs.confirm(
        trans('Are you sure you want to reset to default steps for the selected language? All custom steps will be removed.'),
        trans('Reset to default'),
        (result) => result,
        true
      )) {
        try {
          loading.value = true
          console.log('Resetting to default for language:', selectedLanguage.value)
          const response = await axios.post(generateUrl('/apps/introvox/admin/reset'), {
            lang: selectedLanguage.value
          })
          console.log('Reset response:', response.data)
          await loadSteps()
          console.log('Steps reloaded after reset')
          OCP.Toast.success(trans('Reset to default steps successful!'))
        } catch (error) {
          console.error('Error resetting to default:', error)
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
          OCP.Toast.error(trans('Error resetting') + ': ' + errorMsg)
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

          OCP.Toast.success(trans('Steps exported successfully!'))
        } else {
          OCP.Toast.error(trans('Error exporting steps: %s', { error: response.data.error }))
        }
      } catch (error) {
        console.error('Error exporting steps:', error)
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
        OCP.Toast.error(trans('Error exporting steps') + ': ' + errorMsg)
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
          OCP.Toast.success(
            trans('Successfully imported %s steps for language %s', {
              count: response.data.stepsCount,
              lang: response.data.language
            })
          )

          // If imported language is different from current, switch to it
          if (response.data.language !== selectedLanguage.value) {
            selectedLanguage.value = response.data.language
          }

          // Reload steps to show imported data
          await loadSteps()
        } else {
          OCP.Toast.error(trans('Error importing steps: %s', { error: response.data.error }))
        }
      } catch (error) {
        console.error('Error importing steps:', error)
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
        OCP.Toast.error(trans('Error importing steps') + ': ' + errorMsg)
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

    // Translation helper
    const trans = (key, vars = {}) => {
      return translate('introvox', key, vars)
    }

    // Computed property for available languages based on enabled languages
    const availableLanguages = computed(() => {
      return allLanguages.value.filter(lang => enabledLanguages.value.includes(lang.code))
    })

    // Helper function to check if language is enabled
    const isLanguageEnabled = (langCode) => {
      return enabledLanguages.value.includes(langCode)
    }

    // Helper function to set language enabled state
    const setLanguageEnabled = (langCode, enabled) => {
      console.log('setLanguageEnabled called:', { langCode, enabled })
      toggleLanguage(langCode, enabled)
    }

    // Watch for stepsListRef to become available and initialize Sortable
    watch(stepsListRef, (newVal) => {
      if (newVal && !loading.value) {
        console.log('stepsListRef is now available, initializing Sortable')
        nextTick(() => {
          initSortable()
        })
      }
    })

    // Watch for loading to become false and initialize Sortable
    watch(loading, (newVal) => {
      if (!newVal && stepsListRef.value) {
        console.log('Loading finished, initializing Sortable')
        nextTick(() => {
          initSortable()
        })
      }
    })

    // Watch for language changes and reload steps
    watch(selectedLanguage, async (newLang, oldLang) => {
      if (newLang !== oldLang && enabledLanguages.value.includes(newLang)) {
        console.log(`Language changed from ${oldLang} to ${newLang}, reloading steps...`)
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
        console.log(`Wizard enabled changed from ${oldVal} to ${newVal}, saving...`)
        await saveGlobalSettings()
      }
    })

    // Load global settings first, then steps (loadGlobalSettings will call loadSteps if needed)
    const initializeAdmin = async () => {
      await loadAvailableLanguages()
      await loadGlobalSettings()
      // Only load steps if selectedLanguage is still enabled after loading global settings
      if (enabledLanguages.value.includes(selectedLanguage.value)) {
        await loadSteps()
      }
      // Mark initialization as complete
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
      enabledLanguages,
      allLanguages,
      availableLanguages,
      loadAvailableLanguages,
      isLanguageEnabled,
      setLanguageEnabled,
      isLastLanguage,
      toggleLanguage,
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
      t: trans
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

.language-settings {
  margin-top: 20px;
}

.language-label {
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-main-text);
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.language-checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-main-background);
  position: relative;
}

/* Enabled state - clear visual indication */
.language-checkbox-item.enabled {
  background: var(--color-primary-element-light, rgba(0, 130, 201, 0.08));
  border-color: var(--color-primary-element);
}

.language-checkbox-item.enabled:hover:not(.disabled) {
  background: var(--color-primary-element-light-hover, rgba(0, 130, 201, 0.12));
  border-color: var(--color-primary-element-hover);
}

/* Disabled state (unchecked) */
.language-checkbox-item:not(.enabled) {
  background: var(--color-background-dark, #f5f5f5);
  opacity: 0.7;
}

.language-checkbox-item:hover:not(.disabled):not(.enabled) {
  background: var(--color-background-hover);
  border-color: var(--color-border-dark);
  opacity: 0.9;
}

.language-checkbox-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-background-dark);
  border-style: dashed;
}

.language-checkbox-item .checkbox {
  margin: 0;
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.language-checkbox-item.disabled .checkbox {
  cursor: not-allowed;
}

.language-label-text {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  user-select: none;
  font-weight: 500;
}

/* Enabled languages have bolder text */
.language-checkbox-item.enabled .language-label-text {
  font-weight: 600;
}

.language-badge {
  padding: 2px 8px;
  background: var(--color-warning);
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
</style>
