<template>
  <div class="introvox-tour-stats">
    <h3 class="section-title">
      <!-- TRANSLATORS: Section heading of the statistics per tour -->
      <ChartBar :size="20" /> {{ t('introvox', 'Tour usage') }}
    </h3>

    <div class="introvox-tour-stats__pickers">
      <!-- TRANSLATORS: Noun: label of the list of tours -->
      <NcSelect :input-label="t('introvox', 'Tour')"
        v-model="selectedTour"
        :options="tourOptions"
        label="label"
        :clearable="false" />
      <!-- TRANSLATORS: Label of a list of languages, as in "steps in German" -->
      <NcSelect v-if="languageOptions.length > 1" :input-label="t('introvox', 'Steps in')"
        v-model="selectedLanguage"
        :options="languageOptions"
        label="label"
        :clearable="false" />
    </div>

    <div v-if="loading" class="introvox-tour-stats__loading">
      <NcLoadingIcon :size="32" :name="t('introvox', 'Loading …')" />
    </div>

    <NcNoteCard v-else-if="failed"
      type="error"
      :text="t('introvox', 'The statistics could not be loaded.')" />

    <template v-else-if="stats">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.started }}</span>
          <!-- TRANSLATORS: Label under a number: how many people started the tour -->
          <span class="stat-label">{{ t('introvox', 'Users started') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.completed }}</span>
          <!-- TRANSLATORS: Label under a number: how many people finished the tour -->
          <span class="stat-label">{{ t('introvox', 'Users completed') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.skipped }}</span>
          <!-- TRANSLATORS: Label under a number: how many people skipped the tour -->
          <span class="stat-label">{{ t('introvox', 'Users skipped') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ percentText(stats.completed, stats.started) }}</span>
          <!-- TRANSLATORS: Label under a percentage: how many of the people who started the tour finished it -->
          <span class="stat-label">{{ t('introvox', 'Completion rate') }}</span>
        </div>
      </div>

      <h4 class="introvox-tour-stats__heading">
        <!-- TRANSLATORS: Heading of a chart with how many people reached each step -->
        {{ t('introvox', 'How far people get') }}
      </h4>
      <p class="introvox-admin__hint">
        {{ t('introvox', 'For each step, how many people got at least that far the last time the tour started by itself for them. Starts by hand and previews are not counted, and neither are runs from before this version of IntroVox.') }}
      </p>

      <NcEmptyContent v-if="stats.counted === 0"
        :name="t('introvox', 'Nobody has been counted yet')"
        :description="t('introvox', 'This fills in as people get the tour.')">
        <template #icon>
          <ChartBar :size="20" />
        </template>
      </NcEmptyContent>

      <ol v-else class="introvox-tour-stats__funnel">
        <li v-for="(step, index) in stats.steps"
          :key="step.id"
          class="introvox-tour-stats__step">
          <div class="introvox-tour-stats__step-text">
            <span class="introvox-tour-stats__step-title">
              {{ index + 1 }}. {{ step.title || step.id }}
            </span>
            <span v-if="!step.enabled" class="introvox-tour-stats__off">
              <!-- TRANSLATORS: Status: this step is switched off -->
              {{ t('introvox', 'Switched off') }}
            </span>
            <span class="introvox-tour-stats__count">
              {{ people(step.reached) }} · {{ percentText(step.reached, stats.counted) }}
            </span>
          </div>
          <div class="introvox-tour-stats__bar" aria-hidden="true">
            <span :style="{ width: percent(step.reached, stats.counted) + '%' }" />
          </div>
        </li>
      </ol>

      <p v-if="stats.other > 0" class="introvox-admin__hint">
        {{ elsewhere(stats.other) }}
      </p>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCanonicalLocale, translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'

import ChartBar from 'vue-material-design-icons/ChartBar.vue'

/**
 * The numbers of one tour: started, finished, skipped, and how far people
 * get, step by step (lib/Service/TourStatistics.php). Totals only.
 */
