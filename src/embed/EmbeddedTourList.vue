<template>
  <TourLinks v-if="loaded && (welcome || tours.length > 0)" :tours="tours" :welcome="welcome" />
</template>

<script>
// What <introvox-tour-list> shows: the tours this user can start, from the
// same request as the personal settings, as links (TourLinks.vue). Nothing while tours are switched
// off for everyone, or when there is nothing to start.
import { onMounted, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

import TourLinks from './TourLinks.vue'

export default {
  name: 'EmbeddedTourList',
  components: {
    TourLinks
  },
  emits: ['loaded', 'error'],
  setup(props, { emit }) {
    const loaded = ref(false)
    const welcome = ref(false)
    const tours = ref([])

    onMounted(async () => {
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/personal/settings'))
        welcome.value = data?.toursEnabled === true
        tours.value = welcome.value && Array.isArray(data?.tours) ? data.tours : []
        loaded.value = true
        emit('loaded', { tours: tours.value, welcome: welcome.value })
      } catch (error) {
        // IntroVox not enabled for this user (403/412), or no answer
        emit('error', error?.message || String(error))
      }
    })

    return {
      loaded,
      welcome,
      tours
    }
  }
}
</script>
