// Plays a built-in tour as a user who does what the steps ask: fills in the
// name, clicks what to click, picks the card it made. Shared by
// walk-builtin.mjs and builtin-tours.mjs.

const step = (p) => p.locator('.shepherd-element:visible')
const state = (p) => step(p).evaluate(el => ({
  title: el.querySelector('.shepherd-title')?.textContent.trim(),
  centered: el.classList.contains('shepherd-centered'),
}))
const forward = (p) => step(p).locator('.shepherd-button:not(.shepherd-button-secondary)').first()
const target = (p) => p.locator('.shepherd-target').first()

// What a user does on a step, beyond Next
const actions = (stamp) => ({
  'files-folder-name': async (p) => { await target(p).fill(`Tour ${stamp}`); await target(p).press('Enter'); await p.waitForTimeout(1500); await forward(p).click() },
  'talk-name': async (p) => { await target(p).fill(`Team ${stamp}`); await forward(p).click() },
  'deck-card-title': async (p) => { await target(p).click(); await p.keyboard.type(`Task ${stamp}`); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await forward(p).click() },
  // A board's name in the highlighted list, as a user clicks it
  // (not a board some test made without lists)
  'deck-boards': async (p) => { await target(p).locator('a').filter({ hasNotText: /^\s*Scout/ }).first().click() },
  // The new card: the last one in the highlighted list
  'deck-open-card': async (p) => {
    const cards = target(p).locator('.card')
    await ((await cards.count()) ? cards.last() : target(p)).click()
  },
  'deck-comments': async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(800); await forward(p).click() },
  'calendar-title': async (p) => { await target(p).fill(`Meeting ${stamp}`); await forward(p).click() },
})

/**
 * @param {object} p A page on the tour's app, the tour about to start
 * @param {object[]} steps The tour's steps in the user's language
 * @param {object} options onStep(index, step) after each step showed, e.g. a screenshot
 * @return {Promise<{ok: boolean, lines: string[]}>} Per step: ok (on its
 *   element, or centered when it has none), WAIT (shown, but waiting aside)
 *   or MISS, with how long it took
 */
export async function playTour(p, steps, { onStep } = {}) {
  const ACTIONS = actions(String(Date.now()).slice(-5))
  const lines = []
  let ok = true
  for (const [i, s] of steps.entries()) {
    const started = Date.now()
    let st = null
    while (Date.now() - started < 12000) {
      if (await step(p).count()) {
        st = await state(p)
        if (st.title === s.title && (s.attachTo === '' || !st.centered)) break
      }
      await p.waitForTimeout(250)
    }
    const shown = st && st.title === s.title && (s.attachTo === '' || !st.centered)
    ok = ok && shown
    lines.push(`${shown ? 'ok' : (st?.title === s.title ? 'WAIT' : 'MISS')} ${s.id} ${Date.now() - started}ms${shown ? '' : ' (shows: ' + (st ? st.title + (st.centered ? ', centered' : '') : 'nothing') + ')'}`)
    if (st?.title !== s.title) break
    await onStep?.(i, s)
    if (ACTIONS[s.id] && shown) {
      await ACTIONS[s.id](p)
    } else if (s.advance === 'click' && shown) {
      await target(p).click()
    } else if (await forward(p).isVisible()) {
      await forward(p).click()
    } else {
      lines.push(`STUCK at ${s.id}: no way forward`)
      ok = false
      break
    }
    await p.waitForTimeout(400)
  }
  return { ok: ok && lines.length === steps.length, lines }
}
