<template>
  <div class="introvox-tour-list">
    <div v-if="welcome" class="introvox-tour-list__actions">
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
      <slot name="heading" />
      <ul class="introvox-tour-list__tours">
        <li v-for="tour in tours" :key="tour.id" class="introvox-tour-list__tour">
          <img v-if="tour.app && tour.app.icon"
            :src="tour.app.icon"
            alt=""
            class="introvox-tour-list__icon">
          <span class="introvox-tour-list__name">{{ tour.name }}</span>
          <span class="introvox-tour-list__state">
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
  </div>
</template>

<script>
// The tours someone can start by hand: the welcome tour again, and each tour
// they may get, in the personal settings. <introvox-tour-list> for other
// apps shows the same tours as plain links (src/embed/TourLinks.vue).
import { translate as t } from '@nextcloud/l10n'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'

import Replay from 'vue-material-design-icons/Replay.vue'

import { useStartTour } from './useStartTour.js'

export default {
  name: 'TourList',
  components: {
    NcButton,
    NcLoadingIcon,
    Replay
  },
  props: {
    // [{ id, name, page, app: { name, icon } | null, seen }], from
    // GET /personal/settings
    tours: {
      type: Array,
      required: true
    },
    // Offer the welcome tour again
    welcome: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const { restarting, restartTour, startAppTour } = useStartTour()
    return {
      restarting,
      restartTour,
      startAppTour,
      t
    }
  }
}
</script>

<style scoped>
.introvox-tour-list__actions {
  margin-top: 16px;
}

.introvox-tour-list__tours {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.introvox-tour-list__tour {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

/* App icons in the apps menu are light, for the header: dark on a light page */
.introvox-tour-list__icon {
  width: 20px;
  height: 20px;
  filter: var(--background-invert-if-bright);
}

.introvox-tour-list__name {
  flex: 1 1 160px;
}

.introvox-tour-list__state {
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}
</style>
