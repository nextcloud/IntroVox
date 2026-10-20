<template>
  <div ref="rootRef"
    class="step-media"
    tabindex="-1"
    @paste="onPaste">
    <!-- TRANSLATORS: Label of the part of a step where you add one image or video -->
    <span class="step-media__label">{{ t('introvox', 'Image or video') }}</span>

    <div v-if="!modelValue" class="step-media__empty">
      <NcButton :disabled="busy" @click="chooseUpload('media')">
        <template #icon>
          <Upload :size="20" />
        </template>
        <!-- TRANSLATORS: Button (verb): upload a file from your computer -->
        {{ t('introvox', 'Upload') }}
      </NcButton>
      <NcButton :disabled="busy" @click="chooseFromFiles">
        <template #icon>
          <FolderOutline :size="20" />
        </template>
        <!-- TRANSLATORS: Button: pick a file from the Nextcloud Files app. "Files" is the app name -->
        {{ t('introvox', 'Choose from Files') }}
      </NcButton>
      <span class="step-media__hint">{{ t('introvox', 'Or paste a screenshot here') }}</span>
    </div>

    <div v-else class="step-media__filled">
      <div class="step-media__preview">
        <video v-if="video"
          :src="mediaUrl(modelValue.file)"
          :width="modelValue.width || undefined"
          :height="modelValue.height || undefined"
          controls
          muted
          preload="metadata" />
        <img v-else
          :src="mediaUrl(modelValue.file)"
          :width="modelValue.width || undefined"
          :height="modelValue.height || undefined"
          :alt="modelValue.alt || ''">
      </div>
      <div class="step-media__fields">
        <!-- TRANSLATORS: Label of a text field: a description of the image for people who cannot see it ("alt text" is the HTML term) -->
        <NcTextField :label="t('introvox', 'Description (alt text)') + (modelValue.decorative ? '' : ' *')"
          :model-value="modelValue.alt || ''"
          :disabled="modelValue.decorative"
          :error="altMissing"
          :helper-text="altMissing ? t('introvox', 'Describe what it shows, for people who cannot see it.') : ''"
          @update:model-value="update({ alt: $event })" />
        <NcCheckboxRadioSwitch
          :model-value="modelValue.decorative === true"
          @update:model-value="update({ decorative: $event })">
          <!-- TRANSLATORS: Checkbox: the image is only decoration, so it needs no description -->
          {{ t('introvox', 'Decorative, no description needed') }}
        </NcCheckboxRadioSwitch>
        <!-- TRANSLATORS: Noun: label of three choices for the size of an image -->
        <NcRadioGroup :label="t('introvox', 'Size')"
          :model-value="modelValue.size || 'full'"
          @update:model-value="update({ size: $event })">
          <!-- TRANSLATORS: Choice for the size of an image; keep it short -->
          <NcRadioGroupButton value="small" :label="t('introvox', 'Small')" />
          <!-- TRANSLATORS: Choice for the size of an image: as wide as the step; keep it short -->
          <NcRadioGroupButton value="full" :label="t('introvox', 'Full width')" />
          <!-- TRANSLATORS: Choice for the size of an image: the whole step becomes wider; keep it short -->
          <NcRadioGroupButton value="wide" :label="t('introvox', 'Wide step')" />
        </NcRadioGroup>
        <template v-if="video">
          <!-- TRANSLATORS: Noun: label of two choices for how a video plays -->
          <NcRadioGroup :label="t('introvox', 'Playback')"
            :model-value="modelValue.playback || 'controls'"
            @update:model-value="update({ playback: $event })">
            <!-- TRANSLATORS: Choice: the video plays when the user presses play; keep it short -->
            <NcRadioGroupButton value="controls" :label="t('introvox', 'With a play button')" />
            <!-- TRANSLATORS: Choice: the video plays silently and repeats, like an animated GIF image; keep it short -->
            <NcRadioGroupButton value="loop" :label="t('introvox', 'Plays like a GIF')" />
          </NcRadioGroup>
          <div class="step-media__captions">
            <!-- TRANSLATORS: Status: the video has a captions file -->
            <span v-if="modelValue.captions">{{ t('introvox', 'Captions added') }}</span>
            <!-- TRANSLATORS: Status: the video has no captions file -->
            <span v-else>{{ t('introvox', 'No captions') }}</span>
            <NcButton v-if="!modelValue.captions" variant="tertiary" :disabled="busy" @click="chooseUpload('captions')">
              <template #icon>
                <ClosedCaptionOutline :size="20" />
              </template>
              <!-- TRANSLATORS: Button: add a captions file for the video. ".vtt" is the file extension, keep it -->
              {{ t('introvox', 'Add captions (.vtt)') }}
            </NcButton>
            <NcButton v-else variant="tertiary" @click="update({ captions: '' })">
              <!-- TRANSLATORS: Button: removes the captions file from the video -->
              {{ t('introvox', 'Remove captions') }}
            </NcButton>
          </div>
        </template>
        <div class="step-media__actions">
          <NcButton variant="tertiary" :disabled="busy" @click="chooseUpload('media')">
            <template #icon>
              <SwapHorizontal :size="20" />
            </template>
            <!-- TRANSLATORS: Button (verb): replace the image or video by another file -->
            {{ t('introvox', 'Replace') }}
          </NcButton>
          <NcButton variant="tertiary" @click="$emit('update:modelValue', null)">
            <template #icon>
              <Close :size="20" />
            </template>
            <!-- TRANSLATORS: Button (verb): removes the image or video from the step -->
            {{ t('introvox', 'Remove') }}
          </NcButton>
        </div>
      </div>
    </div>

    <p v-if="!modelValue && uploadLimit" class="step-media__hint">
      <!-- TRANSLATORS: {size} is a file size with its unit, such as "10 MB" -->
      {{ t('introvox', 'This server accepts uploads up to {size}. Put larger files in your Files and choose them from there.', { size: megabytes(uploadLimit) }, undefined, TEXT) }}
    </p>
    <NcProgressBar v-if="busy" :value="progress" size="small" />
    <NcNoteCard v-if="error" type="error" :text="error" />
    <NcNoteCard v-else-if="video && modelValue.hasAudio && modelValue.playback !== 'loop' && !modelValue.captions"
      type="warning"
      :text="t('introvox', 'This video has sound but no captions. People who cannot hear it will miss what is said.')" />
    <p class="step-media__hint">
      {{ t('introvox', 'Everyone who gets this step can see it. IntroVox keeps its own copy: changing or deleting the original in Files does not change the step.') }}
    </p>

    <input ref="fileInputRef"
      type="file"
      class="hidden-visually"
      tabindex="-1"
      aria-hidden="true"
      :accept="pendingKind === 'captions' ? '.vtt,text/vtt' : 'image/png,image/jpeg,image/gif,video/mp4,video/webm'"
      @change="onFileChosen">
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { getFilePickerBuilder } from '@nextcloud/dialogs'
import {
  NcButton,
  NcCheckboxRadioSwitch,
  NcNoteCard,
  NcProgressBar,
  NcRadioGroup,
  NcRadioGroupButton,
  NcTextField
} from '@nextcloud/vue'

