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

/** The guide's line after he tosses the blue pill away. */
const SWAP_LINE = /^Nice try! Looking away doesn’t make reality disappear\. Try this one instead\.$/

/** Long enough for the toss and the green pill's landing to finish. */
const SWAP_MS = 2600

/** Blue pill (the guide tosses it and offers green), then take the green pill. */
async function toGreen(page: Page, go: (l: Locator) => Promise<void>) {
  await go(page.getByRole('button', { name: /Blue pill/ }))
  await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
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

  // The guide tosses the blue pill and offers green: still a choice, so the title stays.
  await go(page.getByRole('button', { name: /Blue pill/ }))
  await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
  await expect(h1).toHaveText('Choose your reality')
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
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
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
  test('the guide tosses the blue pill away and offers a green one, on the same screen', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    const game = page.getByTestId('pill-game')
    const guide = page.getByTestId('pill-guide')
    await expect(guide).toHaveAttribute('data-offer', 'blue')
    await go(page.getByRole('button', { name: /Blue pill/ }))

    // His line replaces the question and is read out first.
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
    await expect(page.getByRole('heading', { name: LANDING })).toHaveCount(0)
    await expect(game).toHaveAttribute('data-screen', 'blueSwap')
    await expect(guide).toHaveAttribute('data-offer', 'green')
    // No blackout and no separate "no escape" screen any more.
    await expect(page.locator('dialog')).toHaveCount(0)

    // The blue pill is gone; the red one stays and the green one is offered instead.
    await expect(game.getByRole('button', { name: /Blue pill/ })).toHaveCount(0)
    await expect(game.getByRole('button', { name: /Red pill/ })).toBeVisible()
    await expect(game.getByRole('button', { name: /Green pill/ })).toBeVisible()
    // No way back to the blue pill from here.
    await expect(game.getByRole('button', { name: 'Start over' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await page.waitForTimeout(SWAP_MS)
    await expectNoHorizontalOverflow(page)

    await go(page.getByRole('button', { name: /Green pill/ }))
    await expect(page.getByRole('heading', { name: 'Solution 1 of 3' })).toBeFocused()
  })

  test('the red pill can still be taken after the blue one is tossed', async ({ page }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await go(page.getByRole('button', { name: /Blue pill/ }))
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
    await go(page.getByRole('button', { name: /Red pill/ }))
    await expect(page.getByRole('heading', { name: 'Card 1 of 5' })).toBeFocused()
  })

  test('the pills in his hands are the buttons, labelled on hover or focus', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    const guide = page.getByTestId('pill-guide')
    const red = page.getByRole('button', { name: /Red pill/ })
    const blue = page.getByRole('button', { name: /Blue pill/ })
    const tip = (button: Locator) => button.locator('span').first()

    // Each button sits on the palm holding that pill (44 and 276 across the
    // 320-wide drawing, 153 down its 222), and is big enough to tap.
    const art = (await guide.boundingBox())!
    for (const [button, x] of [
      [red, 44],
      [blue, 276],
    ] as const) {
      const b = (await button.boundingBox())!
      expect(Math.abs(b.x + b.width / 2 - (art.x + (art.width * x) / 320))).toBeLessThan(3)
      expect(Math.abs(b.y + b.height / 2 - (art.y + (art.height * 153) / 222))).toBeLessThan(3)
      expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44)
    }

    if (await page.evaluate(() => matchMedia('(hover: none)').matches)) {
      // A touch screen cannot hover, so both labels are always out, side by side.
      await expect(tip(red)).toHaveCSS('opacity', '1')
      await expect(tip(blue)).toHaveCSS('opacity', '1')
      const r = (await tip(red).boundingBox())!
      const b = (await tip(blue).boundingBox())!
      expect(r.x + r.width).toBeLessThan(b.x)
    } else {
      await expect(tip(red)).toHaveCSS('opacity', '0')
      await expect(tip(blue)).toHaveCSS('opacity', '0')
      await red.hover()
      await expect(tip(red)).toHaveCSS('opacity', '1')
      await expect(guide).toHaveAttribute('data-lean', 'left')
      await page.mouse.move(0, 0)
      await expect(tip(red)).toHaveCSS('opacity', '0')
      // From the keyboard too.
      await red.focus()
      await page.keyboard.press('Tab')
      await expect(blue).toBeFocused()
      await expect(tip(blue)).toHaveCSS('opacity', '1')
      await expect(guide).toHaveAttribute('data-lean', 'right')
    }
    await expectNoHorizontalOverflow(page)
  })

  test('with reduced motion the guide is shown still, holding the green pill', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
    const guide = page.getByTestId('pill-guide')
    await expect(guide).toHaveAttribute('data-offer', 'green')
    expect(await guide.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
    await context.close()
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

  test('Back from the first green page returns to the guide offering the green pill', async ({
    page,
  }, info) => {
    const go = press(info.project.name === 'phone')
    await page.goto('/yuvako/activity/pills')
    await toGreen(page, go)
    await go(page.getByRole('button', { name: 'Back' }).first())
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
    await expect(page.getByTestId('pill-guide')).toHaveAttribute('data-offer', 'green')
    await expect(page.getByRole('button', { name: /Green pill/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Blue pill/ })).toHaveCount(0)
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

  test('plays blue, the swap and green by keyboard', async ({ page }) => {
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Red pill/ })).toBeFocused()
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
    const line = page.getByRole('heading', {
      name: 'વાહ, સરસ પ્રયાસ! નજર ફેરવવાથી વાસ્તવિકતા ગાયબ નથી થતી. એના બદલે આ લઈ જુઓ.',
    })
    await expect(line).toBeFocused()
    await expect(line).toHaveAttribute('lang', 'gu')
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: /લીલી ગોળી/ }).click()
    await expect(page.getByRole('heading', { name: 'ઉકેલ 1 / 3' })).toBeFocused()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'આગળ' }).first().click()
    await page.getByRole('button', { name: 'આગળ' }).first().click()
    await expect(page.getByRole('button', { name: 'બહાર નીકળો' }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('360px wide: the swap and every green page fit, with both pill buttons on the first screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/yuvako/activity/pills')
    await page.getByRole('button', { name: /Blue pill/ }).click()
    await expect(page.getByRole('heading', { name: SWAP_LINE })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.waitForTimeout(SWAP_MS)
    await expectNoHorizontalOverflow(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.getByRole('button', { name: /Red pill/ })).toBeInViewport()
    await expect(page.getByRole('button', { name: /Green pill/ })).toBeInViewport()
    await page.getByRole('button', { name: /Green pill/ }).click()
    for (let n = 1; n <= 3; n++) {
      await expect(page.getByRole('heading', { name: `Solution ${n} of 3` })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      if (n < 3) await page.getByRole('button', { name: 'Next' }).first().click()
    }
  })
})
