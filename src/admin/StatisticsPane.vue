<template>
  <NcSettingsSection
    :name="t('introvox', 'Statistics')"
    :description="t('introvox', 'How the tours are used, and telemetry settings')"
  >
    <div v-if="loading" class="loading">
      <!-- TRANSLATORS: Shown while data is loading -->
      <NcLoadingIcon :size="32" :name="t('introvox', 'Loading …')" />
    </div>

    <div v-else class="statistics-content">
      <TourStatistics :tours="tours" :languages="languages" />

      <!-- Instance Statistics -->
      <h3 class="section-title">
        <!-- TRANSLATORS: Heading of figures about this Nextcloud server -->
        <Server :size="20" /> {{ t('introvox', 'Instance information') }}
      </h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ statistics.totalUsers || 0 }}</span>
          <!-- TRANSLATORS: Label under a number: how many accounts this Nextcloud has -->
          <span class="stat-label">{{ t('introvox', 'Total users') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ statistics.activeUsers30d || 0 }}</span>
          <!-- TRANSLATORS: Label under a number: accounts that logged in during the last 30 days. "30d" means 30 days -->
          <span class="stat-label">{{ t('introvox', 'Active users (30d)') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ totalStepsCount }}</span>
          <!-- TRANSLATORS: Label under a number: how many steps all tours have together -->
          <span class="stat-label">{{ t('introvox', 'Total steps') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ (statistics.languagesWithOverrides || []).length }}</span>
          <!-- TRANSLATORS: Label under a number: languages for which an administrator wrote steps of their own -->
          <span class="stat-label">{{ t('introvox', 'Languages with overrides') }}</span>
        </div>
      </div>

      <h3 class="section-title">
        <!-- TRANSLATORS: Section heading -->
        {{ t('introvox', 'Anonymous usage statistics') }}
      </h3>
      <p class="introvox-admin__hint">
        {{ t('introvox', 'Help improve IntroVox by sharing anonymous usage statistics.') }}
      </p>

      <div class="telemetry-settings">
        <div class="engagement-option">
          <NcCheckboxRadioSwitch
            type="switch"
            :model-value="telemetryEnabled"
            @update:model-value="toggleTelemetry"
          >
            <div class="option-info">
              <!-- TRANSLATORS: Label of a switch that turns the anonymous usage statistics on or off -->
              <span class="option-label">{{ t('introvox', 'Share anonymous usage statistics') }}</span>
              <span class="option-desc">{{ t('introvox', 'We collect: step counts per language, user counts, version info (IntroVox, Nextcloud, PHP), and basic server configuration. No personal data or step content is shared.') }}</span>
            </div>
          </NcCheckboxRadioSwitch>
        </div>

        <div v-if="telemetryEnabled" class="telemetry-info">
          <NcNoteCard type="success">
            <p>{{ t('introvox', 'Thank you for helping improve IntroVox!') }}</p>
            <p v-if="lastReport">
              <!-- TRANSLATORS: {date} is a date and time, such as "10/9/2026, 11:30:00 AM", or the word "Never" -->
              {{ t('introvox', 'Last report sent: {date}', { date: formatDate(lastReport) }, undefined, TEXT) }}
            </p>
            <NcButton
              :disabled="sending"
              @click="sendNow">
              <template #icon>
                <NcLoadingIcon v-if="sending" :size="20" />
                <Send v-else :size="20" />
              </template>
              <template v-if="sending">
                <!-- TRANSLATORS: Button label while the report is being sent -->
                {{ t('introvox', 'Sending …') }}
              </template>
              <template v-else>
                <!-- TRANSLATORS: Button: sends the anonymous usage report now -->
                {{ t('introvox', 'Send report now') }}
              </template>
            </NcButton>
          </NcNoteCard>
        </div>

        <!-- Reference content a reader consults once, so it collapses behind
             a native <details>: keyboard-operable, findable with the
             browser's find-in-page, announced as an expandable group, and it
             needs no ARIA of ours. -->
        <details class="telemetry-details">
          <summary>
            <ChevronRight class="telemetry-details__chevron" :size="20" aria-hidden="true" />
            {{ t('introvox', 'Exactly what is and is not sent') }}
          </summary>
          <TelemetryLists />
        </details>
      </div>
    </div>
  </NcSettingsSection>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSettingsSection } from '@nextcloud/vue'

import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Send from 'vue-material-design-icons/Send.vue'
import Server from 'vue-material-design-icons/Server.vue'

import TelemetryLists from './TelemetryLists.vue'
import TourStatistics from './TourStatistics.vue'
import { setTelemetry } from './telemetry.js'

