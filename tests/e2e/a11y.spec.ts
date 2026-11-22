import { expect, test, type Page } from '@playwright/test'
import {
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  inaugurateHome,
  skipAudio,
} from './helpers'

/** Every visible link and button on the page must be at least this tall (and 24px wide). */
async function expectTapTargets(page: Page, minHeight: number) {
  const small = await page.evaluate((min) => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(
      'main a, main button, header a, header button',
    )) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || r.bottom <= 0) continue // hidden or off-screen (skip link)
      if (r.height < min - 0.5 || r.width < 24)
        out.push(
          `${el.textContent?.trim() || el.getAttribute('aria-label')} ${Math.round(r.width)}x${Math.round(r.height)}`,
        )
    }
    return out
  }, minHeight)
  expect(small, `tap targets smaller than ${minHeight}px`).toEqual([])
}

test.describe('tap targets', () => {
  for (const path of [
    '/bhulkao',
    '/bhulkao/scenario/homework-time',
    '/bhulkao/prasang/sparrows-and-the-sea',
    '/bhulkao/activity/doodle',
    '/bhulkao/activity/temple-run',
  ]) {
    test(`Bhulkao ${path}: 56px or more`, async ({ page }) => {
      await skipAudio(page)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectTapTargets(page, 56)
    })
  }
  for (const path of [
    '/',
    '/annakut-darshan',
    '/activity',
    '/scenario',
    '/prasang',
    // The audience list pages now redirect to the shared hubs above.
    '/bhulkao/activity',
    '/yuvako',
    '/yuvako/activity',
    '/yuvako/scenario',
    '/yuvako/scenario/one-am-exam',
    '/yuvako/prasang/einstein-prayer',
    '/yuvako/activity/pills',
    '/yuvako/activity/words',
  ]) {
    test(`Yuvako and shared ${path}: 44px or more`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectTapTargets(page, 44)
    })
  }
})

test('every game, story and prasang is within three taps of the intro page', async ({ page }) => {
  const journeys: [string, string, RegExp][] = [
    ['Games', 'Doodle Catcher', /\/bhulkao\/activity\/doodle$/],
    ['Activities', 'Homework Time', /\/bhulkao\/scenario\/homework-time$/],
    ['Prasang', 'The Sparrows', /\/bhulkao\/prasang\/sparrows-and-the-sea$/],
    ['Games', 'Choose your reality', /\/yuvako\/activity\/pills$/],
    ['Games', 'Wordle', /\/yuvako\/activity\/words$/],
    ['Games', 'Temple Run', /\/bhulkao\/activity\/temple-run$/],
    ['Activities', '1 a.m.', /\/yuvako\/scenario\/one-am-exam$/],
    ['Activities', 'The Group Chat', /\/yuvako\/scenario\/group-chat-joke$/],
    ['Activities', 'The Extra Change', /\/yuvako\/scenario\/extra-change$/],
    ['Prasang', "Einstein's Prayer", /\/yuvako\/prasang\/einstein-prayer$/],
  ]
  for (const [hub, item, target] of journeys) {
    await inaugurateHome(page)
    await page.getByRole('link', { name: new RegExp(`^${hub}`) }).click()
    await page.getByRole('link', { name: new RegExp(`^${item}`) }).click()
    await expect(page).toHaveURL(target)
  }
})

test('the skip link is the first stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/yuvako')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('production pages carry a Content-Security-Policy limited to the site itself', async ({
  page,
}) => {
  await page.goto('/')
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
  expect(csp).not.toMatch(/https?:/)
})