export default {
  name: 'TourStatistics',
  components: {
    ChartBar,
    NcEmptyContent,
    NcLoadingIcon,
    NcNoteCard,
    NcSelect
  },
  props: {
    // The tours, as the Tours list has them
    tours: {
      type: Array,
      default: () => []
    },
    // [{ code, name }], for the names of languages
    languages: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const tourOptions = computed(() => props.tours.map(tour => ({
      id: tour.id,
      label: tour.id === 'welcome' ? t('introvox', 'Welcome tour') : tour.name
    })))
    const selectedTour = ref(null)
    const selectedLanguage = ref(null)
    const stats = ref(null)
    const loading = ref(false)
    const failed = ref(false)

    const languageName = (code) => props.languages.find(language => language.code === code)?.name || code
    const languageOptions = computed(() => (stats.value?.languages || []).map(code => ({ id: code, label: languageName(code) })))

    const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
    // As text, in the user's locale: "50 %" in French, "50%" in English
    const percentFormat = new Intl.NumberFormat(getCanonicalLocale(), { style: 'percent' })
    const percentText = (part, whole) => percentFormat.format(percent(part, whole) / 100)
    // Plurals in the script: the Transifex bot reads n() only there
    // TRANSLATORS: %n is a number of people, shown next to a bar in a chart
    const people = (count) => n('introvox', '%n person', '%n people', count)
    // TRANSLATORS: %n is a number of people
    const elsewhere = (count) => n('introvox', '%n person got to a step that is not in this list: deleted since, or a step of another language.', '%n people got to a step that is not in this list: deleted since, or a step of another language.', count)

    let request = 0
    const load = async () => {
      if (!selectedTour.value) {
        return
      }
      const mine = ++request
      loading.value = true
      failed.value = false
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/tours/{id}/statistics', { id: selectedTour.value.id }), {
          params: { lang: selectedLanguage.value?.id || '' }
        })
        if (mine !== request) {
          return
        }
        stats.value = data.statistics
        // The server says which language the steps are in
        if (selectedLanguage.value?.id !== data.statistics.language) {
          selectedLanguage.value = { id: data.statistics.language, label: languageName(data.statistics.language) }
        }
      } catch (error) {
        if (mine === request) {
          failed.value = true
        }
      } finally {
        if (mine === request) {
          loading.value = false
        }
      }
    }

    // The welcome tour first; another tour starts in its own main language
    watch(tourOptions, (options) => {
      if (!selectedTour.value || !options.some(option => option.id === selectedTour.value.id)) {
        selectedTour.value = options[0] || null
      }
    }, { immediate: true })
    watch(() => selectedTour.value?.id, () => {
      selectedLanguage.value = null
      load()
    }, { immediate: true })
    watch(() => selectedLanguage.value?.id, (code, previous) => {
      if (code && previous && code !== stats.value?.language) {
        load()
      }
    })

    return {
      t,
      people,
      elsewhere,
      tourOptions,
      selectedTour,
      selectedLanguage,
      languageOptions,
      stats,
      loading,
      failed,
      percent,
      percentText
    }
  }
}
</script>

<style scoped>
.introvox-tour-stats__pickers {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.introvox-tour-stats__pickers > * {
  flex: 1 1 220px;
  max-width: 320px;
}

.introvox-tour-stats__loading {
  display: flex;
  justify-content: center;
  padding: 24px;
}

/* Below "Tour usage", so no larger than it */
.introvox-tour-stats__heading {
  margin: 24px 0 4px;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
}

.introvox-tour-stats__funnel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 12px 0;
  padding: 0;
  list-style: none;
}

.introvox-tour-stats__step-text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-bottom: 4px;
}

.introvox-tour-stats__step-title {
  flex: 1 1 200px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.introvox-tour-stats__off {
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.introvox-tour-stats__count {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-maxcontrast);
}

.introvox-tour-stats__bar {
  height: 8px;
  border-radius: var(--border-radius-pill, 8px);
  background: var(--color-background-dark);
  overflow: hidden;
}

.introvox-tour-stats__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary-element);
}
</style>
