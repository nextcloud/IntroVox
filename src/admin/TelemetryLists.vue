<template>
  <div class="telemetry-lists">
    <!-- TRANSLATORS: Heading of a list of the data the anonymous usage statistics contain -->
    <h4>{{ t('introvox', 'What we collect:') }}</h4>
    <ul>
      <li v-for="item in collected" :key="item">
        {{ item }}
      </li>
    </ul>
    <!-- TRANSLATORS: Heading of a list of data the anonymous usage statistics never contain -->
    <h4>{{ t('introvox', 'What we never collect:') }}</h4>
    <ul class="not-collected">
      <li v-for="item in notCollected" :key="item">
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

import { telemetryCollected, telemetryNotCollected } from './telemetry.js'

/**
 * What telemetry sends and never sends, on the Statistics pane and in the
 * question after the admin intro
 */
export default {
  name: 'TelemetryLists',
  setup() {
    return {
      t,
      collected: telemetryCollected(),
      notCollected: telemetryNotCollected()
    }
  }
}
</script>

<style scoped>
.telemetry-lists h4 {
  margin: 20px 0 12px 0;
  font-size: var(--default-font-size);
  font-weight: var(--font-weight-heading);
  color: var(--color-main-text);
}

.telemetry-lists ul {
  margin: 0;
  padding-inline-start: 24px;
  color: var(--color-text-maxcontrast);
}

.telemetry-lists ul li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.telemetry-lists ul.not-collected {
  list-style: none;
  padding-inline-start: 0;
  color: var(--color-main-text);
}

.telemetry-lists ul.not-collected li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.telemetry-lists ul.not-collected li::before {
  content: '✓';
  color: var(--color-success-text);
  font-weight: var(--font-weight-heading);
  flex-shrink: 0;
}
</style>
