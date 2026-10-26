<template>
  <NcSettingsSection
    class="introvox-tours"
    :name="t('introvox', 'Tours')"
    :description="t('introvox', 'The welcome tour shows Nextcloud to newcomers. A tour for an app starts the first time someone opens that app.')">
    <div class="introvox-tours__actions">
      <NcButton class="introvox-tours__new" variant="primary" @click="$emit('create')">
        <template #icon>
          <Plus :size="20" />
        </template>
        {{ t('introvox', 'New tour') }}
      </NcButton>
      <!-- TRANSLATORS: Invisible label of a menu button with two ways to import a tour -->
      <NcActions class="introvox-tours__import" :menu-name="t('introvox', 'Import tour')">
        <template #icon>
          <TrayArrowUp :size="20" />
        </template>
        <NcActionButton close-after-click @click="$refs.packageInput.click()">
          <template #icon>
            <Upload :size="20" />
          </template>
          {{ t('introvox', 'Upload a file') }} <!-- TRANSLATORS: Menu entry and checklist task: upload a file from your computer -->
        </NcActionButton>
        <NcActionButton close-after-click @click="chooseFromFiles">
          <template #icon>
            <FolderOutline :size="20" />
          </template>
          {{ t('introvox', 'Choose from Files') }}
        </NcActionButton>
      </NcActions>
      <input ref="packageInput"
        type="file"
        accept=".zip,application/zip"
        hidden
        @change="onPackageChosen">
    </div>

    <NcNoteCard v-if="!toursEnabled"
      type="warning"
      :text="t('introvox', 'Tours are switched off for everyone. Switch them on under Settings.')" />

    <ul class="introvox-tours__list">
      <li v-for="tour in tours" :key="tour.id" class="introvox-tours__item">
        <span class="introvox-tours__icon" aria-hidden="true">
          <img v-if="tour.app && tour.app.icon" :src="tour.app.icon" alt="">
          <HandWave v-else-if="tour.id === 'welcome'" :size="24" />
          <Earth v-else-if="tour.trigger?.type === 'any'" :size="24" />
          <Web v-else :size="24" />
        </span>
        <div class="introvox-tours__text">
          <span class="introvox-tours__name">
            {{ title(tour) }}
            <!-- TRANSLATORS: Badge next to a tour that comes with IntroVox; keep it short -->
            <span v-if="tour.builtin && tour.id !== 'welcome'" class="introvox-tours__badge">{{ t('introvox', 'Built-in') }}</span>
          </span>
          <span class="introvox-tours__detail">{{ startsWhen(tour) }}</span>
          <span class="introvox-tours__detail">{{ summary(tour) }}</span>
        </div>
        <!-- TRANSLATORS: Invisible label (for screen readers) of a switch; {tour} is the name of a tour, such as "Welcome tour" or "Talk" -->
        <NcCheckboxRadioSwitch :aria-label="t('introvox', 'Switch {tour} on or off', { tour: title(tour) }, undefined, TEXT)"
          type="switch"
          :model-value="tour.enabled"
          @update:model-value="$emit('toggle', tour, $event)" />
        <NcButton @click="$emit('open', tour)">
          <template #icon>
            <Pencil :size="20" />
          </template>
          <!-- TRANSLATORS: Button: opens the steps of a tour -->
          {{ t('introvox', 'Edit steps') }}
        </NcButton>
        <!-- TRANSLATORS: Invisible label of a menu button with more actions; {tour} is the name of a tour, such as "Talk" -->
        <NcActions :aria-label="t('introvox', 'More for {tour}', { tour: title(tour) }, undefined, TEXT)">
          <NcActionButton close-after-click @click="$emit('preview', tour)">
            <template #icon>
              <Play :size="20" />
            </template>
            {{ t('introvox', 'Preview') }} <!-- TRANSLATORS: Menu entry (verb): shows the tour as users get it -->
          </NcActionButton>
          <NcActionButton close-after-click @click="$emit('copy-link', tour)">
            <template #icon>
              <LinkVariant :size="20" />
            </template>
            {{ t('introvox', 'Copy link') }} <!-- TRANSLATORS: Menu entry: copies a link that starts the tour -->
          </NcActionButton>
          <NcActionButton close-after-click @click="$emit('export', tour)">
            <template #icon>
              <TrayArrowDown :size="20" />
            </template>
            {{ t('introvox', 'Export tour') }} <!-- TRANSLATORS: Menu entry: downloads the tour as a file -->
          </NcActionButton>
          <NcActionButton close-after-click @click="$emit('reshow', tour)">
            <template #icon>
              <Replay :size="20" />
            </template>
            {{ t('introvox', 'Show again to everyone') }} <!-- TRANSLATORS: Menu entry and dialog title: everyone who saw the tour gets it once more -->
          </NcActionButton>
          <NcActionButton v-if="!tour.builtin" close-after-click @click="$emit('remove', tour)">
            <template #icon>
              <TrashCanOutline :size="20" />
            </template>
            {{ t('introvox', 'Delete') }}
          </NcActionButton>
        </NcActions>
      </li>
    </ul>
  </NcSettingsSection>
