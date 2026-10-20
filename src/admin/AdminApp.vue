<template>
  <div class="introvox-admin">
    <!-- A pill row over panes swapped with v-if, the pattern core's user_ldap
         uses for a settings page with several concerns. NcRadioGroup rather
         than hand-built buttons: it renders a real <fieldset> and takes a
         group label, so the row tells a screen reader that these four belong
         together and which one is chosen. The pills' typography, height and
         colours come from the component. -->
    <!-- TRANSLATORS: Invisible group label (for screen readers) of the row of tabs on the administration page: Settings, Tours, Statistics, Support -->
    <NcRadioGroup v-model="activeTab" :label="t('introvox', 'Settings section')"
      hide-label
      class="introvox-admin__panes">
      <NcRadioGroupButton v-for="pane in panes"
        :key="pane.id"
        :value="pane.id"
        :label="pane.name">
        <template #icon>
          <component :is="pane.icon" :size="20" />
        </template>
      </NcRadioGroupButton>
    </NcRadioGroup>

    <SettingsPane v-if="activeTab === 'settings'"
      :welcome-overrides="welcomeOverrides"
      @tours-enabled="toursEnabledAll = $event" />

    <!-- Tours: the list first; a tour opens in its step editor -->
    <ToursList
      v-if="activeTab === 'steps' && !currentTour"
      :tours="tours"
      :tours-enabled="toursEnabledAll"
      @open="openTour"
      @create="tourDialog = { tour: null }"
      @toggle="toggleTour"
      @reshow="reshowTour"
      @remove="removeTour"
      @preview="previewTour"
      @copy-link="copyLink"
      @export="exportTour"
      @import="importTour"
    />
    <TourEditor
      v-if="activeTab === 'steps' && currentTour"
      ref="editorRef"
      :key="currentTour.id"
      :tour="currentTour"
      :languages="allLanguages"
      :groups="availableGroups"
      @close="closeTour"
      @settings="tourDialog = { tour: currentTour }"
    />
    <NewTourDialog
      v-if="tourDialog"
      :tour="tourDialog.tour"
      :languages="allLanguages"
      :groups="availableGroups"
      @saved="onTourSaved"
      @close="tourDialog = null"
    />

    <StatisticsPane v-if="activeTab === 'statistics'"
      :tours="tours"
      :languages="allLanguages" />

    <SupportSettings v-if="activeTab === 'support'" @show-intro="startIntro" />

    <TelemetryQuestion v-if="telemetryQuestionOpen" @close="telemetryQuestionOpen = false" />

    <!-- Preview from the list (the editor has its own) -->
    <TourPreview
      v-if="preview"
      :steps="preview.steps"
      :start-page="preview.startPage || ''"
      :groups="availableGroups"
      @close="preview = null"
    />
  </div>
</template>

