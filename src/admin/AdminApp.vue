<template>
  <div class="introvox-admin">
    <div class="global-settings">
      <h3>🌍 Globale instellingen</h3>
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" v-model="wizardEnabled" @change="saveGlobalSettings" />
          <span>Wizard ingeschakeld voor alle gebruikers</span>
        </label>
        <p class="setting-hint">
          Wanneer uitgeschakeld, wordt de wizard niet automatisch gestart voor nieuwe gebruikers.
        </p>
      </div>
    </div>

    <div class="admin-actions">
      <button @click="addStep" class="primary">
        ➕ Nieuwe stap toevoegen
      </button>
      <button @click="resetToDefault" class="warning">
        🔄 Reset naar standaard
      </button>
      <button @click="saveSteps" class="success" :disabled="!hasChanges">
        💾 Opslaan
      </button>
    </div>

    <div v-if="loading" class="loading">
      Laden...
    </div>

    <div v-else class="steps-list">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{ editing: editingStep === step.id }"
      >
        <div class="step-header">
          <h3>
            <span class="step-number">Stap {{ index + 1 }}</span>
            <span class="step-title">{{ step.title }}</span>
            <span class="step-id">ID: {{ step.id }}</span>
          </h3>
          <div class="step-actions">
            <button @click="editStep(step)" class="icon-button">
              ✏️ Bewerken
            </button>
            <button @click="deleteStep(step.id)" class="icon-button delete">
              🗑️ Verwijderen
            </button>
          </div>
        </div>

        <div v-if="editingStep === step.id" class="step-editor">
          <div class="form-group">
            <label>ID (niet aanpasbaar)</label>
            <input type="text" :value="step.id" disabled class="disabled-input" />
          </div>

          <div class="form-group">
            <label>Titel *</label>
            <input
              v-model="editingData.title"
              type="text"
              placeholder="Bijvoorbeeld: 👋 Welkom bij Nextcloud"
              required
            />
          </div>

          <div class="form-group">
            <label>Tekst (HTML) *</label>
            <textarea
              v-model="editingData.text"
              rows="6"
              placeholder="<p>HTML content hier...</p>"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>Koppel aan element (CSS selector)</label>
            <input
              v-model="editingData.attachTo"
              type="text"
              placeholder="Bijvoorbeeld: #header, .button, [data-id='files']"
            />
            <small class="hint">Laat leeg voor een gecentreerde stap</small>
          </div>

          <div class="form-group" v-if="editingData.attachTo">
            <label>Positie</label>
            <select v-model="editingData.position">
              <option value="right">Rechts</option>
              <option value="left">Links</option>
              <option value="top">Boven</option>
              <option value="bottom">Onder</option>
            </select>
          </div>

          <div class="editor-actions">
            <button @click="saveEdit" class="primary">
              ✓ Opslaan
            </button>
            <button @click="cancelEdit" class="secondary">
              ✗ Annuleren
            </button>
          </div>
        </div>

        <div v-else class="step-preview">
          <div class="preview-text" v-html="step.text"></div>
          <div v-if="step.attachTo" class="preview-meta">
            <span>📍 Element: <code>{{ step.attachTo }}</code></span>
            <span>📐 Positie: {{ step.position || 'right' }}</span>
          </div>
          <div v-else class="preview-meta">
            <span>📍 Gecentreerde stap</span>
          </div>
        </div>
      </div>

      <div v-if="steps.length === 0" class="empty-state">
        <p>Nog geen stappen gedefinieerd.</p>
        <button @click="addStep" class="primary">
          Eerste stap toevoegen
        </button>
      </div>
    </div>

    <div v-if="message" class="message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

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

    const loadSteps = async () => {
      try {
        loading.value = true
        const response = await axios.get(generateUrl('/apps/introvox/admin/steps'))
        steps.value = response.data.steps
        originalSteps.value = JSON.parse(JSON.stringify(response.data.steps))
        hasChanges.value = false
      } catch (error) {
        showMessage('Fout bij laden van stappen: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
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
        showMessage('Globale instellingen opgeslagen', 'success')
      } catch (error) {
        showMessage('Fout bij opslaan van globale instellingen: ' + error.message, 'error')
      }
    }

    const addStep = () => {
      const newStep = {
        id: 'new_' + Date.now(),
        title: 'Nieuwe stap',
        text: '<p>Beschrijving van deze stap...</p>',
        attachTo: '',
        position: 'right'
      }
      steps.value.push(newStep)
      editStep(newStep)
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
      if (confirm('Weet je zeker dat je deze stap wilt verwijderen?')) {
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
        showMessage('Stappen succesvol opgeslagen!', 'success')
        hasChanges.value = false
        originalSteps.value = JSON.parse(JSON.stringify(steps.value))
      } catch (error) {
        showMessage('Fout bij opslaan: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const resetToDefault = async () => {
      if (confirm('Weet je zeker dat je wilt resetten naar de standaard stappen? Alle aangepaste stappen worden verwijderd.')) {
        try {
          loading.value = true
          await axios.post(generateUrl('/apps/introvox/admin/reset'))
          await loadSteps()
          showMessage('Reset naar standaard stappen succesvol!', 'success')
        } catch (error) {
          showMessage('Fout bij resetten: ' + error.message, 'error')
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
      saveGlobalSettings,
      addStep,
      editStep,
      saveEdit,
      cancelEdit,
      deleteStep,
      saveSteps,
      resetToDefault
    }
  }
}
</script>

<style scoped>
.introvox-admin {
  max-width: 1200px;
  margin: 20px 0;
}

.admin-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 500;
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
  gap: 15px;
}

.step-item {
  background: var(--color-main-background);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 15px;
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
}

.step-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.step-number {
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.step-title {
  font-size: 16px;
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
  font-weight: 500;
  margin-bottom: 5px;
  color: var(--color-main-text);
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
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
  padding: 10px;
  background: var(--color-background-dark);
  border-radius: 3px;
  margin-bottom: 10px;
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
  padding: 2px 6px;
  border-radius: 3px;
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
  padding: 15px 20px;
  border-radius: 3px;
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
</style>