test('links that leave the site ask first ("You are leaving this site")', async ({
  page,
  context,
}) => {
  // Serve the bundle with an external link added to the Yuvako prasang, as if a content editor had added one.
  await page.route(/\/assets\/index-[\w-]+\.js$/, async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace(
      'he gave the honor of his success first to God',
      'he gave the honor of his success first to God. [An example link](https://example.org/reading)',
    )
    await route.fulfill({ response, body })
  })
  const external: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('https://example.org')) external.push(r.url())
  })
  await context.route('https://example.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Elsewhere</title>' }),
  )
  await page.goto('/yuvako/prasang/einstein-prayer')
  const link = page.getByRole('button', { name: /An example link/ })
  await link.click()
  const dialog = page.getByRole('dialog', { name: 'You are leaving this site' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('example.org')
  await expect(dialog.getByRole('button', { name: 'Stay here' })).toBeFocused()
  await expectNoAxeViolations(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(external).toEqual([])

  await link.click()
  const go = dialog.getByRole('link', { name: 'Continue' })
  await expect(go).toHaveAttribute('rel', 'noopener noreferrer')
  const [popup] = await Promise.all([page.waitForEvent('popup'), go.click()])
  await popup.waitForLoadState()
  expect(popup.url()).toBe('https://example.org/reading')
})

test.describe('no accessibility violations in game and story states', () => {
  test('story ending and pill game screens', async ({ page }) => {
    await page.goto('/bhulkao/scenario/homework-time')
    await page.getByRole('button', { name: 'Play the game now' }).click()
    await page.getByRole('button', { name: 'Keep playing' }).click()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()
    await expectNoAxeViolations(page)

    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).click()
    await expectNoAxeViolations(page)
    // The first card with its timeline played and every row open.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Then what?' }).click()
    for (const summary of await page.getByTestId('pill-game').locator('summary').all())
      await summary.click()
    await expectNoAxeViolations(page)
    // The second card, on "Try instead".
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Try instead' }).click()
    await expectNoAxeViolations(page)
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click()
    // The recap after the last card, then the landing screen again.
    await expect(page.getByRole('heading', { name: 'The red pill, in brief' })).toBeFocused()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'Start over' }).click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expect(page.getByRole('heading', { name: /^Nice try!/ })).toBeVisible()
    await page.waitForTimeout(2600) // past the toss and the green pill's landing
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: /Green pill/ }).click()
    await page.getByRole('button', { name: 'I’ll try this' }).click()
    for (const summary of await page.getByTestId('pill-game').locator('summary').all())
      await summary.click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'Next' }).click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'Next' }).click()
    await expectNoAxeViolations(page)
    // The plan after the last page, with one solution chosen.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Your plan' })).toBeFocused()
    await expectNoAxeViolations(page)
  })

  test('Yuvako scenario ending, with the choices taken and the endings found', async ({ page }) => {
    await page.goto('/yuvako/scenario/one-am-exam')
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await page.getByRole('button', { name: 'Check it one last time' }).click()
    await page.getByRole('button', { name: 'Stop, even though sleep feels far away' }).click()
    await expect(page.getByRole('region', { name: /^Endings found/ })).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)
    await expectTapTargets(page, 44)
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await expect(page.getByRole('region', { name: /^મળેલા અંત/ })).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)
  })

  test('the lesson the scenarios share: ready to reveal, then revealed', async ({ page }) => {
    // Two scenarios already finished in this tab (set once, before the first page).
    await page.addInitScript(() => {
      if (sessionStorage.getItem('outreach.scenario.endings')) return
      sessionStorage.setItem(
        'outreach.scenario.endings',
        JSON.stringify({ 'one-am-exam': ['calm'], 'group-chat-joke': ['silence'] }),
      )
    })
    await page.goto('/yuvako/scenario/extra-change')
    await page.getByRole('button', { name: 'Stop and count it again' }).click()
    await page.getByRole('button', { name: 'Hand the ₹500 back to the shopkeeper' }).click()
    const shared = page.getByRole('region', { name: /^The lesson they share/ })
    await expect(shared.getByRole('button', { name: 'Reveal the lesson' })).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)
    await expectTapTargets(page, 44)
    await shared.getByRole('button', { name: 'Reveal the lesson' }).click()
    await expect(shared.getByRole('heading', { level: 3 })).toBeFocused()
    // Let the reveal's fade-in finish: contrast is checked at full opacity.
    await shared
      .locator('[data-just-revealed]')
      .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)

    await page.goto('/scenario')
    await expect(shared.getByRole('heading', { level: 3 })).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)
    await expectTapTargets(page, 44)
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await expect(page.getByRole('region', { name: /^સહિયારો બોધ/ })).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)
  })

  test('word game result and doodle game over, in Gujarati', async ({ page }) => {
    test.setTimeout(60_000)
    await page.addInitScript(() => {
      localStorage.setItem('outreach.lang', 'gu')
      let n = 0
      // Kind (below 0.7 = distraction), which item, x (0.5 = middle).
      Math.random = () =>
        [...((window as unknown as { __bad?: boolean }).__bad ? [0.1, 0.1, 0.5] : [0.9, 0.5, 0.5])][
          n++ % 3
        ]!
    })
    await page.goto('/yuvako/activity/words')
    // The game loads after the page shell; keys typed before it mounts are lost.
    await expect(page.getByTestId('word-board')).toBeVisible()
    await expectNoAxeViolations(page)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.type('zzzzzzzzzz')
      await page.keyboard.press('Enter')
    }
    await expect(page.getByTestId('word-result')).toBeVisible()
    await expectNoAxeViolations(page)
    await expectNoHorizontalOverflow(page)

    await page.goto('/bhulkao/activity/doodle')
    await expectNoAxeViolations(page)
    await page.getByRole('textbox').fill('આરવ')
    await page.getByRole('button', { name: 'શરૂ કરો' }).click()
    await page.getByRole('button', { name: 'થોભો' }).click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'ફરી ચાલુ કરો' }).click()
    await page.evaluate(() => {
      ;(window as unknown as { __bad: boolean }).__bad = true
    })
    await expect(page.getByTestId('doodle-over')).toBeVisible({ timeout: 30_000 })
    await expectNoAxeViolations(page)
  })
})