<script>
import { computed, nextTick, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { showError, showWarning } from '@nextcloud/dialogs'
import '@nextcloud/dialogs/style.css'
// Deep imports rather than the barrel, which pulls in the whole library
import NcRadioGroup from '@nextcloud/vue/components/NcRadioGroup'
import NcRadioGroupButton from '@nextcloud/vue/components/NcRadioGroupButton'

import ChartBox from 'vue-material-design-icons/ChartBox.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import FormatListNumbered from 'vue-material-design-icons/FormatListNumbered.vue'
import Lifebuoy from 'vue-material-design-icons/Lifebuoy.vue'

import SupportSettings from '../components/SupportSettings.vue'
import TourPreview from '../preview/TourPreview.vue'
import { triggerPage } from '../utils/pages.mjs'
import { startAdminIntro } from './adminIntro.js'
import NewTourDialog from './NewTourDialog.vue'
import SettingsPane from './SettingsPane.vue'
import StatisticsPane from './StatisticsPane.vue'
import TelemetryQuestion from './TelemetryQuestion.vue'
import TourEditor from './TourEditor.vue'
import ToursList from './ToursList.vue'
import { useTours } from './useTours.js'

/**
 * IntroVox's admin page: four panes (SettingsPane, the Tours list with
 * TourEditor for the open tour, StatisticsPane, SupportSettings), the admin
 * intro (adminIntro.js) that walks through them, and the telemetry question
 * it ends with.
 */
export default {
  name: 'AdminApp',
  components: {
    NcRadioGroup,
    NcRadioGroupButton,
    NewTourDialog,
    SettingsPane,
    StatisticsPane,
    SupportSettings,
    TelemetryQuestion,
    TourEditor,
    TourPreview,
    ToursList
  },
  props: {
    // From templates/admin.php: whether this admin has seen the admin intro,
    // and whether any admin has been asked about telemetry
    introDone: {
      type: Boolean,
      default: false
    },
    telemetryAsked: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    // The panes of the settings page. Four one-word labels, well inside the
    // ~seven a pill row holds: the grouped variant neither wraps nor
    // truncates, so a row that does not fit overflows.
    const panes = computed(() => [
      // TRANSLATORS: Noun: tab on the administration page with the global settings; keep it short
      { id: 'settings', name: t('introvox', 'Settings'), icon: Cog },
      // TRANSLATORS: Noun: tab on the administration page, the heading of the list of tours, and the entry in the user menu; keep it short
      { id: 'steps', name: t('introvox', 'Tours'), icon: FormatListNumbered },
      // TRANSLATORS: Noun: tab and section heading on the administration page; keep it short
      { id: 'statistics', name: t('introvox', 'Statistics'), icon: ChartBox },
      // TRANSLATORS: Noun: tab on the administration page with help and contact information; keep it short
      { id: 'support', name: t('introvox', 'Support'), icon: Lifebuoy },
    ])
    const activeTab = ref('settings')

    // Every language Nextcloud has, and the groups, for the editor and dialogs
    const allLanguages = ref([])
    const availableGroups = ref([])

    const loadAvailableLanguages = async () => {
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/languages'))
        if (data.success && data.languages) {
          allLanguages.value = data.languages
        }
      } catch (error) {
        // TRANSLATORS: The language name, shown in a language list when the list of languages could not be loaded
        allLanguages.value = [{ code: 'en', name: t('introvox', 'English') }]
        showWarning(t('introvox', 'Could not load available languages, using English only'))
      }
    }

    const loadAvailableGroups = async () => {
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/groups'))
        if (data.success && data.groups) {
          availableGroups.value = data.groups
        }
      } catch (error) {
        availableGroups.value = []
      }
    }

    // Tours (lib/Controller/ToursController.php): the list, and the one open
    // in the step editor
    const currentTour = ref(null)
    const tourDialog = ref(null)
    const editorRef = ref(null)
    // { steps, startPage } while a preview from the list is open
    const preview = ref(null)

    // The list and its actions (useTours); the tour open here follows changes
    const {
      tours,
      toursEnabledAll,
      loadTours,
      replaceTour,
      toggleTour,
      reshowTour,
      removeTour,
      copyLink,
      exportTour,
      importTour
    } = useTours({
      onChanged: (tour) => {
        if (currentTour.value?.id === tour.id) {
          currentTour.value = { ...currentTour.value, ...tour }
        }
      }
    })

    // Languages with steps of the admin's own for the welcome tour
    const welcomeOverrides = computed(() => tours.value.find(tour => tour.id === 'welcome')?.languages?.length || 0)

    // Resolves once the open tour's editor has its steps
    const editorReady = async () => {
      await nextTick()
      await editorRef.value?.ready()
    }

    const openTour = async (tour) => {
      currentTour.value = tour
      await editorReady()
    }

    // The editor wrote every change before it asks to close
    const closeTour = async () => {
      currentTour.value = null
      await loadTours()
    }

    // The whole tour, in its main language (the welcome tour: English), on
    // its own page
    const previewTour = async (tour) => {
      try {
        const language = tour.id === 'welcome' ? 'en' : tour.mainLanguage
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/steps'), { params: { lang: language, tour: tour.id } })
        preview.value = { steps: data.steps || [], startPage: tour.id === 'welcome' ? '' : triggerPage(tour.trigger) }
      } catch (error) {
        showError(t('introvox', 'The tour could not be loaded.'))
      }
    }

    // A new tour opens in the editor with its first step; a changed one
    // just updates
    const onTourSaved = async (tour) => {
      const isNew = !tours.value.some(candidate => candidate.id === tour.id)
      tourDialog.value = null
      if (!isNew) {
        replaceTour(tour)
        return
      }
      await loadTours()
      await openTour(tours.value.find(candidate => candidate.id === tour.id) || tour)
      editorRef.value?.addStep()
    }

    // Admin intro (adminIntro.js): once for every admin, and from Support.
    // It ends with the telemetry question, asked once per instance.
    const telemetryQuestionOpen = ref(false)
    let telemetryAsked = props.telemetryAsked

    // tourId: open that tour in the step editor; '' for the list of tours
    const showPane = async (pane, tourId = undefined) => {
      activeTab.value = pane
      if (pane === 'steps' && tourId === '') {
        currentTour.value = null
      } else if (pane === 'steps' && tourId) {
        const tour = tours.value.find(candidate => candidate.id === tourId)
        if (tour && currentTour.value?.id !== tourId) {
          currentTour.value = tour
        }
        await editorReady()
      }
      await nextTick()
    }

    const askTelemetry = () => {
      if (telemetryAsked) {
        return
      }
      telemetryAsked = true
      telemetryQuestionOpen.value = true
      // From here telemetry is on unless an admin declines
      axios.post(generateUrl('/apps/introvox/admin/telemetry/asked')).catch(() => {})
    }

    const startIntro = () => {
      const paneBefore = activeTab.value
      const tourBefore = currentTour.value
      startAdminIntro({
        showPane,
        onEnd: () => {
          activeTab.value = paneBefore
          currentTour.value = tourBefore
          axios.post(generateUrl('/apps/introvox/admin/intro/done')).catch(() => {})
          askTelemetry()
        }
      })
    }

    const initializeAdmin = async () => {
      await loadAvailableLanguages()
      await loadAvailableGroups()
      await loadTours()
      if (!props.introDone) {
        startIntro()
      } else {
        askTelemetry()
      }
    }
    initializeAdmin()

    return {
      t,
      panes,
      activeTab,
      allLanguages,
      availableGroups,
      tours,
      toursEnabledAll,
      welcomeOverrides,
      currentTour,
      tourDialog,
      editorRef,
      preview,
      openTour,
      closeTour,
      toggleTour,
      reshowTour,
      removeTour,
      previewTour,
      copyLink,
      exportTour,
      importTour,
      onTourSaved,
      telemetryQuestionOpen,
      startIntro
    }
  }
}
</script>

