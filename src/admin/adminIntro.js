import Shepherd from 'shepherd.js'
import { translate } from '@nextcloud/l10n'
import 'shepherd.js/dist/css/shepherd.css'
import '../../css/wizard.css'

import { escapeHtml, sanitizeStepHtml } from '../utils/stepHtml.js'
import { centerScroll } from '../utils/motion.js'

// The admin guide in the repository, as in appinfo/info.xml
const MANUAL_URL = 'https://github.com/nextcloud/IntroVox/blob/main/docs/admin/guide.md'

// Every string here becomes HTML in a Shepherd step, so placeholder values
// stay escaped (the library default); only the manual link, markup built
// below, opts out for its own value. No sanitizing here: its defaults would
// drop target from the link. Texts go through sanitizeStepHtml below, like
// any step text, and titles and button labels are escaped.
const t = (app, key, vars = {}) => translate(app, key, vars, undefined, { sanitize: false })

/**
 * A short tour of IntroVox's own admin page, shown once to every admin and
 * again from the Support pane. It uses the tour users get (Shepherd, with
 * css/wizard.css), so it shows what IntroVox makes while explaining it.
 *
 * @param {object} options How the tour reaches the page
 * @param {Function} options.showPane Opens a pane ('settings', 'steps', ...)
 *   and resolves once it is on screen
 * @param {Function} options.onEnd Called once when the tour is closed, done
 *   or skipped
 * @return {object} The running Shepherd tour
 */
