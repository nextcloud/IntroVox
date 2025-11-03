<template>
  <div class="introvox-admin">
    <div class="global-settings">
      <h3>🌍 {{ t('Global settings') }}</h3>
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" v-model="wizardEnabled" @change="saveGlobalSettings" />
          <span>{{ t('Wizard enabled for all users') }}</span>
        </label>
        <p class="setting-hint">
          {{ t('When disabled, the wizard will not automatically start for new users.') }}
        </p>
      </div>
    </div>

    <div class="admin-actions">
      <button @click="addStep" class="primary">
        ➕ {{ t('Add new step') }}
      </button>
      <button @click="resetToDefault" class="warning">
        🔄 {{ t('Reset to default') }}
      </button>
      <button @click="saveSteps" class="success" :disabled="!hasChanges">
        💾 {{ t('Save') }}
      </button>
    </div>

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
import { translate as t } from '@nextcloud/l10n'
import Sortable from 'sortablejs'

export default {
  name: 'AdminApp',
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

    const loadSteps = async () => {
      try {
        loading.value = true
        const response = await axios.get(generateUrl('/apps/introvox/admin/steps'))
        steps.value = response.data.steps
        originalSteps.value = JSON.parse(JSON.stringify(response.data.steps))
        hasChanges.value = false
      } catch (error) {
        showMessage(t('introvox', 'Error loading steps: %s', {error: error.message}), 'error')
      } finally {
        loading.value = false
      }
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
        forceFallback: false,
        onStart: (evt) => {
          console.log('Drag started:', evt.oldIndex)
        },
        onEnd: (evt) => {
          console.log('Drag ended. Old:', evt.oldIndex, 'New:', evt.newIndex)
          // Reorder the steps array
          const movedItem = steps.value.splice(evt.oldIndex, 1)[0]
          steps.value.splice(evt.newIndex, 0, movedItem)
          hasChanges.value = true
          console.log('Steps reordered, hasChanges:', hasChanges.value)
        }
      })

      console.log('Sortable initialized successfully')
    }

    const loadGlobalSettings = async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/admin/settings'))
        wizardEnabled.value = response.data.enabled !== false
      } catch (error) {
        console.error('Fout bij laden van globale instellingen:', error)
      }
    }

    const saveGlobalSettings = async () => {
      try {
        await axios.post(generateUrl('/apps/introvox/admin/settings'), {
          enabled: wizardEnabled.value
        })
        showMessage(t('introvox', 'Global settings saved'), 'success')
      } catch (error) {
        showMessage(t('introvox', 'Error saving global settings: %s', {error: error.message}), 'error')
      }
    }

    const addStep = () => {
      const newStep = {
        id: 'new_' + Date.now(),
        title: t('introvox', 'New step'),
        text: '<p>' + t('introvox', 'Description of this step...') + '</p>',
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

    const deleteStep = (id) => {
      if (confirm(t('introvox', 'Are you sure you want to delete this step?'))) {
        steps.value = steps.value.filter(s => s.id !== id)
        hasChanges.value = true
      }
    }

    const saveSteps = async () => {
      try {
        loading.value = true
        await axios.post(generateUrl('/apps/introvox/admin/steps'), {
          steps: steps.value
        })
        showMessage(t('introvox', 'Steps saved successfully!'), 'success')
        hasChanges.value = false
        originalSteps.value = JSON.parse(JSON.stringify(steps.value))
      } catch (error) {
        showMessage(t('introvox', 'Error saving: %s', {error: error.message}), 'error')
      } finally {
        loading.value = false
      }
    }

    const resetToDefault = async () => {
      if (confirm(t('introvox', 'Are you sure you want to reset to default steps? All custom steps will be removed.'))) {
        try {
          loading.value = true
          await axios.post(generateUrl('/apps/introvox/admin/reset'))
          await loadSteps()
          showMessage(t('introvox', 'Reset to default steps successful!'), 'success')
        } catch (error) {
          showMessage(t('introvox', 'Error resetting: %s', {error: error.message}), 'error')
        } finally {
          loading.value = false
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
      return t('introvox', key, vars)
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

    // Load steps and settings on mount
    loadSteps()
    loadGlobalSettings()

    return {
      steps,
      loading,
      editingStep,
      editingData,
      message,
      hasChanges,
      wizardEnabled,
      stepsListRef,
      saveGlobalSettings,
      addStep,
      editStep,
      saveEdit,
      cancelEdit,
      deleteStep,
      saveSteps,
      resetToDefault,
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

.admin-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

button {
  padding: 6px 12px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: normal;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.8;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
}

button.secondary {
  background: var(--color-background-dark);
  color: var(--color-main-text);
}

button.success {
  background: #46ba61;
  color: white;
}

button.warning {
  background: #eca700;
  color: white;
}

.icon-button {
  background: transparent;
  padding: 5px 10px;
  font-size: 14px;
}

.icon-button.delete:hover {
  color: #e9322d;
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
</style>
