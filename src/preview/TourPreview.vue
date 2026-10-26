<template>
  <NextcloudFrame
    :name="frameName"
    :start-page="startPage"
    :title="previewTitle"
    :close-label="t('introvox', 'Close')"
    @load="onFrameLoad"
    @escape="$emit('close')"
    @close="$emit('close')"
  >
    <template #icon>
      <Play :size="20" />
    </template>

    <template #bar>
      <div class="introvox-preview__controls">
        <!-- TRANSLATORS: Label of a list of groups: show the tour as a member of that group gets it -->
        <NcSelect :input-label="t('introvox', 'Preview as')"
          v-if="!stepId"
          v-model="audience"
          class="introvox-preview__audience"
          :options="audienceOptions"
          label="displayName"
          :clearable="false"
          @update:model-value="run()"
        />
        <NcButton :disabled="!frameReady" @click="run()">
          <template #icon>
            <Replay :size="20" />
          </template>
          <!-- TRANSLATORS: Button (verb): starts the preview again -->
          {{ t('introvox', 'Restart') }}
        </NcButton>
      </div>
    </template>

    <div v-if="notice" class="introvox-preview__notice">
      <NcNoteCard type="info" :text="notice" />
    </div>
  </NextcloudFrame>
</template>

<script>
import { ref, computed } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcNoteCard from '@nextcloud/vue/components/NcNoteCard'
import NcSelect from '@nextcloud/vue/components/NcSelect'

import Play from 'vue-material-design-icons/Play.vue'
import Replay from 'vue-material-design-icons/Replay.vue'

import NextcloudFrame from '../frame/NextcloudFrame.vue'
import { PREVIEW_FRAME_NAME } from '../frame/frameNames.js'

/**
 * Runs the tour inside a live Nextcloud page, with steps straight from the
 * admin page rather than what the server would serve the admin. main.js puts
 * the frame's WizardManager in preview mode, so nothing is tracked or marked
 * as seen (see WizardManager's runPreview).
 */
export default {
  name: 'TourPreview',
  components: {
    NcButton,
    NcNoteCard,
    NcSelect,
    Play,
    Replay,
    NextcloudFrame
  },
  props: {
    // Steps in their stored shape, for the language being edited
    steps: {
      type: Array,
      required: true
    },
    // Show only this step, even while it is disabled
    stepId: {
      type: String,
      default: null
    },
    // [{ id, displayName }] for "Preview as"
    groups: {
      type: Array,
      default: () => []
    },
    // The tour's own page, for a tour that starts in an app
    startPage: {
      type: String,
      default: ''
    }
  },
  emits: ['close'],
  setup(props) {
    const frameReady = ref(false)
    const notice = ref('')
    let frameWindow = null
    let started = false

    // In script, so the string can carry a translator hint
    // TRANSLATORS: Title of the screen that shows a tour as users get it
    const previewTitle = t('introvox', 'Tour preview')

    // TRANSLATORS: The first choice in the "Preview as" list: show every step, whatever the group
    const allSteps = { id: '', displayName: t('introvox', 'All steps') }
    const audience = ref(allSteps)
    const audienceOptions = computed(() => [allSteps, ...props.groups])

    // The same rule the server applies per user (ApiController): steps
    // without groups are for everyone, the rest only for their groups.
    const visibleSteps = computed(() => {
      const groupId = audience.value?.id
      if (!groupId) {
        return props.steps
      }
      return props.steps.filter(step => !step.visibleToGroups?.length || step.visibleToGroups.includes(groupId))
    })

    // fresh: start from the first step. Otherwise the tour continues where
    // it navigated to another app for a step (WizardManager's resume).
    const run = async ({ fresh = true } = {}) => {
      const api = frameWindow?.introVoxPreview
      if (!api) {
        notice.value = t('introvox', 'The tour could not be started on this page.')
        return
      }
      notice.value = ''
      // Plain copies: the frame is another realm and must not get Vue proxies.
      const steps = JSON.parse(JSON.stringify(visibleSteps.value))
      let shown
      try {
        shown = await api.run(steps, { stepId: props.stepId, fresh })
      } catch (error) {
        // The tour code did not load (a dropped connection): Restart tries again
        notice.value = t('introvox', 'The tour could not be started on this page.')
        return
      }
      if (shown === 0) {
        notice.value = t('introvox', 'No steps to show for this selection.')
      }
    }

    // Start on the first page. Later page loads come from a step that opened
    // another app (continue there), or from the admin browsing (leave it;
    // "Restart" runs the tour on the page they are on).
    const onFrameLoad = (view) => {
      frameWindow = view
      frameReady.value = !!view
      if (!view) {
        return
      }
      if (!started) {
        started = true
        run()
      } else if (view.introVoxPreview?.hasPendingResume()) {
        run({ fresh: false })
      }
    }

    return {
      frameName: PREVIEW_FRAME_NAME,
      previewTitle,
      frameReady,
      notice,
      audience,
      audienceOptions,
      run,
      onFrameLoad,
      t
    }
  }
}
</script>

<style scoped>
.introvox-preview__controls {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.introvox-preview__audience {
  min-width: 240px;
}

.introvox-preview__notice {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100% - 32px));
}
</style>
