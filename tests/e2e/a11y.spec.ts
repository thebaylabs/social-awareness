import { expect, test, type Page } from '@playwright/test'
import { expectNoAxeViolations, expectNoHorizontalOverflow, skipAudio } from './helpers'

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
    '/bhulkao/activity',
    '/bhulkao/story/homework-time',
    '/bhulkao/prasang/sparrows-and-the-sea',
    '/bhulkao/activity/doodle',
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
    '/yuvako',
    '/yuvako/activity',
    '/yuvako/scenario/one-am-exam',
    '/yuvako/prasang/lamp-by-the-window',
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
  const journeys: [string, string, string | null, RegExp][] = [
    ['Bhulkao', 'Activity', 'Doodle Catcher', /\/bhulkao\/activity\/doodle$/],
    ['Bhulkao', 'Story', null, /\/bhulkao\/story\/homework-time$/],
    ['Bhulkao', 'Prasang', null, /\/bhulkao\/prasang\/sparrows-and-the-sea$/],
    ['Yuvako', 'Activity', 'Choose your reality', /\/yuvako\/activity\/pills$/],
    ['Yuvako', 'Activity', 'Shabd Khoj', /\/yuvako\/activity\/words$/],
    ['Yuvako', 'Scenario', null, /\/yuvako\/scenario\/one-am-exam$/],
    ['Yuvako', 'Prasang', null, /\/yuvako\/prasang\/lamp-by-the-window$/],
  ]
  for (const [section, part, item, target] of journeys) {
    await page.goto('/')
    await page.getByRole('link', { name: new RegExp(`^${section}`) }).click()
    await page.getByRole('link', { name: new RegExp(`^${part}`) }).click()
    if (item) await page.getByRole('link', { name: new RegExp(`^${item}`) }).click()
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
      'written only to test the site.',
      'written only to test the site. [An example link](https://example.org/reading)',
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
  await page.goto('/yuvako/prasang/lamp-by-the-window')
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
    await page.goto('/bhulkao/story/homework-time')
    await page.getByRole('button', { name: 'Play the game now' }).click()
    await page.getByRole('button', { name: 'Keep playing' }).click()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()
    await expectNoAxeViolations(page)

    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).click()
    await expectNoAxeViolations(page)
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).first().click()
    await page.getByRole('button', { name: 'Exit' }).first().click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expect(page.getByTestId('blackout')).toBeVisible()
    await page.waitForTimeout(800) // past the fade in
    await expectNoAxeViolations(page)
    await page.getByTestId('blackout').getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeVisible()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: /Green pill/ }).click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'Next' }).first().click()
    await expectNoAxeViolations(page)
    await page.getByRole('button', { name: 'Next' }).first().click()
    await expectNoAxeViolations(page)
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
