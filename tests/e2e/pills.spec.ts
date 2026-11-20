import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, useLanguage } from './helpers'

/** Tap on the phone project (touch), click on desktop. */
function press(isPhone: boolean) {
  return (target: Locator) => (isPhone ? target.tap() : target.click())
}

const LANDING = 'Which pill will you take?'

/** Red pill, then Next through all five cards and Exit after the last. */
async function finishRed(page: Page, go: (l: Locator) => Promise<void>) {
  await go(page.getByRole('button', { name: /Red pill/ }))
  for (let n = 1; n < 5; n++) await go(page.getByRole('button', { name: 'Next' }).first())
  await go(page.getByRole('button', { name: 'Exit' }).first())
}

/** The Continue button inside the blackout. */
const blackoutContinue = (page: Page, name: string | RegExp = 'Continue') =>
  page.getByTestId('blackout').getByRole('button', { name })

/** Blue pill, continue past the blackout, then take the green pill. */
async function toGreen(page: Page, go: (l: Locator) => Promise<void>) {
  await go(page.getByRole('button', { name: /Blue pill/ }))
  await go(blackoutContinue(page))
  await expect(
    page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
  ).toBeVisible()
  await go(page.getByRole('button', { name: /Green pill/ }))
}

test('the preview strip is not shown on the pill game', async ({ page }) => {
  await page.goto('/yuvako/activity/pills')
  await expect(page.getByRole('heading', { name: LANDING })).toBeVisible()
  await expect(page.getByTestId('preview-strip')).toHaveCount(0)
  await page.getByRole('button', { name: /Red pill/ }).click()
  await expect(page.getByTestId('preview-strip')).toHaveCount(0)
})

test('the page heading is "Choose your reality", then names the chosen pill', async ({
  page,
}, info) => {
  const go = press(info.project.name === 'phone')
  const h1 = page.getByRole('heading', { level: 1 })
  await page.goto('/yuvako/activity/pills')
  await expect(h1).toHaveText('Choose your reality')

  await go(page.getByRole('button', { name: /Red pill/ }))
  await expect(h1).toHaveText('Red pill')
  await expect(page.getByText('You took the red pill')).toHaveCount(0)
  await go(page.getByRole('button', { name: 'Back' }).first())
  await expect(h1).toHaveText('Choose your reality')

  await go(page.getByRole('button', { name: /Blue pill/ }))
  await go(blackoutContinue(page))
  await expect(h1).toHaveText('Blue pill')
  await expect(page.getByText('You took the blue pill')).toHaveCount(0)

  await go(page.getByRole('button', { name: /Green pill/ }))
  await expect(h1).toHaveText('Green pill')
  await expect(page.getByText('You took the green pill')).toHaveCount(0)
})

test('Next and Back open each page at the top, even from the bottom of the page', async ({
  page,
}, info) => {
  const go = press(info.project.name === 'phone')
  const scrollY = () => page.evaluate(() => window.scrollY)
  await page.goto('/yuvako/activity/pills')
  await go(page.getByRole('button', { name: /Red pill/ }))
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await scrollY()).toBeGreaterThan(0)
  await go(page.getByRole('button', { name: 'Next' }).last())
  await expect(page.getByRole('heading', { name: 'Card 2 of 5' })).toBeVisible()
  await expect.poll(scrollY).toBe(0)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await go(page.getByRole('button', { name: 'Back' }).last())
  await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeVisible()
  await expect.poll(scrollY).toBe(0)
})