</template>

<script>
import { getCanonicalLocale, translate as t, translatePlural as n } from '@nextcloud/l10n'
import { TEXT } from '../utils/l10n.mjs'
import { getFilePickerBuilder } from '@nextcloud/dialogs'
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActions from '@nextcloud/vue/components/NcActions'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcNoteCard from '@nextcloud/vue/components/NcNoteCard'
import NcSettingsSection from '@nextcloud/vue/components/NcSettingsSection'

import Earth from 'vue-material-design-icons/Earth.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import HandWave from 'vue-material-design-icons/HandWave.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Play from 'vue-material-design-icons/Play.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Replay from 'vue-material-design-icons/Replay.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import TrayArrowDown from 'vue-material-design-icons/TrayArrowDown.vue'
import TrayArrowUp from 'vue-material-design-icons/TrayArrowUp.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import Web from 'vue-material-design-icons/Web.vue'

import { isoToDate } from '../utils/dates.mjs'

/**
 * The tours: the welcome tour, and tours that start in an app or on a page
 * (lib/Controller/ToursController.php). Each opens in the step editor.
 */
export default {
  name: 'ToursList',
  components: {
    Earth,
    FolderOutline,
    HandWave,
    LinkVariant,
    NcActionButton,
    NcActions,
    NcButton,
    NcCheckboxRadioSwitch,
    NcNoteCard,
    NcSettingsSection,
    Pencil,
    Play,
    Plus,
    Replay,
    TrashCanOutline,
    TrayArrowDown,
    TrayArrowUp,
    Upload,
    Web
  },
  props: {
    tours: {
      type: Array,
      default: () => []
    },
    // Tours for everyone, the main switch under Settings
    toursEnabled: {
      type: Boolean,
      default: true
    }
  },
  emits: ['open', 'create', 'toggle', 'reshow', 'remove', 'preview', 'copy-link', 'export', 'import'],
  setup(props, { emit }) {
    const title = (tour) => (tour.id === 'welcome' ? t('introvox', 'Welcome tour') : tour.name)

    const startsWhen = (tour) => {
      if (tour.id === 'welcome') {
        return t('introvox', 'Starts after the first login')
      }
      if (tour.trigger?.type === 'app') {
        // TRANSLATORS: {app} is the name of an app, such as "Talk"
        return t('introvox', 'Starts the first time someone opens {app}', { app: tour.app?.name || tour.trigger.app }, undefined, TEXT)
      }
      if (tour.trigger?.type === 'any') {
        return t('introvox', 'Starts on whichever page someone opens next')
      }
      // TRANSLATORS: {page} is an address of this Nextcloud, such as "/settings/user"
      return t('introvox', 'Starts the first time someone opens {page}', { page: tour.trigger?.page || '' }, undefined, TEXT)
    }

    const summary = (tour) => {
      if (tour.id === 'welcome') {
        return tour.languages?.length
          // TRANSLATORS: %n is the number of languages for which an administrator wrote steps of their own
          ? n('introvox', 'Translated, with its own steps in %n language', 'Translated, with its own steps in %n languages', tour.languages.length)
          // TRANSLATORS: Description of the welcome tour: it has no steps written for a language of its own
          : t('introvox', 'Translated into every language')
      }
      // TRANSLATORS: %n is the number of steps in a tour
      const parts = [n('introvox', '%n step', '%n steps', tour.stepCount || 0)]
      parts.push(tour.visibleToGroups?.length
        // TRANSLATORS: {groups} is a comma-separated list of group names, such as "Sales, Support"
        ? t('introvox', 'For {groups}', { groups: tour.visibleToGroups.join(', ') }, undefined, TEXT)
        // TRANSLATORS: The tour is for everyone, not limited to groups
        : t('introvox', 'For everyone'))
      if (tour.audience === 'new') {
        parts.push(t('introvox', 'New accounts only'))
      }
      if (tour.startAfterDays > 0) {
        // TRANSLATORS: In a tour's summary. %n is a number of days after someone's first login; the tour does not start by itself before then
        parts.push(n('introvox', 'After %n day', 'After %n days', tour.startAfterDays))
      }
      const from = isoToDate(tour.startFrom)
      const until = isoToDate(tour.startUntil)
      if (from || until) {
        const day = (date) => date.toLocaleDateString(getCanonicalLocale(), { dateStyle: 'medium' })
        parts.push(from && until
          // TRANSLATORS: {from} and {until} are dates, such as "Oct 9, 2026"; the period in which a tour starts by itself
          ? t('introvox', '{from} to {until}', { from: day(from), until: day(until) }, undefined, TEXT)
          : (from
            // TRANSLATORS: {date} is a date, such as "Oct 9, 2026": the first day a tour starts by itself
            ? t('introvox', 'From {date}', { date: day(from) }, undefined, TEXT)
            // TRANSLATORS: {date} is a date, such as "Oct 9, 2026": the last day a tour starts by itself
            : t('introvox', 'Until {date}', { date: day(until) }, undefined, TEXT)))
      }
      return parts.join(' · ')
    }

    // A tour package (TourTransfer), uploaded or from the admin's own Files
    const onPackageChosen = (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) {
        emit('import', { file })
      }
    }

    const chooseFromFiles = async () => {
      let path
      try {
        // TRANSLATORS: Title of a file picker for a tour file (.zip)
        path = await getFilePickerBuilder(t('introvox', 'Choose a tour'))
          .setMultiSelect(false)
          .setMimeTypeFilter(['application/zip'])
          .addButton({ label: t('introvox', 'Choose'), variant: 'primary', callback: () => {} })
          .build()
          .pick()
      } catch (e) {
        // Closed without choosing
        return
      }
      if (typeof path === 'string' && path !== '') {
        emit('import', { path })
      }
    }

    return { TEXT, t, title, startsWhen, summary, onPackageChosen, chooseFromFiles }
  }
}
</script>

<style scoped>
.introvox-tours__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.introvox-tours__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.introvox-tours__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-large);
}

.introvox-tours__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-large);
  background: var(--color-primary-element);
  color: var(--color-primary-element-text);
}

.introvox-tours__icon img {
  width: 24px;
  height: 24px;
}

.introvox-tours__text {
  display: flex;
  flex: 1 1 240px;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.introvox-tours__badge {
  margin-inline-start: 8px;
  padding: 0 8px;
  border-radius: var(--border-radius-pill, 16px);
  background: var(--color-primary-light);
  color: var(--color-primary-light-text);
  font-size: var(--font-size-small);
  font-weight: normal;
}

.introvox-tours__name {
  font-weight: var(--font-weight-heading);
}

.introvox-tours__detail {
  font-size: var(--font-size-small);
  color: var(--color-text-maxcontrast);
}
</style>
