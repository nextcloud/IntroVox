<template>
  <NcDialog
    :name="dialogName"
    size="normal"
    @update:open="open => { if (!open) $emit('close') }">
    <form class="checklist-task" @submit.prevent="submit">
      <!-- TRANSLATORS: Noun: label of the text field for the title of a checklist task or a step -->
      <NcTextField v-model="title" :label="t('introvox', 'Title') + ' *'"
        :maxlength="60" />
      <!-- TRANSLATORS: Label of a text field for a short explanation under a checklist task -->
      <NcTextField v-model="text" :label="t('introvox', 'Short text')"
        :maxlength="120" />
      <!-- TRANSLATORS: Noun: label of a field for a page (an address) of this Nextcloud -->
      <NcTextField v-model="page" :label="t('introvox', 'Page') + ' *'"
        :error="page.trim() !== '' && pagePath === null"
        :helper-text="pageHelp" />
      <p class="checklist-task__hint">
        {{ t('introvox', 'The task is ticked off once someone opens this page from the list.') }}
      </p>
    </form>
    <template #actions>
      <NcButton @click="$emit('close')">
        {{ t('introvox', 'Cancel') }}
      </NcButton>
      <NcButton variant="primary" :disabled="!valid || saving" @click="submit">
        <!-- TRANSLATORS: Button (verb): saves the changes -->
        {{ t('introvox', 'Save') }}
      </NcButton>
    </template>
  </NcDialog>
</template>

<script>
import { computed, ref } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { NcButton, NcDialog, NcTextField } from '@nextcloud/vue'

/**
 * A page of this Nextcloud as a path: a full address of this Nextcloud
 * becomes one; any other site, or no path, is null. The server checks the
 * same again (Checklist::page()).
 *
 * @param {string} input What the admin typed
 * @return {string|null}
 */
const pagePath = (input) => {
  let page = input.trim()
  if (page.startsWith(window.location.origin + '/')) {
    page = page.slice(window.location.origin.length)
  }
  if (page === '' || /^[a-z][a-z0-9+.-]*:/i.test(page)) {
    return null
  }
  page = page.startsWith('/') ? page : '/' + page
  return page.startsWith('//') || /[\s\\<>"'`]/.test(page) ? null : page
}

/**
 * An admin's own task for the checklist on the Dashboard: a title, a short
 * text and the page it opens. The list saves it (ChecklistSettings).
 */
export default {
  name: 'ChecklistTaskDialog',
  components: {
    NcButton,
    NcDialog,
    NcTextField
  },
  props: {
    // { id, title, text, page }, or {} for a new one
    task: {
      type: Object,
      required: true
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const title = ref(props.task.title || '')
    const text = ref(props.task.text || '')
    const page = ref(props.task.page || '')
    const path = computed(() => pagePath(page.value))
    const valid = computed(() => title.value.trim() !== '' && path.value !== null)

    // In script, one string per line, so each keeps its own translator hint
    const dialogName = props.task.id
      // TRANSLATORS: Dialog title: change a checklist task
      ? t('introvox', 'Edit task')
      // TRANSLATORS: Dialog title: add a checklist task of your own
      : t('introvox', 'New task')
    // TRANSLATORS: Help text under a field; {example} is a path, such as "/apps/spreed/"
    const pageHelp = t('introvox', 'A page of this Nextcloud, such as {example}', { example: '/apps/spreed/' }, undefined, TEXT)

    const submit = () => {
      if (valid.value) {
        emit('save', { ...props.task, title: title.value.trim(), text: text.value.trim(), page: path.value })
      }
    }

    return { t, dialogName, pageHelp, title, text, page, pagePath: path, valid, submit }
  }
}
</script>

<style scoped>
.checklist-task {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checklist-task__hint {
  margin: 0;
  color: var(--color-text-maxcontrast);
}
</style>