/**
 * The Statistics pane: the numbers of each tour (TourStatistics), this
 * instance's totals, and the telemetry switch. Loaded each time it opens.
 */
export default {
  name: 'StatisticsPane',
  components: {
    ChevronRight,
    NcButton,
    NcCheckboxRadioSwitch,
    NcLoadingIcon,
    NcNoteCard,
    NcSettingsSection,
    Send,
    Server,
    TelemetryLists,
    TourStatistics
  },
  props: {
    // The tours, as the Tours list has them
    tours: {
      type: Array,
      default: () => []
    },
    // [{ code, name }]
    languages: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const statistics = ref({})
    const loading = ref(true)
    const telemetryEnabled = ref(false)
    const lastReport = ref(null)
    const sending = ref(false)

    const totalStepsCount = computed(() => Object.values(statistics.value.totalSteps || {}).reduce((a, b) => a + b, 0))

    const load = async () => {
      try {
        const { data } = await axios.get(generateUrl('/apps/introvox/admin/statistics'))
        if (data.success) {
          statistics.value = data.statistics
          telemetryEnabled.value = data.telemetry?.enabled || false
          lastReport.value = data.telemetry?.lastReport || null
        }
      } catch (error) {
        // TRANSLATORS: Error message
        showError(t('introvox', 'Error loading statistics'))
      } finally {
        loading.value = false
      }
    }

    const toggleTelemetry = async (enabled) => {
      telemetryEnabled.value = enabled
      if (!await setTelemetry(enabled)) {
        telemetryEnabled.value = !enabled
      }
    }

    const sendNow = async () => {
      sending.value = true
      try {
        const { data } = await axios.post(generateUrl('/apps/introvox/admin/telemetry/send'))
        if (data.success) {
          // TRANSLATORS: Message after the usage report was sent
          showSuccess(t('introvox', 'Statistics sent'))
          // For the time of the last report
          await load()
        } else {
          // TRANSLATORS: Error message; {error} is the reason, from the server, in English or in the user's language
          showError(t('introvox', 'Error sending statistics: {error}', { error: data.error || t('introvox', 'Unknown error') }))
        }
      } catch (error) {
        const message = error.response?.data?.error || error.message || t('introvox', 'Unknown error')
        showError(t('introvox', 'Error sending statistics: {error}', { error: message }))
      } finally {
        sending.value = false
      }
    }

    // TRANSLATORS: Shown instead of a date when no report was sent yet
    const formatDate = (timestamp) => (timestamp ? new Date(timestamp * 1000).toLocaleString(getCanonicalLocale()) : t('introvox', 'Never'))

    onMounted(load)

    return {
      TEXT,
      t,
      statistics,
      loading,
      telemetryEnabled,
      lastReport,
      sending,
      totalStepsCount,
      toggleTelemetry,
      sendNow,
      formatDate
    }
  }
}
</script>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.statistics-content {
  padding: 0;
}

.telemetry-settings {
  margin-top: 20px;
}

.engagement-option {
  margin-bottom: 16px;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label {
  font-weight: var(--font-weight-heading);
}

.option-desc {
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}

.telemetry-info {
  margin-top: 16px;
}

.telemetry-info p {
  margin: 0;
}

.telemetry-info p + p {
  margin-top: 8px;
}

.telemetry-details {
  margin-top: 24px;
  padding: 16px;
  background: var(--color-background-hover);
  border-radius: var(--border-radius-large);
}

/* A disclosure is a control, so the summary needs a target, a focus ring and a
   pointer -- none of which a bare <summary> has. `display: flex` gives all
   three but removes the marker box, leaving a row of stranded text with
   nothing saying it opens. The chevron below is therefore an explicit element,
   and the native marker is switched off so no browser draws a second one. */
.telemetry-details summary {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: var(--default-clickable-area);
  padding-inline: 4px;
  border-radius: var(--border-radius-element);
  color: var(--color-main-text);
  cursor: pointer;
  list-style: none;
}

.telemetry-details summary::-webkit-details-marker {
  display: none;
}

.telemetry-details summary:hover {
  background-color: var(--color-background-hover);
}

.telemetry-details summary:focus-visible {
  outline: 2px solid var(--color-primary-element);
  outline-offset: -2px;
}

/* One chevron rotated by the open state, not two icons swapped: one element,
   one transition, and it inherits the page's prefers-reduced-motion block. */
.telemetry-details__chevron {
  flex-shrink: 0;
  color: var(--color-text-maxcontrast);
  transition: transform var(--animation-quick) ease-in-out;
}

.telemetry-details[open] .telemetry-details__chevron {
  transform: rotate(90deg);
}

@media (max-width: 768px) {
  .telemetry-details {
    padding: 12px;
  }
}
</style>
