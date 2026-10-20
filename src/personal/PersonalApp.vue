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

      <div class="introvox-personal__actions">
        <NcButton :disabled="restarting" @click="restartTour">
          <template #icon>
            <NcLoadingIcon v-if="restarting" :size="20" />
            <Replay v-else :size="20" />
          </template>
          <template v-if="restarting">
            <!-- TRANSLATORS: Button label while the tour is being restarted -->
            {{ t('introvox', 'Restarting tour …') }}
          </template>
          <template v-else>
            <!-- TRANSLATORS: Button: starts the welcome tour again -->
            {{ t('introvox', 'Restart tour now') }}
          </template>
        </NcButton>
      </div>

      <template v-if="tours.length > 0">
        <h3 class="introvox-personal__heading">
          {{ t('introvox', 'Tours') }}
        </h3>
        <ul class="introvox-personal__tours">
          <li v-for="tour in tours" :key="tour.id" class="introvox-personal__tour">
            <img v-if="tour.app && tour.app.icon"
              :src="tour.app.icon"
              alt=""
              class="introvox-personal__tour-icon">
            <span class="introvox-personal__tour-name">{{ tour.name }}</span>
            <span class="introvox-personal__tour-state">
              <template v-if="tour.seen">
                <!-- TRANSLATORS: Status: the user has seen this tour -->
                {{ t('introvox', 'Seen') }}
              </template>
              <template v-else>
                <!-- TRANSLATORS: Status: the user has not seen this tour yet -->
                {{ t('introvox', 'Not seen yet') }}
              </template>
            </span>
            <NcButton @click="startAppTour(tour)">
              <template v-if="tour.seen">
                <!-- TRANSLATORS: Button: starts a tour the user has seen before -->
                {{ t('introvox', 'Start again') }}
              </template>
              <template v-else>
                <!-- TRANSLATORS: Button (verb): starts a tour the user has not seen yet -->
                {{ t('introvox', 'Start') }}
              </template>
            </NcButton>
          </li>
        </ul>
      </template>
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
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSettingsSection } from '@nextcloud/vue'

import Replay from 'vue-material-design-icons/Replay.vue'

import { COMPLETED_KEY as STORAGE_KEY, RESUME_KEY, START_KEY, VERSION_KEY } from '../runtime/chooseTour.mjs'
import { ANYWHERE_PAGE, normalizePage } from '../utils/pages.mjs'

// The keys WizardManager uses: clearing them makes the tour start again,
// from the first step rather than where an earlier run left off on another
// page. START_KEY asks the next page to start a tour (chooseTour).

export default {
  name: 'PersonalApp',
  components: {
    NcButton,
    NcCheckboxRadioSwitch,
    NcLoadingIcon,
    NcNoteCard,
    NcSettingsSection,
    Replay
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
    const restarting = ref(false)

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

    // On its own page: the page reads the request and starts the tour there.
    // A tour that starts anywhere has no page of its own.
    const startAppTour = (tour) => {
      const page = normalizePage(tour.page || ANYWHERE_PAGE)
      if (!page) {
        return
      }
      try {
        sessionStorage.setItem(START_KEY, JSON.stringify({ tourId: tour.id, page, at: Date.now() }))
      } catch (error) {
        showError(t('introvox', 'The tour could not be started.'))
        return
      }
      window.location.href = generateUrl(page)
    }

    const restartTour = async () => {
      restarting.value = true
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(VERSION_KEY)
        sessionStorage.removeItem(RESUME_KEY)
        // Asked for by hand, so it also runs with tours switched off
        sessionStorage.setItem(START_KEY, JSON.stringify({ tourId: 'welcome', at: Date.now() }))
        await axios.post(generateUrl('/apps/introvox/personal/settings'), {
          wizardDisabled: false
        })
        // Let the button show that something is happening before leaving
        setTimeout(() => {
          window.location.href = generateUrl('/')
        }, 1000)
      } catch (error) {
        restarting.value = false
        // TRANSLATORS: Error message
        showError(t('introvox', 'Error restarting tour'))
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
      startAppTour,
      loading,
      saving,
      restarting,
      restartTour,
      t
    }
  }
}
</script>

<style scoped>
.introvox-personal__actions {
  margin-top: 16px;
}

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

.introvox-personal__tours {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.introvox-personal__tour {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

/* App icons in the apps menu are light, for the header: dark on a light page */
.introvox-personal__tour-icon {
  width: 20px;
  height: 20px;
  filter: var(--background-invert-if-bright);
}

.introvox-personal__tour-name {
  flex: 1 1 160px;
}

.introvox-personal__tour-state {
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
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