test.describe('pill game: red pill', () => {
  test('every card, Back, and the landing screen again after the last card', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    const game = page.getByTestId('pill-game')
    await expect(page.getByRole('heading', { name: LANDING })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await go(page.getByRole('button', { name: /Red pill/ }))
    await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeFocused()
    await expect(
      game.getByRole('heading', { level: 3, name: 'Screens can steal sleep' }),
    ).toBeVisible()
    await expect(game.getByRole('img', { name: /four steps/ })).toBeVisible()
    await expect(game.getByRole('tab')).toHaveCount(2)
    await expect(game.getByRole('button', { name: /cdc\.gov\/sleep/ })).toBeVisible()
    await go(page.getByRole('button', { name: 'Next' }).first())
    await expect(page.getByRole('heading', { name: 'Card 2 of 5' })).toBeFocused()
    await go(page.getByRole('button', { name: 'Back' }).first())
    await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeVisible()
    for (let n = 1; n < 5; n++) await go(page.getByRole('button', { name: 'Next' }).first())
    await expect(page.getByRole('heading', { name: 'Card 5 of 5' })).toBeVisible()
    // The last card ends with Exit (top and bottom), not Next or Continue.
    await expect(game.getByRole('button', { name: 'Exit' })).toHaveCount(2)
    await expect(game.getByRole('button', { name: 'Next' })).toHaveCount(0)
    await expect(game.getByRole('button', { name: 'Continue' })).toHaveCount(0)
    await go(game.getByRole('button', { name: 'Exit' }).last())

    // After the last card: back to the landing screen, not the green pill.
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
    await expect(game).toHaveAttribute('data-screen', 'start')
    await expect(page.getByRole('button', { name: /Red pill/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Blue pill/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Green pill/ })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('the red pill can be replayed, and the blue pill chosen, after finishing', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await finishRed(page, go)
    await go(page.getByRole('button', { name: /Red pill/ }))
    await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeFocused()
    await go(page.getByRole('button', { name: 'Back' }).first())
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
    await finishRed(page, go)
    await go(page.getByRole('button', { name: /Blue pill/ }))
    await expect(page.getByTestId('blackout')).toBeVisible()
  })

  test('plays the whole red flow by keyboard', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).focus()
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 5; n++) {
      await expect(page.getByRole('heading', { name: `Card ${n} of 5` })).toBeFocused()
      await page
        .getByRole('button', { name: n < 5 ? 'Next' : 'Exit' })
        .first()
        .focus()
      await page.keyboard.press('Enter')
    }
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Red pill/ })).toBeFocused()
  })

  test('Back and Next appear at the top and the bottom of each card, and both work', async ({
    page,
  }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).click()
    await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(2)
    const next = page.getByRole('button', { name: 'Next' })
    const [top, bottom] = [await next.first().boundingBox(), await next.last().boundingBox()]
    expect(bottom!.y).toBeGreaterThan(top!.y + 200)
    await next.last().click()
    await expect(page.getByRole('heading', { name: 'Card 2 of 5' })).toBeFocused()
    await page.getByRole('button', { name: 'Back' }).last().click()
    await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).first().click()
    await expect(page.getByRole('heading', { name: 'Card 2 of 5' })).toBeVisible()
  })

  test('age tabs work by keyboard and show each group', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).click()
    const tabs = page.getByRole('tab')
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('American Academy of Pediatrics')
    await tabs.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('CDC advises')
    await expect(page.getByRole('tabpanel')).toContainText('[2]')
    await page.keyboard.press('End')
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowRight') // wraps round to the first tab
    await expect(tabs.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowLeft') // and back to the last
    await expect(tabs.nth(1)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(tabs.nth(0)).toBeFocused()
    // Only the selected tab is in the tab order.
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1')
  })

  test('every red card has a title, a visual, a takeaway, help and a linked source; 360px has no overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Red pill/ }).click()
    for (let n = 1; n <= 5; n++) {
      await expect(page.getByRole('heading', { name: `Card ${n} of 5` })).toBeVisible()
      const game = page.getByTestId('pill-game')
      await expect(game.getByRole('heading', { level: 3 }).first()).toBeVisible()
      await expect(game.getByRole('img')).toHaveCount(1)
      await expect(game.getByTestId('takeaway-help')).toContainText('Key takeaway')
      await expect(game.getByTestId('takeaway-help')).toContainText('What can help?')
      await expect(game.getByRole('listitem').filter({ hasText: '[1]' }).first()).toBeVisible()
      await expect(game.getByRole('heading', { name: 'What can help?' })).toBeVisible()
      await expect(game.getByRole('heading', { name: 'References' })).toBeVisible()
      expect(
        await game.getByRole('button', { name: /opens in a new tab|\S/ }).count(),
      ).toBeGreaterThan(0)
      await expectNoHorizontalOverflow(page)
      if (n < 5) await page.getByRole('button', { name: 'Next' }).first().click()
    }
  })

  test('works in Gujarati', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /લાલ ગોળી/ }).click()
    await expect(page.getByRole('heading', { name: 'કાર્ડ 1 / 5' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'સ્ક્રીન ઊંઘ છીનવી શકે છે' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'બાળકો' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'સંદર્ભો' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('pill game: blue pill', () => {
  test('goes dark with a message, has no time limit, and tapping does not skip it', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await go(page.getByRole('button', { name: /Blue pill/ }))
    const dark = page.getByTestId('blackout')
    await expect(dark).toBeVisible()
    await expect(page.getByRole('heading', { name: 'You took the blue pill' })).toBeFocused()
    const message = dark.getByRole('status')
    await expect(message).toContainText('You cannot escape a harsh reality by choosing ignorance.')
    await expect(message).toContainText('Ignoring reality does not make it disappear.')
    // Fills the screen and is dark with light text.
    const box = await dark.boundingBox()
    const view = page.viewportSize()!
    expect(box!.width).toBeGreaterThanOrEqual(view.width - 1)
    expect(box!.height).toBeGreaterThanOrEqual(view.height - 1)
    expect(await dark.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(5, 7, 11)')
    expect(await dark.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
    await expectNoHorizontalOverflow(page)

    // Tapping the message does not skip it, and nothing moves it on by itself.
    await go(message)
    await page.waitForTimeout(5000)
    await expect(dark).toBeVisible()
    await expect(message).toContainText('choosing ignorance')

    await go(blackoutContinue(page))
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeFocused()
    await expect(dark).toHaveCount(0)
  })

  test('with reduced motion it also waits for the Continue button', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expect(page.getByTestId('blackout')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('choosing ignorance')
    await page.waitForTimeout(4000)
    await expect(page.getByTestId('blackout')).toBeVisible()
    await blackoutContinue(page).click()
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeFocused()
    await context.close()
  })

  test('Continue and Escape also move on from the blackout, by keyboard', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('blackout')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeFocused()
  })

  test('the reality screen explains there is no ignorance pill and leads to the green pill', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await go(page.getByRole('button', { name: /Blue pill/ }))
    await go(blackoutContinue(page))
    const heading = page.getByRole('heading', { name: 'There is no Blue Pill for reality' })
    await expect(heading).toBeFocused()
    const game = page.getByTestId('pill-game')
    await expect(game).toContainText(
      'Looking away may feel easier for a moment, but the problem remains.',
    )
    await expect(game).toContainText('The Green Pill is a choice to understand what is happening')
    await expect(game).toContainText('There is no true')
    await expect(game).toContainText('Avoiding a problem does not remove it.')
    // No Start over button after the blackout.
    await expect(game.getByRole('button', { name: 'Start over' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await go(page.getByRole('button', { name: /Green pill/ }))
    await expect(page.getByRole('heading', { name: 'Solution 1 of 3' })).toBeFocused()
  })
})

test.describe('pill game: green pill', () => {
  test('three pages with progress, Back and Next, then Exit back to the landing screen', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    const game = page.getByTestId('pill-game')
    await toGreen(page, go)
    await expect(page.getByRole('heading', { name: 'Solution 1 of 3' })).toBeFocused()
    await expect(
      game.getByRole('heading', { level: 3, name: 'Reconnect with people' }),
    ).toBeVisible()
    await expect(game.getByTestId('action-why')).toContainText('What you can do')
    await expect(game.getByTestId('action-why')).toContainText('Why it helps')
    await expect(game).toContainText('Adult Development')
    await expect(game).toContainText(
      'strongly associated with better happiness, health and longevity',
    )
    await expect(game.getByRole('button', { name: /news\.[a-z]+\.edu/ })).toBeVisible()
    await expect(game.getByRole('button', { name: 'Exit' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await go(page.getByRole('button', { name: 'Next' }).first())
    await expect(page.getByRole('heading', { name: 'Solution 2 of 3' })).toBeFocused()
    await expect(
      game.getByRole('heading', { level: 3, name: 'Create healthier digital boundaries' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await go(page.getByRole('button', { name: 'Back' }).first())
    await expect(page.getByRole('heading', { name: 'Solution 1 of 3' })).toBeFocused()
    await go(page.getByRole('button', { name: 'Next' }).first())
    await go(page.getByRole('button', { name: 'Next' }).first())

    // Last page: Exit instead of Next, and it stays on the site.
    await expect(page.getByRole('heading', { name: 'Solution 3 of 3' })).toBeFocused()
    await expect(
      game.getByRole('heading', { level: 3, name: 'Move, rest and be present' }),
    ).toBeVisible()
    await expect(game.getByRole('button', { name: 'Next' })).toHaveCount(0)
    await expect(game.getByRole('button', { name: 'Exit' })).toHaveCount(2)
    await expectNoHorizontalOverflow(page)
    const popups: Page[] = []
    page.on('popup', (p) => popups.push(p))
    await go(game.getByRole('button', { name: 'Exit' }).last())
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
    await expect(game).toHaveAttribute('data-screen', 'start')
    await expect(page.getByRole('button', { name: /Red pill/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Blue pill/ })).toBeVisible()
    expect(popups).toEqual([])
    expect(new URL(page.url()).pathname).toBe('/yuvako/activity/pills')
  })

  test('Back from the first green page returns to the reality screen', async ({ page }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await toGreen(page, go)
    await go(page.getByRole('button', { name: 'Back' }).first())
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeFocused()
  })

  test('Start over works from the first and last green pages', async ({ page }, info) => {
    test.setTimeout(60_000)
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await toGreen(page, go)
    await expect(page.getByRole('heading', { name: 'Solution 1 of 3' })).toBeVisible()
    await go(page.getByRole('button', { name: 'Start over' }))
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()

    await toGreen(page, go)
    await go(page.getByRole('button', { name: 'Next' }).first())
    await go(page.getByRole('button', { name: 'Next' }).first())
    await expect(page.getByRole('heading', { name: 'Solution 3 of 3' })).toBeVisible()
    await go(page.getByRole('button', { name: 'Start over' }))
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
  })

  test('plays blue, reality and green by keyboard', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(blackoutContinue(page)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Green pill/ })).toBeFocused()
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 3; n++) {
      await expect(page.getByRole('heading', { name: `Solution ${n} of 3` })).toBeFocused()
      await page.keyboard.press('Tab') // Back
      await page.keyboard.press('Tab') // Next or Exit
      await expect(
        page.getByRole('button', { name: n < 3 ? 'Next' : 'Exit' }).first(),
      ).toBeFocused()
      await page.keyboard.press('Enter')
    }
    await expect(page.getByRole('heading', { name: LANDING })).toBeFocused()
  })

  test('blue and green pills work in Gujarati', async ({ page }) => {
    await useLanguage(page, 'gu')
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /વાદળી ગોળી/ }).click()
    await expect(page.getByRole('status')).toContainText(
      'અજ્ઞાનતા પસંદ કરવાથી કઠોર વાસ્તવિકતામાંથી બચી શકાતું નથી.',
    )
    await blackoutContinue(page, 'આગળ વધો').click()
    await expect(
      page.getByRole('heading', { name: 'વાસ્તવિકતા માટે કોઈ વાદળી ગોળી નથી' }),
    ).toBeVisible()
    await page.getByRole('button', { name: /લીલી ગોળી/ }).click()
    await expect(page.getByRole('heading', { name: 'ઉકેલ 1 / 3' })).toBeFocused()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'આગળ' }).first().click()
    await page.getByRole('button', { name: 'આગળ' }).first().click()
    await expect(page.getByRole('button', { name: 'બહાર નીકળો' }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('360px wide: every green page, the reality screen and the blackout fit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expectNoHorizontalOverflow(page)
    await blackoutContinue(page).click()
    await expect(
      page.getByRole('heading', { name: 'There is no Blue Pill for reality' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: /Green pill/ }).click()
    for (let n = 1; n <= 3; n++) {
      await expect(page.getByRole('heading', { name: `Solution ${n} of 3` })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      if (n < 3) await page.getByRole('button', { name: 'Next' }).first().click()
    }
  })
})
