<template>
  <NcDialog
    :name="dialogName"
    size="normal"
    @update:open="open => { if (!open) $emit('close') }">
    <div class="new-tour">
      <template v-if="page === 0">
        <!-- TRANSLATORS: Label of three choices: where a new tour starts -->
        <NcRadioGroup v-model="kind" :label="t('introvox', 'Where does it start?')">
          <!-- TRANSLATORS: Choice: the tour starts in an app, such as Talk; keep it short -->
          <NcRadioGroupButton value="app" :label="t('introvox', 'In an app')">
            <template #icon>
              <Apps :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the tour starts on a page of Nextcloud that is not an app; keep it short -->
          <NcRadioGroupButton value="page" :label="t('introvox', 'On another page')">
            <template #icon>
              <Web :size="20" />
            </template>
          </NcRadioGroupButton>
          <!-- TRANSLATORS: Choice: the tour starts on any page someone opens next; keep it short -->
          <NcRadioGroupButton value="any" :label="t('introvox', 'Anywhere')">
            <template #icon>
              <Earth :size="20" />
            </template>
          </NcRadioGroupButton>
        </NcRadioGroup>
        <!-- TRANSLATORS: Noun: label of a list of apps -->
        <NcSelect v-if="kind === 'app'" :input-label="t('introvox', 'App')"
          v-model="app"
          :options="apps"
          label="name"
          :placeholder="appPlaceholder"
          :clearable="false" />
        <NcTextField v-else-if="kind === 'page'"
          v-model="pagePath"
          :label="t('introvox', 'Page')"
          :error="pagePath !== '' && !pageTriggerValue"
          :helper-text="t('introvox', 'A page of this Nextcloud, such as {example}', { example: '/settings/user' }, undefined, TEXT)" />
        <p class="new-tour__hint">
          {{ kind === 'any'
            ? t('introvox', 'Not tied to an app: the tour starts on whatever page someone opens next. After Next, set a number of days to make it a tip that comes later, for example after a week.')
            : t('introvox', 'The tour starts by itself the first time someone opens it, once you switch the tour on.') }}
        </p>
      </template>

      <template v-else>
        <!-- TRANSLATORS: Noun: label of the text field for the name of a tour -->
        <NcTextField v-model="name" :label="t('introvox', 'Name') + ' *'" :disabled="builtin" />
        <!-- TRANSLATORS: Label of a list: the language the steps of a tour are written in -->
        <NcSelect :input-label="t('introvox', 'Main language')"
          v-model="language"
          :options="languages"
          label="name"
          :disabled="builtin"
          :clearable="false" />
        <!-- TRANSLATORS: Label of a list of groups that may get a tour or a step -->
        <NcSelect :input-label="t('introvox', 'Visible to')"
          v-model="groups"
          :options="groupOptions"
          :multiple="true"
          label="displayName"
          track-by="id"
          :reduce="group => group.id"
          :placeholder="groupsPlaceholder"
          :close-on-select="false" />
        <!-- TRANSLATORS: Label of two choices: who gets the tour -->
        <NcRadioGroup :label="t('introvox', 'Who gets it')"
          v-model="audience"
          :description="audience === 'everyone'
            ? t('introvox', 'Everyone who opens it and has not seen the tour, also people who have used it for a long time.')
            : t('introvox', 'Only people whose first login comes after the tour is switched on.')">
          <!-- TRANSLATORS: Choice: everyone gets the tour; keep it short -->
          <NcRadioGroupButton value="everyone" :label="t('introvox', 'Everyone')" />
          <!-- TRANSLATORS: Choice: only accounts whose first login comes after the tour is switched on get it; keep it short -->
          <NcRadioGroupButton value="new" :label="t('introvox', 'New accounts only')" />
        </NcRadioGroup>

        <fieldset class="new-tour__when">
          <legend>{{ t('introvox', 'When it starts by itself') }}</legend>
          <NcInputField v-model="startAfterDays"
            type="number"
            min="0"
            max="365"
            :label="t('introvox', 'Days after someone\'s first login')"
            :error="!daysValid"
            :helper-text="t('introvox', '0 starts it straight away.')" />
          <div class="new-tour__dates">
            <!-- TRANSLATORS: Label of a date field: the first day a tour may start by itself -->
            <NcDateTimePickerNative v-model="startFrom" :label="t('introvox', 'From')"
              type="date"/>
            <!-- TRANSLATORS: Label of a date field: the last day a tour may start by itself -->
            <NcDateTimePickerNative v-model="startUntil" :label="t('introvox', 'Until')"
              type="date"
              :min="startFrom"/>
          </div>
          <p class="new-tour__hint">
            {{ t('introvox', 'Leave the dates empty for no limit. Starting the tour by hand or with a link always works.') }}
          </p>
        </fieldset>
      </template>

      <NcNoteCard v-if="error" type="error" :text="error" />
    </div>

    <template #actions>
      <NcButton v-if="page === 1 && !builtin" @click="page = 0">
        <!-- TRANSLATORS: Button: goes to the previous page or step; keep it short -->
        {{ t('introvox', 'Back') }}
      </NcButton>
      <NcButton v-if="page === 0" variant="primary" :disabled="!trigger" @click="toDetails">
        <!-- TRANSLATORS: Button: goes to the next page or step; keep it short -->
        {{ t('introvox', 'Next') }}
      </NcButton>
      <NcButton v-else variant="primary" :disabled="saving || !name.trim() || !daysValid || !datesValid" @click="submit">
        {{ submitLabel }}
      </NcButton>
    </template>
  </NcDialog>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import {
  NcButton,
  NcDateTimePickerNative,
  NcDialog,
  NcInputField,
  NcNoteCard,
  NcRadioGroup,
  NcRadioGroupButton,
  NcSelect,
  NcTextField
} from '@nextcloud/vue'

