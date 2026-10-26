<template>
  <ul class="introvox-tour-list__items">
    <li v-if="welcome" class="introvox-tour-list__item">
      <a class="introvox-tour-list__link introvox-tour-list__link--welcome" :href="linkTo('welcome')">
        <HelpCircle :size="20" class="introvox-tour-list__icon" />
        <!-- TRANSLATORS: Link that starts the welcome tour again, beside the links of the other tours -->
        <span class="introvox-tour-list__name">{{ t('introvox', 'Welcome tour') }}</span>
      </a>
    </li>
    <li v-for="tour in tours" :key="tour.id" class="introvox-tour-list__item">
      <a class="introvox-tour-list__link"
        :class="{ 'introvox-tour-list__link--seen': tour.seen }"
        :href="linkTo(tour.id)">
        <img v-if="tour.app && tour.app.icon"
          :src="tour.app.icon"
          alt=""
          width="20"
          height="20"
          class="introvox-tour-list__icon introvox-tour-list__icon--app">
        <MapMarkerPath v-else :size="20" class="introvox-tour-list__icon" />
        <span class="introvox-tour-list__name">{{ tour.name }}</span>
      </a>
    </li>
  </ul>
</template>

<script>
// What <introvox-tour-list> shows: a link per tour this user can start, the
// welcome tour first. Plain markup without styles: the host app styles it
// by these class names, a fixed interface (docs/architecture). Each link is
// the tour's share link, which opens the tour's page and starts it there.
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'

import HelpCircle from 'vue-material-design-icons/HelpCircle.vue'
import MapMarkerPath from 'vue-material-design-icons/MapMarkerPath.vue'

export default {
  name: 'TourLinks',
  components: {
    HelpCircle,
    MapMarkerPath
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
    const linkTo = (id) => generateUrl('/apps/introvox/tour/{id}', { id })
    return {
      linkTo,
      t
    }
  }
}
</script>