export function startAdminIntro({ showPane, onEnd }) {
  // Translations are text from Transifex: cleaned like any step text
  const html = (text) => sanitizeStepHtml(text)

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    exitOnEsc: true,
    defaultStepOptions: {
      classes: 'nextcloud-wizard-step',
      scrollTo: centerScroll(),
      // TRANSLATORS: Invisible label of the X button that closes a tour step or a preview
      cancelIcon: { enabled: true, label: t('introvox', 'Close') },
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 12
    }
  })

  const back = { text: escapeHtml(t('introvox', 'Back')), action: () => tour.back(), secondary: true }
  const next = { text: escapeHtml(t('introvox', 'Next')), action: () => tour.next() }
  // tour: open that tour in the step editor; '' for the list of tours
  const on = (pane, element, position = 'bottom', tour = undefined) => ({
    attachTo: { element, on: position },
    beforeShowPromise: () => showPane(pane, tour)
  })

  tour.addStep({
    id: 'welcome',
    // TRANSLATORS: Title of the first step of the tour of the administration page. "IntroVox" is the app name
    title: escapeHtml(t('introvox', 'Welcome to IntroVox')),
    text: html(t('introvox', '<p>IntroVox gives newcomers a short tour of Nextcloud, like this one. In a minute you know how to make your own.</p>')),
    buttons: [
      // TRANSLATORS: Button (verb): ends the tour now
      { text: escapeHtml(t('introvox', 'Skip')), action: () => tour.cancel(), secondary: true },
      // TRANSLATORS: Button: starts the tour of the administration page
      { text: escapeHtml(t('introvox', 'Show me')), action: () => tour.next() }
    ]
  })

  tour.addStep({
    id: 'panes',
    ...on('settings', '.introvox-admin__panes'),
    // TRANSLATORS: Title of a tour step about the four tabs of the administration page
    title: escapeHtml(t('introvox', 'Four parts')),
    // TRANSLATORS: Text of a step in the tour of the IntroVox administration page. Words in bold are names of tabs and buttons on that page: use the same translation
    text: html(t('introvox', '<p><strong>Settings</strong> switches tours on for everyone, <strong>Tours</strong> is where you write them, <strong>Statistics</strong> shows how many people start and finish the welcome tour, and <strong>Support</strong> is where to find help.</p>')),
    buttons: [back, next]
  })

  tour.addStep({
    id: 'tours',
    ...on('steps', '.introvox-tours', 'bottom', ''),
    title: escapeHtml(t('introvox', 'Tours')),
    // TRANSLATORS: Text of a step in the tour of the IntroVox administration page. Words in bold are names of tabs and buttons on that page: use the same translation
    text: html(t('introvox', '<p>The <strong>welcome tour</strong> shows Nextcloud to newcomers. Add a <strong>New tour</strong> for an app, such as Talk: it starts the first time someone opens that app.</p>')),
    buttons: [back, next]
  })

  tour.addStep({
    id: 'languages',
    ...on('steps', '.language-selector-row', 'bottom', 'welcome'),
    // TRANSLATORS: Title of a tour step about languages
    title: escapeHtml(t('introvox', 'One tour, every language')),
    text: html(t('introvox', '<p>Everyone gets the tour in their own language: the built-in steps are translated. To write your own text for a language, add a language override and edit its steps.</p>')),
    buttons: [back, next]
  })

  tour.addStep({
    id: 'how-to',
    ...on('steps', '.introvox-admin__add', 'bottom', 'welcome'),
    title: escapeHtml(t('introvox', 'A step in four moves')),
    // TRANSLATORS: Text of a step in the tour of the IntroVox administration page. Words in bold are names of tabs and buttons on that page: use the same translation
    text: html(t('introvox', '<ol><li><strong>Add step</strong>, and give it a title and a text.</li><li><strong>Pick element</strong>: click what the step should point at, anywhere in Nextcloud.</li><li><strong>Test this step</strong> to see it as others will.</li><li><strong>Save</strong>. It is live straight away.</li></ol>')),
    buttons: [back, next]
  })

  tour.addStep({
    id: 'preview',
    ...on('steps', '.introvox-admin__preview', 'bottom', 'welcome'),
    title: escapeHtml(t('introvox', 'See it as others do')),
    // TRANSLATORS: Text of a step in the tour of the IntroVox administration page. Words in bold are names of tabs and buttons on that page: use the same translation
    text: html(t('introvox', '<p><strong>Preview tour</strong> runs the whole tour as people get it, as a member of a group if you like. A preview is not counted in the statistics.</p>')),
    buttons: [back, next]
  })

  tour.addStep({
    id: 'switch',
    ...on('settings', '.introvox-admin__enable'),
    // TRANSLATORS: Title of a tour step about the main switch that turns tours on for everyone
    title: escapeHtml(t('introvox', 'On for everyone')),
    // TRANSLATORS: Text of a step in the tour of the IntroVox administration page. Words in bold are names of tabs and buttons on that page: use the same translation
    text: html(t('introvox', '<p>While this is on, tours start by themselves: the welcome tour for everyone who is new, and a tour for an app when someone first opens it. <strong>Show again to everyone</strong>, in the menu of a tour under <strong>Tours</strong>, shows it once more, for instance after a big change.</p>')),
    buttons: [back, next]
  })

  // TRANSLATORS: Link text inside a sentence: "… is in the IntroVox manual."
  const manual = `<a href="${MANUAL_URL}" target="_blank">${escapeHtml(t('introvox', 'the IntroVox manual'))}</a>`
  tour.addStep({
    id: 'done',
    // TRANSLATORS: Title of the last step of the tour of the administration page
    title: escapeHtml(t('introvox', 'That is all')),
    // TRANSLATORS: {manual} is a link with the text "the IntroVox manual". "Support" is the name of a tab on this page: use the same translation
    text: html(t('introvox', '<p>More, such as tours across apps and steps that continue on a click, is in {manual}. This tour is under <strong>Support</strong> if you want to see it again.</p>', { manual: { value: manual, escape: false } })),
    // TRANSLATORS: Button: ends the tour
    buttons: [back, { text: escapeHtml(t('introvox', 'Done')), action: () => tour.complete() }]
  })

  let ended = false
  const end = () => {
    if (!ended) {
      ended = true
      onEnd()
    }
  }
  tour.on('complete', end)
  tour.on('cancel', end)

  tour.start()
  return tour
}