import Apps from 'vue-material-design-icons/Apps.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import Web from 'vue-material-design-icons/Web.vue'

import { dateToIso, isoToDate } from '../utils/dates.mjs'
import { pageTrigger } from '../utils/pages.mjs'

/**
 * A new tour that starts in an app, on a page or anywhere, or the settings
 * of one (tour given). The server checks the same again (TourValidator) and
 * makes the id; a new tour starts switched off.
 */
export default {
  name: 'NewTourDialog',
  components: {
    Apps,
    Earth,
    NcButton,
    NcDateTimePickerNative,
    NcDialog,
    NcInputField,
    NcNoteCard,
    NcRadioGroup,
    NcRadioGroupButton,
    NcSelect,
    NcTextField,
    Web
  },
  props: {
    // The tour to change; null for a new one
    tour: {
      type: Object,
      default: null
    },
    // [{ code, name }]
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
  emits: ['saved', 'close'],
  setup(props, { emit }) {
    const existing = props.tour
    // A built-in tour keeps its name, app and language: only who gets it,
    // and when, can change (BuiltinTours::EDITABLE)
    const builtin = existing?.builtin === true && existing.id !== 'welcome'
    const page = ref(builtin ? 1 : 0)
    const kind = ref(['page', 'any'].includes(existing?.trigger?.type) ? existing.trigger.type : 'app')
    const apps = ref([])
    const app = ref(null)
    const pagePath = ref(existing?.trigger?.type === 'page' ? existing.trigger.page : '')
    const name = ref(existing?.name || '')
    const language = ref(null)
    const groups = ref([...(existing?.visibleToGroups || [])])
    const audience = ref(existing?.audience || 'everyone')
    // When it may start by itself (TourSchedule on the server)
    const startAfterDays = ref(String(existing?.startAfterDays ?? 0))
    const startFrom = ref(isoToDate(existing?.startFrom || ''))
    const startUntil = ref(isoToDate(existing?.startUntil || ''))
    const daysValid = computed(() => /^\d+$/.test(startAfterDays.value.trim()) && Number(startAfterDays.value) <= 365)
    const datesValid = computed(() => !startFrom.value || !startUntil.value || dateToIso(startFrom.value) <= dateToIso(startUntil.value))
    const saving = ref(false)
    const error = ref('')

    const groupOptions = computed(() => props.groups)
    const pageTriggerValue = computed(() => pageTrigger(pagePath.value))
    const trigger = computed(() => {
      if (kind.value === 'app') {
        return app.value ? { type: 'app', app: app.value.id } : null
      }
      if (kind.value === 'any') {
        return { type: 'any' }
      }
      // A path into an app becomes that app, as on the server
      return pageTriggerValue.value
    })

    onMounted(async () => {
      language.value = props.languages.find(l => l.code === (existing?.mainLanguage || 'en')) || props.languages[0] || { code: 'en', name: t('introvox', 'English') }
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/apps'))
        apps.value = data.apps || []
        if (existing?.trigger?.type === 'app') {
          app.value = apps.value.find(a => a.id === existing.trigger.app) || { id: existing.trigger.app, name: existing.trigger.app }
        }
      } catch (e) {
        apps.value = []
      }
    })

    const toDetails = () => {
      if (!name.value && trigger.value?.type === 'app') {
        name.value = app.value?.name || ''
      }
      page.value = 1
    }

    // In script, one string per line, so each keeps its own translator hint
    // TRANSLATORS: Placeholder of the list of apps
    const appPlaceholder = t('introvox', 'Choose an app')
    // TRANSLATORS: Placeholder of the list of groups: when no group is chosen, everyone gets it
    const groupsPlaceholder = t('introvox', 'All users (no restriction)')
    const dialogName = existing
      // TRANSLATORS: Dialog title and button: the settings of one tour
      ? t('introvox', 'Tour settings')
      // TRANSLATORS: Dialog title and button: make a new tour
      : t('introvox', 'New tour')
    const submitLabel = existing
      // TRANSLATORS: Button (verb): saves the changes
      ? t('introvox', 'Save')
      // TRANSLATORS: Button (verb): creates the new tour
      : t('introvox', 'Create')

    const submit = async () => {
      saving.value = true
      error.value = ''
      const fields = {
        // A built-in tour's name, app and language are fixed
        ...(builtin ? {} : { name: name.value.trim(), trigger: trigger.value, mainLanguage: language.value?.code || 'en' }),
        visibleToGroups: groups.value,
        audience: audience.value,
        startAfterDays: Number(startAfterDays.value),
        startFrom: dateToIso(startFrom.value),
        startUntil: dateToIso(startUntil.value),
      }
      try {
        const { data } = existing
          ? await axios.put(generateUrl('/apps/introvox/admin/tours/{id}', { id: existing.id }), { tour: { ...fields, enabled: existing.enabled } })
          : await axios.post(generateUrl('/apps/introvox/admin/tours'), { tour: fields })
        emit('saved', data.tour)
      } catch (e) {
        error.value = e.response?.data?.error || t('introvox', 'The tour could not be saved.')
      } finally {
        saving.value = false
      }
    }

    return {
      TEXT,
      t,
      builtin,
      page,
      kind,
      apps,
      app,
      pagePath,
      pageTriggerValue,
      name,
      language,
      groups,
      groupOptions,
      audience,
      startAfterDays,
      startFrom,
      startUntil,
      daysValid,
      datesValid,
      saving,
      error,
      trigger,
      toDetails,
      submit,
      dialogName,
      submitLabel,
      appPlaceholder,
      groupsPlaceholder
    }
  }
}
</script>

<style scoped>
.new-tour {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
}

.new-tour__when {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: none;
}

.new-tour__when legend {
  margin-bottom: 4px;
  /* In line with the heading of "Who gets it" (NcRadioGroup) */
  padding-inline: calc(3 * var(--default-grid-baseline, 4px));
  font-weight: var(--font-weight-heading);
}

.new-tour__dates {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.new-tour__dates > * {
  flex: 1 1 180px;
}

.new-tour__hint {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}
</style>
