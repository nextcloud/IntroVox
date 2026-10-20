<template>
  <!-- The tour is Shepherd's overlay: nothing of its own to render -->
  <div class="wizard-manager" />
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import Shepherd from 'shepherd.js'
import { translate as t } from '@nextcloud/l10n'
import { getWizardSteps, loadCustomSteps, enrichSteps, closeOpenedMenu, findTarget, followDialogs, holdMenuOpen, holdUntilFilled, showPointer, waitForElement, whenTargetAppears, whenTargetGone } from './wizardSteps'
import { waitForAppReady, waitForNextcloudReady } from './pageReady.js'
import { markTourEnded as markEnded, resumeStore } from './tourResume.js'
import { finishWelcome, isWelcomeDone, markWelcomeSeen, resetWelcome, skipWelcome, trackWelcomeStart } from './welcomeState.js'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { isOnPage, normalizePage, stepPageFor } from '../utils/pages.mjs'
import { escapeHtml, sanitizeStepHtml } from '../utils/stepHtml.js'
import { buildStepMedia } from '../utils/stepMedia.js'
import { centerScroll } from '../utils/motion.js'
import { isStepEnabled } from '../utils/steps.mjs'
import { PREVIEW_RESUME_KEY, RESUME_KEY } from '../runtime/chooseTour.mjs'