<style scoped>
.introvox-admin {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* The pane row. Typography, height and the active fill come from
   NcRadioGroup; what is left is the distance to the panes and the two
   corrections below, which match MetaVox so both admin pages read alike. */
/* NcSettingsSection insets itself 28px on all four sides. The pane row and
   the steps list sit outside a section, so they carry that inset themselves
   or they are the blocks on the page with a different edge -- measured 339px
   against the sections' 367px before this. */
.introvox-admin__panes {
  margin: 28px 28px 24px;
  max-width: 900px;
}

/* The library renders these labels at the body size and weight, the same as
   the paragraph under them, so nothing but the fill says the pills are a
   control. A segmented control is chrome, not content: the smaller step. */
.introvox-admin__panes :deep([class*='radioGroupButton__label']) {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-element);
}

/* The grouped variant is flex-wrap: nowrap by design -- the pills are meant to
   read as one segmented control -- so four of them measured 506px inside a
   393px viewport and the last was simply unreachable: the page does not
   scroll sideways. Below the phone breakpoint they wrap instead. That costs
   the joined-segment look, which is the right trade: a control you cannot
   reach is worse than one drawn as separate buttons. */
@media (max-width: 660px) {
  .introvox-admin__panes :deep([class*='ncFormBox']) {
    flex-wrap: wrap;
    gap: 8px;
  }

  .introvox-admin__panes :deep([class*='radioGroupButton']) {
    border-radius: var(--border-radius-element);
    border-inline-width: 2px;
    /* Without this the last pill on a wrapped line stretches to fill it,
       which reads as the selected one. A pill is as wide as its label. */
    flex: 0 0 auto;
  }
}
</style>

<style>
/* Shared by the panes' own components (SettingsPane, StatisticsPane,
   TourStatistics), so not scoped; every rule stays under .introvox-admin */
.introvox-admin .introvox-admin__hint {
  color: var(--color-text-maxcontrast);
  margin-top: 8px;
  margin-bottom: 16px;
  font-size: var(--default-font-size);
}

.introvox-admin .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: var(--font-weight-heading);
  margin: 24px 0 16px 0;
  color: var(--color-main-text);
}

.introvox-admin .section-title:first-child {
  margin-top: 0;
}

.introvox-admin .stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.introvox-admin .stat-card {
  background: var(--color-background-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-large);
  padding: 20px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.introvox-admin .stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.introvox-admin .stat-value {
  display: block;
  font-size: 32px;
  font-weight: var(--font-weight-heading);
  color: var(--color-primary-element);
  line-height: 1.2;
}

.introvox-admin .stat-label {
  display: block;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .introvox-admin .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
