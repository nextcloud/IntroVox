<template>
  <!-- Asked once per instance, after the admin intro. Closing it without an
       answer leaves telemetry on (TelemetryService::isEnabled). -->
  <NcDialog
    :name="dialogName"
    size="normal"
    @update:open="open => { if (!open) $emit('close') }">
    <div class="telemetry-question">
      <p>{{ t('introvox', 'IntroVox can send anonymous usage statistics once a day, so its makers see which versions and features are in use. It is on unless you choose not to share, and you can change it at any time under Statistics.') }}</p>
      <TelemetryLists />
    </div>
    <template #actions>
      <NcButton @click="answer(false)">
        <!-- TRANSLATORS: Button: do not send anonymous usage statistics -->
        {{ t('introvox', 'Do not share') }}
      </NcButton>
      <NcButton variant="primary" @click="answer(true)">
        <!-- TRANSLATORS: Button (verb): send anonymous usage statistics -->
        {{ t('introvox', 'Share') }}
      </NcButton>
    </template>
  </NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcDialog from '@nextcloud/vue/components/NcDialog'

import TelemetryLists from './TelemetryLists.vue'
import { setTelemetry } from './telemetry.js'

/**
 * The telemetry question at the end of the admin intro (AdminApp)
 */
export default {
  name: 'TelemetryQuestion',
  components: {
    NcButton,
    NcDialog,
    TelemetryLists
  },
  emits: ['close'],
  setup(props, { emit }) {
    const answer = async (enabled) => {
      emit('close')
      await setTelemetry(enabled)
    }

    // In script, so the string can carry a translator hint
    // TRANSLATORS: Dialog title: a question about sharing anonymous usage statistics. "IntroVox" is the app name
    const dialogName = t('introvox', 'Help improve IntroVox')

    return { t, dialogName, answer }
  }
}
</script>

<style scoped>
.telemetry-question p {
  margin: 0;
}
</style>
