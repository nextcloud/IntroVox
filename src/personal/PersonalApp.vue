<template>
  <NcSettingsSection
    :name="t('introvox', 'IntroVox')"
    :description="wizardEnabled ? t('introvox', 'Start a tour again, or stop tours from starting by themselves.') : ''"
  >
    <NcNoteCard v-if="!wizardEnabled" type="info" class="introvox-personal__notice">
      <p>{{ t('introvox', 'The introduction tour is currently disabled by your administrator.') }}</p>
      <p>{{ t('introvox', 'Contact your administrator if you would like to see the guided tour.') }}</p>
    </NcNoteCard>

    <template v-else>
      <NcCheckboxRadioSwitch
        :model-value="!toursDisabled"
        type="switch"
        :disabled="loading || saving"
        @update:model-value="saveToursEnabled"
      >
        <!-- TRANSLATORS: Label of a switch in the personal settings: tours may start without the user asking -->
        {{ t('introvox', 'Start tours by themselves') }}
      </NcCheckboxRadioSwitch>
      <p class="introvox-personal__hint">
        {{ t('introvox', 'When this is off, no tour starts by itself. You can still start each tour here.') }}
      </p>

      <TourList :tours="tours">
        <template #heading>
          <h3 class="introvox-personal__heading">
            {{ t('introvox', 'Tours') }}
          </h3>
        </template>
      </TourList>
    </template>
  </NcSettingsSection>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { showSuccess, showError } from '@nextcloud/dialogs'
import '@nextcloud/dialogs/style.css'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcNoteCard from '@nextcloud/vue/components/NcNoteCard'
import NcSettingsSection from '@nextcloud/vue/components/NcSettingsSection'

import TourList from '../components/TourList.vue'

export default {
  name: 'PersonalApp',
  components: {
    NcCheckboxRadioSwitch,
    NcNoteCard,
    NcSettingsSection,
    TourList
  },
  props: {
    // Whether the admin has the tour switched on at all
    wizardEnabled: {
      type: Boolean,
      required: true
    }
  },
  setup() {
    const toursDisabled = ref(false)
    const tours = ref([])
    const loading = ref(true)
    const saving = ref(false)

    // Applied straight away. Off also marks the welcome tour as done on the
    // server (TourStateService), so older versions respect it too.
    const saveToursEnabled = async (enabled) => {
      saving.value = true
      toursDisabled.value = !enabled
      try {
        const response = await axios.post(generateUrl('/apps/introvox/personal/settings'), {
          toursDisabled: !enabled
        })
        if (!response.data.success) {
          throw new Error(response.data.error)
        }
        // TRANSLATORS: Message after a setting was saved
        showSuccess(t('introvox', 'Settings saved'))
      } catch (error) {
        toursDisabled.value = enabled
        showError(t('introvox', 'Error saving settings'))
      } finally {
        saving.value = false
      }
    }

    onMounted(async () => {
      try {
        const response = await axios.get(generateUrl('/apps/introvox/personal/settings'))
        if (response.data.success) {
          toursDisabled.value = response.data.toursDisabled === true
          tours.value = Array.isArray(response.data.tours) ? response.data.tours : []
        }
      } catch (error) {
        // Keep the default (tour not disabled)
      } finally {
        loading.value = false
      }
    })

    return {
      toursDisabled,
      tours,
      saveToursEnabled,
      loading,
      saving,
      t
    }
  }
}
</script>

<style scoped>
.introvox-personal__hint {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.introvox-personal__heading {
  margin: 24px 0 8px;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

/* NcNoteCard pairs --color-main-text with --color-info, two different token
   families, so nothing guarantees they move together: a themed server can put
   dark text on a dark card. Text we put inside takes the matching -text
   token. Doubled class rather than !important, to beat the library's own
   without starting a war. */
.introvox-personal__notice.introvox-personal__notice :deep(p) {
  color: var(--color-info-text);
}
</style>