import ClosedCaptionOutline from 'vue-material-design-icons/ClosedCaptionOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import SwapHorizontal from 'vue-material-design-icons/SwapHorizontal.vue'
import Upload from 'vue-material-design-icons/Upload.vue'

import { isVideo, mediaUrl } from '../utils/stepMedia.js'

/**
 * The image or video of a step: uploaded, chosen from the admin's Files or
 * pasted, then described. The server checks and cleans every file
 * (lib/Service/MediaService.php) and keeps its own copy; the step stores its
 * id. Save stays off in the wizard while a description is missing.
 */
export default {
  name: 'StepMediaBlock',
  components: {
    ClosedCaptionOutline,
    Close,
    FolderOutline,
    NcButton,
    NcCheckboxRadioSwitch,
    NcNoteCard,
    NcProgressBar,
    NcRadioGroup,
    NcRadioGroupButton,
    NcTextField,
    SwapHorizontal,
    Upload
  },
  props: {
    // The step's media block, or null
    modelValue: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const rootRef = ref(null)
    const fileInputRef = ref(null)
    const pendingKind = ref('media')
    const busy = ref(false)
    const progress = ref(0)
    const error = ref('')

    const video = computed(() => !!props.modelValue && isVideo(props.modelValue.file))
    const altMissing = computed(() => !!props.modelValue && !props.modelValue.decorative && !(props.modelValue.alt || '').trim())

    const update = (changes) => {
      emit('update:modelValue', { ...props.modelValue, ...changes })
    }

    // In the user's locale, unit included ("10 MB", "10 Mo")
    const megabyteFormat = new Intl.NumberFormat(getCanonicalLocale(), { style: 'unit', unit: 'megabyte', maximumFractionDigits: 0 })
    const megabytes = (bytes) => megabyteFormat.format(bytes / 1024 / 1024)

    // PHP's upload limit on this server (AdminSettings), checked before
    // sending; IntroVox's own limits per type are checked by the server
    const uploadLimit = Number(document.getElementById('introvox-admin-app')?.dataset.uploadLimit) || 0

    // The server answers with a reason code (MediaUploadController::refused)
    const describe = (reason, limit, kind) => {
      switch (reason) {
      case 'unsupported_type':
        return kind === 'captions'
          ? t('introvox', 'Use a WebVTT (.vtt) captions file.')
          : t('introvox', 'This file type is not supported. Use a PNG, JPEG or GIF image, or an MP4 or WebM video.')
      case 'too_large':
        // TRANSLATORS: {size} is a file size with its unit, such as "10 MB"
        return t('introvox', 'The file is too large. The limit is {size}.', { size: megabytes(limit || 0) }, undefined, TEXT)
      case 'too_large_for_server':
        return t('introvox', 'The file is larger than this server accepts for uploads. Put it in your Files and choose it from there.')
      case 'too_many_pixels':
        // TRANSLATORS: {megapixels} is a number, such as 40
        return t('introvox', 'The image is too large: at most {megapixels} megapixels.', { megapixels: Math.round((limit || 0) / 1000000) }, undefined, TEXT)
      case 'too_many_files':
      case 'quota':
        return t('introvox', 'IntroVox has no room for more media. Remove images and videos from steps that no longer need them.')
      case 'metadata_track':
        return t('introvox', 'This video has a track with extra data, such as a location. Export the video without metadata and try again.')
      case 'view_only':
        return t('introvox', 'This file is shared with you for viewing only, so it cannot be used in a step.')
      case 'corrupt':
        return t('introvox', 'The file could not be read. It may be damaged.')
      case 'not_found':
      case 'no_file':
        return t('introvox', 'The file could not be found.')
      default:
        return t('introvox', 'The file could not be added.')
      }
    }

    const accept = (stored, kind) => {
      error.value = ''
      if (kind === 'captions') {
        update({ captions: stored.file })
        return
      }
      const keep = props.modelValue || {}
      const media = {
        file: stored.file,
        alt: keep.alt || '',
        decorative: keep.decorative === true,
        size: keep.size || 'full',
        width: stored.width,
        height: stored.height,
        animated: stored.animated,
      }
      if (isVideo(stored.file)) {
        media.playback = keep.playback || 'controls'
        media.hasAudio = stored.hasAudio
      }
      emit('update:modelValue', media)
    }

    const send = async (request, kind) => {
      busy.value = true
      progress.value = 0
      error.value = ''
      try {
        const { data } = await request()
        accept(data.media, kind)
      } catch (e) {
        const data = e.response?.data || {}
        error.value = describe(data.error, data.limit, kind)
      } finally {
        busy.value = false
      }
    }

    const upload = (file, kind) => {
      if (uploadLimit && file.size > uploadLimit) {
        error.value = describe('too_large_for_server', null, kind)
        return
      }
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kind)
      return send(() => axios.post(generateUrl('/apps/introvox/admin/media'), body, {
        onUploadProgress: (event) => {
          progress.value = event.total ? Math.round(event.loaded / event.total * 100) : 0
        }
      }), kind)
    }

    const chooseUpload = (kind) => {
      pendingKind.value = kind
      fileInputRef.value.value = ''
      fileInputRef.value.click()
    }

    const onFileChosen = (event) => {
      const file = event.target.files?.[0]
      if (file) {
        upload(file, pendingKind.value)
      }
    }

    const chooseFromFiles = async () => {
      let path
      try {
        path = await getFilePickerBuilder(t('introvox', 'Choose an image or video'))
          .setMultiSelect(false)
          .setMimeTypeFilter(['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm'])
          // TRANSLATORS: Button (verb) in a file picker: picks the selected file
          .addButton({ label: t('introvox', 'Choose'), variant: 'primary', callback: () => {} })
          .build()
          .pick()
      } catch (e) {
        // Closed without choosing
        return
      }
      if (typeof path === 'string' && path !== '') {
        send(() => axios.post(generateUrl('/apps/introvox/admin/media/from-files'), { path, kind: 'media' }), 'media')
      }
    }

    // A screenshot pasted onto the block
    const onPaste = (event) => {
      const file = [...(event.clipboardData?.files || [])].find(item => /^image\/(png|jpeg|gif)$/.test(item.type))
      if (file) {
        event.preventDefault()
        upload(file, 'media')
      }
    }

    return {
      TEXT,
      t,
      rootRef,
      fileInputRef,
      pendingKind,
      busy,
      progress,
      error,
      video,
      altMissing,
      mediaUrl,
      megabytes,
      uploadLimit,
      update,
      chooseUpload,
      onFileChosen,
      chooseFromFiles,
      onPaste
    }
  }
}
</script>

<style scoped>
.step-media {
  display: flex;
  flex-direction: column;
  gap: 8px;
  outline: none;
}

.step-media:focus-visible {
  outline: 2px solid var(--color-main-text);
  outline-offset: 2px;
}

.step-media__empty,
.step-media__actions,
.step-media__captions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.step-media__filled {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.step-media__preview {
  flex: 0 1 220px;
}

.step-media__preview img,
.step-media__preview video {
  display: block;
  max-width: 100%;
  height: auto;
  max-height: 200px;
  border-radius: var(--border-radius-large);
  object-fit: contain;
  background: var(--color-background-dark);
}

.step-media__fields {
  display: flex;
  flex: 1 1 260px;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.step-media__hint {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}
</style>
