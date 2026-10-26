<template>
  <div>
    <!-- TRANSLATORS: Section heading on the administration page -->
    <NcSettingsSection :name="t('introvox', 'Global settings')"
      :description="t('introvox', 'Whether tours start, and where people find them again')"
    >
      <NcCheckboxRadioSwitch
        :model-value="enabled"
        :disabled="!loaded"
        class="introvox-admin__enable"
        type="switch"
        @update:model-value="saveEnabled"
      >
        <!-- TRANSLATORS: Label of the main switch: when it is off, no tour starts for anyone -->
        {{ t('introvox', 'Tours for everyone') }}
      </NcCheckboxRadioSwitch>
      <p class="introvox-admin__hint">
        {{ t('introvox', 'When this is off, no tour starts, and nobody can start one themselves.') }}
      </p>

      <NcCheckboxRadioSwitch
        :model-value="userMenu"
        :disabled="!loaded"
        class="introvox-admin__user-menu"
        type="switch"
        @update:model-value="saveUserMenu"
      >
        {{ t('introvox', 'Show Tours in the user menu') }}
      </NcCheckboxRadioSwitch>
      <p class="introvox-admin__hint">
        {{ t('introvox', 'An entry above Help leads everyone to their tours, to start one again.') }}
      </p>

      <p class="introvox-admin__hint language-coverage-hint">
        <!-- TRANSLATORS: %n is the number of languages for which an administrator wrote steps of their own of the welcome tour -->
        {{ n('introvox', 'The tour is auto-translated into every Nextcloud-supported language. %n language currently has an override.', 'The tour is auto-translated into every Nextcloud-supported language. %n languages currently have an override.', welcomeOverrides) }}
      </p>
    </NcSettingsSection>

    <ChecklistSettings v-if="checklist" :settings="checklist" />
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { showError, showSuccess } from '@nextcloud/dialogs'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcSettingsSection from '@nextcloud/vue/components/NcSettingsSection'

import ChecklistSettings from './ChecklistSettings.vue'

/**
 * The Settings pane: Tours for everyone and Tours in the user menu
 * (AdminController settings), and the checklist on the Dashboard
 * (ChecklistSettings). Each switch is saved the moment it changes. Showing
 * a tour to everyone again is in its menu in the list of tours."
 */
export default {
  name: 'SettingsPane',
  components: {
    ChecklistSettings,
    NcCheckboxRadioSwitch,
    NcSettingsSection
  },
  props: {
    // Languages with steps of the admin's own for the welcome tour
    welcomeOverrides: {
      type: Number,
      default: 0
    }
  },
  emits: ['tours-enabled'],
  setup(props, { emit }) {
    const enabled = ref(true)
    const userMenu = ref(true)
    // The switches stay off until the server said how they are
    const loaded = ref(false)
    // ChecklistSettings, once loaded
    const checklist = ref(null)

    onMounted(async () => {
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/settings'))
        enabled.value = data.enabled === true
        userMenu.value = data.userMenu !== false
        checklist.value = data.checklist || null
        loaded.value = true
      } catch (error) {
        showError(t('introvox', 'The settings could not be loaded. Reload the page to try again.'))
      }
    })

    // Only the field that changed is sent (AdminController::saveSettings)
    const save = async (field, value, state) => {
      state.value = value
      try {
        await axios.post(generateUrl('/apps/introvox/admin/settings'), { [field]: value })
        showSuccess(t('introvox', 'Global settings saved'))
        return true
      } catch (error) {
        state.value = !value
        showError(t('introvox', 'Error saving settings'))
        return false
      }
    }

    const saveEnabled = async (value) => {
      if (await save('enabled', value, enabled)) {
        emit('tours-enabled', value)
      }
    }

    // "Tours" in the user menu (lib/Listener/UserMenuEntry.php)
    const saveUserMenu = (value) => save('userMenu', value, userMenu)

    return { t, n, enabled, userMenu, loaded, checklist, saveEnabled, saveUserMenu }
  }
}
</script>

<style scoped>
.language-coverage-hint {
  margin-top: 16px;
}
</style>