export default {
  name: 'WizardManager',
  props: {
    // Inside the admin's tour preview (src/preview): never start on its own,
    // and leave no trace — no telemetry, no completion, no localStorage.
    preview: {
      type: Boolean,
      default: false
    },
    // What the bootstrap decided (src/runtime/chooseTour.mjs): { resume } to
    // carry on, { check: true } to ask the server first, or a plain choice
    // to start. Null when mounted only to be started by hand.
    start: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    let tour = null
    // The preview frame shares sessionStorage with the admin page; its own
    // key keeps a preview from resuming the admin's real tour or vice versa.
    const progress = resumeStore(props.preview ? PREVIEW_RESUME_KEY : RESUME_KEY)
    // Steps whose page could not be opened (the app is not enabled for this
    // user, say) are skipped instead of retried forever.
    let failedSteps = new Set()
    let movingForward = true
    // Where this run of the tour began; carried along when it changes page.
    let startPage = ''
    // Set by a click-to-continue step (armClickAdvance), so that a click
    // that leaves the page carries the tour over to the next step.
    let pendingStepId = null
    let clickAdvancedAt = 0
    // Whether this run counts for "how far do people get" in the
    // statistics: only a run that started by itself, never a preview or a
    // start by hand. Carried along when the tour changes page.
    let counting = false
    let reachedIndex = 0

    const readResume = () => progress.read()
    const writeResume = (entry) => progress.write({ ...entry, tourId, counting })
    const clearResume = () => progress.clear()
    // A preview leaves no trace
    const markTourEnded = () => {
      if (!props.preview) {
        markEnded()
      }
    }

    // The welcome tour, or a tour that starts in an app or on a page
    // (src/runtime/chooseTour.mjs). An app tour keeps none of the welcome
    // tour's habits: no mark in localStorage, no personal setting, no
    // /api/wizard/* counters, no bundled steps to fall back on. It reports to
    // its own route, which also says whether this start is the first.
    const tourId = props.start?.tour || 'welcome'
    const isAppTour = !props.preview && tourId !== 'welcome'
    const tourEvent = (event) => axios.post(generateUrl('/apps/introvox/api/tours/{id}/event', { id: tourId }), { event })
    const finish = (serverVersion) => (isAppTour ? tourEvent('complete').catch(() => {}) : finishWelcome(serverVersion))
    const skip = (serverVersion) => (isAppTour ? tourEvent('skip').catch(() => {}) : skipWelcome(serverVersion))

    // A step further than this run got before; the server keeps the
    // furthest per user, for the welcome tour too
    const reportReached = (step) => {
      const index = tour.steps.indexOf(step) + 1
      if (!counting || index <= reachedIndex) {
        return
      }
      reachedIndex = index
      axios.post(generateUrl('/apps/introvox/api/tours/{id}/reached', { id: tourId }), { step: step.id, index }).catch(() => {})
    }

    // Steps switched off, and steps whose showOn() guard says they don't
    // apply on this instance, are left out
    const isShown = (step) => isStepEnabled(step) && (typeof step.showOn !== 'function' || step.showOn())

    const initTour = async () => {
      if (isAppTour) {
        // Its steps or nothing: a tour that is off, gone or not for this
        // user (a 404), or has no steps, simply does not start
        let data = null
        try {
          ({ data } = await axios.get(generateUrl('/apps/introvox/api/steps'), { params: { tour: tourId } }))
        } catch (error) {
          return false
        }
        const steps = Array.isArray(data?.steps) ? data.steps.filter(isShown) : []
        if (!data?.success || steps.length === 0) {
          return false
        }
        buildTour(steps, null)
        return true
      }

      // Try to load custom steps from admin settings
      const response = await loadCustomSteps()

      // Check if wizard is globally disabled
      if (response && response.enabled === false) {
        return false
      }

      const serverVersion = response ? response.version : '1'
      const customSteps = response ? response.steps : null
      // Server steps carry copy/order but not function-valued behavior (lazy
      // attachTo, beforeShowPromise, when, …). Re-attach those by id; fall back
      // to the bundled steps only when the server could not be asked. None
      // left for this user: no tour.
      const stepsToUse = (customSteps ? enrichSteps(customSteps) : getWizardSteps()).filter(isShown)
      if (stepsToUse.length === 0) {
        return false
      }

      buildTour(stepsToUse, serverVersion)
      return serverVersion
    }

    const buildTour = (stepsToUse, serverVersion) => {
      tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'nextcloud-wizard-step',
          scrollTo: centerScroll(),
          cancelIcon: {
            enabled: true,
            label: t('introvox', 'Close')
          },
          modalOverlayOpeningPadding: 12,
          modalOverlayOpeningRadius: 16
        }
      })

      // Add all steps
      stepsToUse.forEach((step, index) => {
        // Normalize attachTo for custom steps (might be string instead of object)
        let attachTo = null
        if (step.attachTo) {
          if (typeof step.attachTo === 'string') {
            // Custom step format: simple string selector
            attachTo = {
              element: step.attachTo,
              on: step.position || 'right'
            }
          } else if (step.attachTo.element) {
            // Default step format: object with element (string or function) + on
            attachTo = step.attachTo
          }
        }

        // Resolve the target lazily at show-time instead of once at build-time.
        // NC 34 hides several targets behind menus that only render after a
        // beforeShowPromise opens them, so an eager querySelector here would
        // wrongly null them out. A function that returns undefined makes
        // Shepherd center the step automatically.
        if (attachTo) {
          const selector = attachTo.element
          attachTo = {
            element: typeof selector === 'function'
              ? selector
              // Invalid selectors and links to other sites resolve to
              // undefined, which centers the step instead of breaking it
              : () => findTarget(selector),
            on: attachTo.on
          }
        }

        // Generate buttons dynamically based on position
        const isFirstStep = index === 0
        const isLastStep = index === stepsToUse.length - 1

        let buttons = []

        if (isFirstStep && isLastStep) {
          // A one-step tour (or a single step in the preview): nothing to
          // skip to or start, just close it.
          buttons = [
            {
              text: t('introvox', 'Done'),
              action: 'markCompleted'
            }
          ]
        } else if (isFirstStep) {
          // First step: Skip button + Next/Start button
          buttons = [
            {
              text: step.buttons?.[0]?.text || (isAppTour ? t('introvox', 'Skip') : t('introvox', 'Skip and don\'t show again')),
              action: 'skipWizard',
              secondary: true
            },
            {
              // TRANSLATORS: Button on the first step: starts the tour
              text: step.buttons?.[1]?.text || t('introvox', 'Start tour'),
              action: tour.next
            }
          ]
        } else if (isLastStep) {
          // Last step: Back button + Complete button
          buttons = [
            {
              text: t('introvox', 'Back'),
              action: tour.back,
              secondary: true
            },
            {
              text: step.buttons?.[1]?.text || t('introvox', 'Done'),
              action: 'markCompleted'
            }
          ]
        } else {
          // Middle steps: Back button + Next button
          buttons = [
            {
              text: t('introvox', 'Back'),
              action: tour.back,
              secondary: true
            },
            {
              text: t('introvox', 'Next'),
              action: tour.next
            }
          ]
        }

        // Use custom buttons if explicitly provided (unless it's position-dependent)
        if (step.buttons && !isFirstStep && !isLastStep) {
          buttons = step.buttons
        }

        // "Continue with: click on the element": the user does what the step
        // asks instead of pressing Next. The forward button stays as a way
        // out, hidden while the element is there, shown when it isn't.
        const interactive = step.advance === 'click'
        // "Continue with: Filling in the field": Next waits until the field
        // the step points at has text
        const needsInput = step.advance === 'input'
        if (interactive || needsInput) {
          buttons = buttons.map(btn => (btn.secondary ? btn : { ...btn, classes: 'introvox-advance-button' }))
        }

        // A step on another page first navigates there. The new page resumes
        // the tour at this step (resumeTour); there it waits for the target,
        // which apps like Talk only render after loading.
        const pageOptions = {}
        const stepPage = normalizePage(step.page)
        if (stepPage) {
          const ownBeforeShow = step.beforeShowPromise
          const ownShowOn = step.showOn
          const waitFor = typeof step.attachTo === 'string' ? step.attachTo : ''
          pageOptions.beforeShowPromise = function() {
            if (!isOnPage(stepPage, window.location.pathname)) {
              // Belt and braces next to normalizePage(): the tour never takes
              // anyone off this Nextcloud; the step then shows where it is.
              const target = new URL(generateUrl(stepPage), window.location.href)
              if (target.origin !== window.location.origin) {
                return Promise.resolve()
              }
              writeResume({ stepId: step.id, forward: movingForward, failed: [...failedSteps], startPage })
              window.location.href = target.href
              // Never settles: this page unloads and the next one takes over
              return new Promise(() => {})
            }
            return Promise.resolve(ownBeforeShow ? ownBeforeShow.call(this) : undefined)
              .then(() => (waitFor ? waitForElement(waitFor) : undefined))
          }
          pageOptions.showOn = () => !failedSteps.has(step.id) && (typeof ownShowOn !== 'function' || ownShowOn())
        }

        // Centering can no longer be decided at build-time because attachTo is
        // resolved lazily. Add/remove .shepherd-centered in a show hook based on
        // whether the target actually resolved, and preserve any when handlers
        // the step already defines (e.g. the apps-menu cleanup).
        const stepWhen = { ...(step.when || {}) }
        const userShow = stepWhen.show
        const userHide = stepWhen.hide
        // The step's image or video (utils/stepMedia.js), built once
        const media = buildStepMedia(step.media)
        let disarmClick = null
        let releaseMenu = null
        let stopWaiting = null
        let removePointer = null
        let stopHolding = null
        let stopGone = null
        const release = () => {
          stopGone?.()
          stopGone = null
          removePointer?.()
          removePointer = null
          stopHolding?.()
          stopHolding = null
          disarmClick?.()
          disarmClick = null
          releaseMenu?.()
          releaseMenu = null
          stopWaiting?.()
          stopWaiting = null
          document.body.classList.remove('introvox-step-waiting')
          media?.hide()
        }
        stepWhen.show = function() {
          const el = this.getElement && this.getElement()
          const target = this.getTarget && this.getTarget()
          if (target) {
            releaseMenu = holdMenuOpen(target, step.openFirst)
          }
          // Shepherd focuses the step 300 ms after every reposition. In the
          // admin's preview that pulled focus out of the admin page, closing
          // the "Preview as" dropdown the moment it opened. There the step
          // only takes focus when the frame has it already.
          if (props.preview && el) {
            el.focus = (options) => {
              if (document.hasFocus()) {
                HTMLElement.prototype.focus.call(el, options)
              }
            }
          }
          // A step with an element that is not there yet waits for it
          // (below); one without an element is centered on purpose
          const waiting = !!attachTo && !target
          if (el) {
            el.classList.toggle('shepherd-centered', !target)
            if (interactive) {
              el.querySelectorAll('.introvox-advance-button').forEach(button => {
                button.style.display = target ? 'none' : ''
              })
            }
            if (interactive || needsInput) {
              el.querySelector('.introvox-click-hint')?.toggleAttribute('hidden', !target)
            }
            if (needsInput && target) {
              stopHolding = holdUntilFilled(target, el.querySelectorAll('.introvox-advance-button'))
            }
          }
          if (interactive && target) {
            disarmClick = armClickAdvance(attachTo.element, index, stepsToUse, serverVersion)
            // Gone without the click (its dialog closed with its ✕ or
            // Escape): shown again, the step waits aside with Next instead
            // of leaving only Back. The click itself takes it away too.
            const shownId = this.id
            stopGone = whenTargetGone(target, () => {
              if (Date.now() - clickAdvancedAt > 1000) {
                tour.show(shownId)
              }
            })
          }
          if (target && el) {
            removePointer = showPointer(target, el)
          }
          // Not there yet: what makes it appear is up to the user (the
          // conversation they create, the file whose details they open). The
          // step waits aside with its text, the page usable (css/wizard.css),
          // and moves to the element once it is there, however long that takes.
          // While a dialog is open (a folder to pick), it waits on the other
          // side, clear of the dialog's buttons.
          if (waiting) {
            const stepId = this.id
            document.body.classList.add('introvox-step-waiting')
            const stopLooking = whenTargetAppears(attachTo.element, () => tour.show(stepId))
            const stopFollowing = followDialogs()
            stopWaiting = () => {
              stopLooking()
              stopFollowing()
            }
          }
          media?.show()
          if (typeof userShow === 'function') {
            userShow.call(this)
          }
        }
        stepWhen.hide = function() {
          release()
          if (typeof userHide === 'function') {
            userHide.call(this)
          }
        }
        // Completing or cancelling the tour destroys steps without hiding them
        stepWhen.destroy = release

        // Shepherd sets title, text and button labels with innerHTML. Titles and
        // labels are plain text; the text keeps only simple formatting, as it
        // may come from an imported file or a translation (utils/stepHtml.js).
        const hintText = interactive
          ? t('introvox', 'Click the highlighted element to continue.')
          : needsInput ? t('introvox', 'Fill in the highlighted field to continue.') : ''
        const hint = hintText ? '<p class="introvox-click-hint">' + escapeHtml(hintText) + '</p>' : ''
        const textHtml = sanitizeStepHtml(step.text) + hint
        // With media, Shepherd gets an element: the media above the text. It
        // may ask again on an update, so it gets the same element each time.
        let content = null
        const text = media
          ? () => {
              if (!content) {
                content = document.createElement('div')
                content.appendChild(media.element)
                const body = document.createElement('div')
                body.className = 'introvox-step-body'
                body.innerHTML = textHtml
                content.appendChild(body)
              }
              return content
            }
          : textHtml

        tour.addStep({
          ...step,
          ...pageOptions,
          ...(interactive ? { canClickTarget: true } : {}),
          title: escapeHtml(step.title),
          text,
          attachTo: attachTo,
          classes: step.media?.size === 'wide' ? 'nextcloud-wizard-step introvox-step--wide' : 'nextcloud-wizard-step',
          when: stepWhen,
          buttons: buttons.map(btn => ({
            ...btn,
            text: escapeHtml(btn.text),
            action: btn.action === 'markCompleted'
              ? () => {
                  const saved = props.preview ? Promise.resolve() : finish(serverVersion)
                  tour.complete()
                  // An app tour ends in its own app
                  if (!isAppTour) {
                    returnHomeAfter(saved)
                  }
                }
              : btn.action === 'skipWizard'
              ? () => {
                  if (!props.preview) {
                    skip(serverVersion)
                  }
                  tour.complete()
                }
              : btn.action
          }))
        })
      })

      // Setup event listeners
      // Shepherd's own skip of a hidden step goes the same way, so a step on
      // an unreachable page is skipped forwards on Next and backwards on Back.
      tour.on('show', ({ step, previous }) => {
        movingForward = !previous || tour.steps.indexOf(step) >= tour.steps.indexOf(previous)
        reportReached(step)
      })

      tour.on('complete', () => {
        clearResume()
        markTourEnded()
        // Don't auto-disable here, it's handled by the specific button actions
        // Safety net: close any header menu a step opened but didn't clean up.
        closeOpenedMenu()
      })

      tour.on('cancel', () => {
        clearResume()
        markTourEnded()
        // Just mark as completed in localStorage without disabling the wizard.
        // An app tour was marked seen when it started.
        if (!props.preview && !isAppTour) {
          markWelcomeSeen(serverVersion)
        }
        // Safety net: close any header menu a step opened but didn't clean up.
        closeOpenedMenu()
      })
    }

    /**
     * Go to the next step once the user clicks the step's element. The click
     * is checked on the document against the element as it is at that
     * moment, since apps re-render their buttons.
     *
     * @param {Function} resolveTarget Returns the step's element
     * @param {number} index The step's index
     * @param {Array<object>} stepsToUse All steps of the tour
     * @param {string|null} serverVersion For marking the tour completed
     * @return {Function} Removes the listener again
     */
    const armClickAdvance = (resolveTarget, index, stepsToUse, serverVersion) => {
      const onClick = (event) => {
        const target = resolveTarget()
        if (!target || !target.contains(event.target)) {
          return
        }
        disarm()
        if (index === stepsToUse.length - 1) {
          // The click finishes the tour. No return to the homepage: the
          // click itself leads where the admin wanted the tour to end.
          if (!props.preview) {
            finish(serverVersion)
          }
          tour.complete()
          return
        }
        // Let the click do its work first (open a menu, a dialog, another
        // app). If it leaves the page, onPageHide takes the tour along.
        pendingStepId = stepsToUse[index + 1].id
        clickAdvancedAt = Date.now()
        setTimeout(() => {
          if (tour.isActive() && tour.getCurrentStep()?.id === stepsToUse[index].id) {
            pendingStepId = null
            tour.next()
          }
        }, 300)
      }
      const disarm = () => document.removeEventListener('click', onClick, true)
      document.addEventListener('click', onClick, true)
      return disarm
    }

    // Leaving the page shortly after a click-to-continue: the click opened
    // another app. Pick the tour up there, at the step after the click.
    // → goes to the next step (Shepherd's keyboardNavigation), but not past
    // a step that waits for a click or for its field, just as its Next
    // button does not: hidden or switched off. Caught before Shepherd's own
    // handler on the step.
    const guardArrowNext = (event) => {
      if (event.key !== 'ArrowRight') {
        return
      }
      const step = event.target instanceof Element ? event.target.closest('.shepherd-element') : null
      const next = step?.querySelector('.introvox-advance-button')
      if (next && (next.disabled || next.style.display === 'none')) {
        event.stopImmediatePropagation()
      }
    }

    const onPageHide = () => {
      if (tour && tour.isActive() && Date.now() - clickAdvancedAt < 5000) {
        writeResume({
          stepId: pendingStepId || tour.getCurrentStep()?.id,
          forward: true,
          failed: [...failedSteps],
          startPage
        })
      }
    }

    // A tour that went to other apps ends on the configured homepage (the
    // default app, where / redirects), not in the last app it visited. Only
    // once the completion is recorded: leaving the page cancels requests.
    const returnHomeAfter = (saved) => {
      if (startPage && !isOnPage(startPage, window.location.pathname)) {
        saved.finally(() => {
          window.location.href = generateUrl('/')
        })
      }
    }

    /**
     * Start the tour, at a given step when resuming after a navigation.
     * Shepherd can only start at the beginning: start() shows whatever next()
     * picks, so next() is pointed at the step to resume, once.
     *
     * @param {string|null} stepId Step to start at, null for the first
     * @param {boolean} forward Direction, for skipping steps that can't show
     */
    const startAt = (stepId, forward = true) => {
      const index = stepId ? tour.steps.findIndex(step => step.id === stepId) : -1
      if (index > 0) {
        tour.next = function() {
          delete tour.next
          this.show(index, forward)
        }
      }
      tour.start()
    }

    // The step we navigated for belongs to a page we did not end up on: the
    // app redirected away, typically because this user can't use it.
    const markUnreachable = (resume, steps) => {
      const step = steps.find(s => s.id === resume.stepId)
      if (step && !isOnPage(step.page, window.location.pathname)) {
        failedSteps.add(step.id)
      }
    }

    /**
     * Continue a tour that navigated to another page for its next step.
     *
     * @param {object} resume What the previous page stored (writeResume)
     */
    const resumeTour = async (resume) => {
      clearResume()
      failedSteps = new Set(resume.failed || [])
      startPage = resume.startPage || ''
      counting = resume.counting === true
      reachedIndex = 0
      if (await initTour() === false || !tour || !tour.getById(resume.stepId)) {
        return
      }
      markUnreachable(resume, tour.steps.map(step => step.options))
      await waitForNextcloudReady()
      startAt(resume.stepId, resume.forward !== false)
    }

    /**
     * Run the tour with steps handed over by the admin page, exactly as users
     * would get them, or a single step by id (shown even while disabled).
     *
     * @param {Array<object>} steps Steps in the stored (JSON) shape
     * @param {object} options Options
     * @param {string|null} options.stepId Show only this step
     * @param {boolean} options.fresh Start over rather than resume after the
     *   preview navigated to another page for a step
     * @return {Promise<number>} How many steps are shown
     */
    const runPreview = async (steps, { stepId = null, fresh = true } = {}) => {
      const resume = fresh ? null : readResume()
      clearResume()
      counting = false
      failedSteps = new Set(resume?.failed || [])
      startPage = resume ? (resume.startPage || '') : stepPageFor(window.location.pathname)
      if (tour && tour.isActive()) {
        tour.cancel()
      }
      const enriched = enrichSteps(steps)
      const stepsToUse = stepId ? enriched.filter(step => step.id === stepId) : enriched.filter(isShown)
      if (stepsToUse.length === 0) {
        return 0
      }
      await waitForNextcloudReady()
      buildTour(stepsToUse, null)
      if (resume) {
        markUnreachable(resume, stepsToUse)
      }
      startAt(resume ? resume.stepId : null, resume ? resume.forward !== false : true)
      return stepsToUse.length
    }

    /**
     * @param {object} options Options
     * @param {boolean} options.manual Started by hand (window.introVox.start)
     */
    const startTour = async ({ manual = false } = {}) => {
      clearResume()
      failedSteps = new Set()
      startPage = stepPageFor(window.location.pathname)
      reachedIndex = 0
      // Started by itself: the bootstrap chose it, and not as a start by hand
      const automatic = !props.preview && !!props.start && !props.start.manual && !manual
      if (!tour) {
        await initTour()
      }
      if (!tour) {
        return
      }
      if (isAppTour) {
        await waitForAppReady(tour.steps[0]?.options)
        // Starting counts as seen. Another tab or device may have started it
        // a moment ago; then it shows there, not here, unless started by hand.
        let first = false
        try {
          first = (await tourEvent('start')).data?.first === true
        } catch (error) {
          return
        }
        counting = automatic && first
        if (first || props.start?.manual) {
          tour.start()
        }
        return
      }
      counting = automatic
      // Track wizard start
      await trackWelcomeStart()
      tour.start()
    }

    onMounted(() => {
      window.addEventListener('pagehide', onPageHide)
      window.addEventListener('keydown', guardArrowNext, true)

      if (props.preview) {
        window.introVoxPreview = {
          run: runPreview,
          hasPendingResume: () => readResume() !== null
        }
        return
      }

      // Expose to window for manual control
      window.introVox = {
        start: () => startTour({ manual: true }),
        reset: resetWelcome,
        isCompleted: isWelcomeDone
      }

      // The bootstrap decided (src/runtime/chooseTour.mjs). Mounted without a
      // choice, the tour waits to be started by hand.
      if (!props.start) {
        return
      }

      // Mid-tour, on the page a step navigated to: carry on
      if (props.start.resume) {
        resumeTour(props.start.resume)
        return
      }

      if (!props.start.check) {
        waitForNextcloudReady().then(() => {
          setTimeout(() => startTour(), 1000)
        })
        return
      }

      // The page carried no runtime state: ask the server, as before
      Promise.all([
        loadCustomSteps(),
        axios.get(generateUrl('/apps/introvox/personal/settings')).catch((error) => {
          // If the app is not enabled for this user (e.g. group limitation), treat as disabled
          if (error?.response?.status === 412 || error?.response?.status === 403) {
            return { data: { wizardDisabledByUser: true } }
          }
          return { data: { wizardDisabledByUser: false } }
        })
      ]).then(([stepsResponse, personalResponse]) => {
        const serverVersion = stepsResponse ? stepsResponse.version : '1'
        const userDisabledWizard = personalResponse?.data?.wizardDisabledByUser || false

        // Auto-start wizard for new users or when version changed
        if (!isWelcomeDone(serverVersion, userDisabledWizard)) {
          if (!stepsResponse || stepsResponse.enabled === false) {
            return
          }

          waitForNextcloudReady().then(async () => {
            setTimeout(async () => {
              await startTour()
            }, 1000)
          })
        }
      })
    })

    onUnmounted(() => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('keydown', guardArrowNext, true)
      if (tour) {
        tour.complete()
      }
    })

    return {
      startTour,
      reset: resetWelcome,
      isCompleted: isWelcomeDone
    }
  }
}
</script>

