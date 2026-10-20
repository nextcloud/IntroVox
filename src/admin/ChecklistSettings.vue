<template>
  <NcSettingsSection
    :name="sectionName"
    :description="t('introvox', 'A list of first things to do in Nextcloud, ticked off by itself as people do them.')">
    <NcCheckboxRadioSwitch
      :model-value="enabled"
      class="introvox-admin__checklist"
      type="switch"
      :description="t('introvox', 'Everyone can add it under Customize on their Dashboard, and remove it there again.')"
      @update:model-value="value => save({ enabled: value })">
      {{ t('introvox', 'Show "Getting started" on the Dashboard') }}
    </NcCheckboxRadioSwitch>

    <template v-if="enabled">
      <!-- The last task left cannot go: an empty list would say "All done" to everyone -->
      <fieldset class="checklist-tasks">
        <!-- TRANSLATORS: Noun: heading of the list of tasks in the checklist -->
        <legend>{{ t('introvox', 'Tasks') }}</legend>
        <NcCheckboxRadioSwitch
          v-for="task in tasks"
          :key="task.id"
          :model-value="task.chosen"
          :disabled="task.chosen && taskCount === 1"
          :description="[task.hint, task.note].filter(Boolean).join(' · ')"
          @update:model-value="value => saveTask(task.id, value)">
          {{ task.title }}
        </NcCheckboxRadioSwitch>
      </fieldset>

      <fieldset class="checklist-tasks">
        <!-- TRANSLATORS: Heading of the list of checklist tasks an administrator added -->
        <legend>{{ t('introvox', 'Your own tasks') }}</legend>
        <p class="checklist-tasks__hint">
          {{ t('introvox', 'A page of this Nextcloud to open, such as Talk or the folder with the handbook. It is ticked off once someone opens it from the list, and comes after the tasks above.') }}
        </p>
        <ul v-if="custom.length > 0" class="checklist-own">
          <li v-for="task in custom" :key="task.id" class="checklist-own__item">
            <div class="checklist-own__text">
              <strong>{{ task.title }}</strong>
              <span v-if="task.text">{{ task.text }}</span>
              <code>{{ task.page }}</code>
            </div>
            <!-- TRANSLATORS: Invisible label (for screen readers) of a pencil button; {task} is the title of a checklist task, such as "Open Talk" -->
            <NcButton variant="tertiary" :aria-label="t('introvox', 'Edit {task}', { task: task.title }, undefined, TEXT)"
              @click="editing = task">
              <template #icon>
                <Pencil :size="20" />
              </template>
            </NcButton>
            <!-- TRANSLATORS: Invisible label (for screen readers) of a trash button; {task} is the title of a checklist task, such as "Open Talk" -->
            <NcButton variant="tertiary" :aria-label="t('introvox', 'Delete {task}', { task: task.title }, undefined, TEXT)"
              :disabled="taskCount === 1"
              @click="removeTask(task)">
              <template #icon>
                <TrashCanOutline :size="20" />
              </template>
            </NcButton>
          </li>
        </ul>
        <NcButton :disabled="custom.length >= maxCustom" @click="editing = {}">
          <template #icon>
            <Plus :size="20" />
          </template>
          <!-- TRANSLATORS: Button: adds a task of your own to the checklist -->
          {{ t('introvox', 'Add task') }}
        </NcButton>
      </fieldset>

      <NcCheckboxRadioSwitch
        :model-value="onDashboard"
        type="switch"
        :description="t('introvox', 'For new accounts and everyone who never arranged their Dashboard. People who did can add it under Customize.')"
        @update:model-value="value => save({ onDashboard: value })">
        {{ t('introvox', 'Put it on every Dashboard') }}
      </NcCheckboxRadioSwitch>
    </template>

    <ChecklistTaskDialog v-if="editing"
      :task="editing"
      :saving="saving"
      @save="saveCustom"
      @close="editing = null" />
  </NcSettingsSection>
</template>

<script>
import { computed, ref, watch } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { showConfirmation, showError, showSuccess } from '@nextcloud/dialogs'
import { NcButton, NcCheckboxRadioSwitch, NcSettingsSection } from '@nextcloud/vue'

import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'

import ChecklistTaskDialog from './ChecklistTaskDialog.vue'

// Server side: lib/Service/Checklist.php
const MAX_CUSTOM = 10

/**
 * "Getting started" on the Dashboard (lib/Dashboard/ChecklistWidget.php):
 * on or off, the fixed tasks, the admin's own tasks, and whether it is on
 * the default Dashboard. Each change is saved straight away, like the other
 * switches.
 */
export default {
  name: 'ChecklistSettings',
  components: {
    ChecklistTaskDialog,
    NcButton,
    NcCheckboxRadioSwitch,
    NcSettingsSection,
    Pencil,
    Plus,
    TrashCanOutline
  },
  props: {
    // { enabled, onDashboard, tasks: [{ id, title, hint, note, chosen }],
    // custom: [{ id, title, text, page }] }, as GET /admin/settings has it
    settings: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const enabled = ref(false)
    const onDashboard = ref(false)
    const tasks = ref([])
    const custom = ref([])
    // The own task in the dialog: {} for a new one
    const editing = ref(null)
    const saving = ref(false)
    const show = (settings) => {
      enabled.value = settings.enabled === true
      onDashboard.value = settings.onDashboard === true
      tasks.value = settings.tasks || []
      custom.value = settings.custom || []
    }
    watch(() => props.settings, show, { immediate: true })

    const taskCount = computed(() => tasks.value.filter(task => task.chosen).length + custom.value.length)

    // Why the server refused own tasks (Checklist::custom())
    const refusal = (error) => {
      switch (error) {
      case 'page':
        // TRANSLATORS: Error message; {example} is a path, such as "/apps/spreed/"
        return t('introvox', 'Use a page of this Nextcloud, such as {example}.', { example: '/apps/spreed/' })
      case 'title':
        return t('introvox', 'A task needs a title of at most 60 characters.')
      case 'text':
        return t('introvox', 'The short text can be at most 120 characters.')
      case 'too_many':
        // TRANSLATORS: Error message; %n is the maximum number of tasks of your own in the checklist, currently 10
        return n('introvox', 'There can be at most %n own task.', 'There can be at most %n own tasks.', MAX_CUSTOM)
      default:
        // TRANSLATORS: Error message after saving a setting failed
        return t('introvox', 'Error saving settings')
      }
    }

    // Only what changed is sent (ChecklistService::save); the answer is
    // the state as stored
    const save = async (changes) => {
      saving.value = true
      try {
        const { data } = await axios.post(generateUrl('/apps/introvox/admin/settings'), { checklist: changes })
        show(data.checklist)
        // TRANSLATORS: Message after a setting was saved
        showSuccess(t('introvox', 'Global settings saved'))
        return true
      } catch (error) {
        showError(refusal(error.response?.data?.error))
        return false
      } finally {
        saving.value = false
      }
    }

    const saveTask = (id, value) => save({
      tasks: tasks.value.filter(task => (task.id === id ? value : task.chosen)).map(task => task.id)
    })

    // A task without an id is new; the server gives it one
    const saveCustom = async (task) => {
      const list = task.id
        ? custom.value.map(own => (own.id === task.id ? task : own))
        : [...custom.value, task]
      if (await save({ custom: list })) {
        editing.value = null
      }
    }

    const removeTask = async (task) => {
      const confirmed = await showConfirmation({
        // TRANSLATORS: Title of the dialog that asks whether to delete a checklist task
        name: t('introvox', 'Delete task'),
        // TRANSLATORS: Confirmation text; {task} is the title of a checklist task, such as "Open Talk"
        text: t('introvox', '"{task}" goes from everyone\'s list.', { task: task.title }, undefined, TEXT),
      })
      if (confirmed) {
        await save({ custom: custom.value.filter(own => own.id !== task.id) })
      }
    }

    // In script, so the string can carry a translator hint (an HTML
    // comment above the root element would make the template a fragment)
    // TRANSLATORS: Section heading. "Dashboard" is the Nextcloud Dashboard app
    const sectionName = t('introvox', 'Checklist on the Dashboard')

    return {
      TEXT,
      t,
      sectionName,
      enabled,
      onDashboard,
      tasks,
      custom,
      editing,
      saving,
      taskCount,
      maxCustom: MAX_CUSTOM,
      save,
      saveTask,
      saveCustom,
      removeTask
    }
  }
}
</script>

<style scoped>
.checklist-tasks {
  margin: 16px 0;
  padding: 0;
  border: none;
}

.checklist-tasks legend {
  margin-bottom: 4px;
  font-weight: var(--font-weight-heading);
}

.checklist-tasks__hint {
  max-width: 600px;
  margin: 0 0 8px;
  color: var(--color-text-maxcontrast);
}

.checklist-own {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 600px;
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}

.checklist-own__item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--border-radius-large);
  background: var(--color-background-hover);
}

.checklist-own__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.checklist-own__text > * {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checklist-own__text span,
.checklist-own__text code {
  color: var(--color-text-maxcontrast);
}
</style>
