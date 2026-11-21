import { expect, test, type Page } from '@playwright/test'
import { fakeCrowd, type FakeCrowd } from './fake-crowd'
import { expectNoAxeViolations } from './helpers'

/**
 * The site plays no opening fade-in or fireworks in an automated browser
 * (src/components/intro-motion.ts). These tests hide that flag, so the
 * lighting runs as it does for a visitor, fireworks included.
 *
 * `others` is how many other people have already lit their diya. The default
 * is the whole crowd, so lighting this one completes the count at once.
 */
async function visitAsAPerson(page: Page, others = 100): Promise<FakeCrowd> {
  const crowd = await fakeCrowd(page, others)
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
  })
  await page.goto('/')
  await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'false')
  // A real visit also plays the opening fade-in; let it finish, as a page
  // mid-fade fails colour-contrast checks.
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('header, main, footer')].flatMap((el) =>
        el.getAnimations().map((animation) => animation.finished),
      ),
    ),
  )
  return crowd
}

/** Light the diya from the keyboard: Enter brings out the fuljadi, Enter lights. */
async function lightByKeyboard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Light the diya' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /Fuljadi/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'true')
}

function centre(box: { x: number; y: number; width: number; height: number } | null) {
  if (!box) throw new Error('element is not on screen')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('lighting the intro diya', () => {
  test('the page opens on an unlit diya, with no bar and no fireworks yet', async ({ page }) => {
    const crowd = await visitAsAPerson(page)
    await expect(page.getByRole('button', { name: 'Light the diya' })).toBeVisible()
    await expect(page.getByTestId('fireworks')).toHaveCount(0)
    await expect(page.getByTestId('crowd')).toBeHidden()
    // Nothing is counted, or even asked, before the diya is lit.
    expect(crowd.requests).toEqual([])
    // The title, "Atmiyata" and the theme line are out of sight until it is lit.
    await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '0')
    await expect(page.getByText('Digital Outreach')).toHaveCount(0)
    await expectNoAxeViolations(page)
  })

  test('dragging the fuljadi onto the wick lights it and starts the fireworks', async ({
    page,
  }) => {
    await visitAsAPerson(page)
    await page.getByRole('button', { name: 'Light the diya' }).click()
    const fuljadi = page.getByTestId('fuljadi')
    await expect(fuljadi).toBeVisible()
    await expect(page.getByText('Wave the fuljadi')).toBeVisible()
    // A plain click on the fuljadi is not enough: it has to reach the wick.
    await page.waitForTimeout(700) // the pop-in animation moves the handle
    const tip = centre(await fuljadi.boundingBox())
    await page.mouse.click(tip.x, tip.y)
    await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'false')

    const wick = centre(await page.getByTestId('diya-wick-hit').boundingBox())
    await page.mouse.move(tip.x, tip.y)
    await page.mouse.down()
    await page.mouse.move(wick.x, wick.y, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'true')
    await expect(page.getByText('The diya is lit. Welcome.')).toBeVisible()
    await expect(fuljadi).toHaveCount(0)
    await expect(page.getByTestId('fireworks')).toBeVisible()
    await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Annakut Mahotsav 2026')

    // Nothing is remembered: the next visit starts with an unlit diya again.
    await page.reload()
    await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'false')
    await expect(page.getByRole('button', { name: 'Light the diya' })).toBeVisible()
    await expect(page.getByTestId('fireworks')).toHaveCount(0)
    await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '0')
  })

  test('the keyboard alone can light the diya, or put the fuljadi away', async ({ page }) => {
    await visitAsAPerson(page)
    const lightButton = page.getByRole('button', { name: 'Light the diya' })
    await lightButton.focus()
    await page.keyboard.press('Enter')

    const handle = page.getByRole('button', { name: /Fuljadi/ })
    await expect(handle).toBeFocused()
    await expect(page.getByText('Press Enter to light the diya')).toBeVisible()
    await expectNoAxeViolations(page)

    // Escape puts it away, unlocks scrolling and returns to the button.
    await page.keyboard.press('Escape')
    await expect(handle).toHaveCount(0)
    await expect(lightButton).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

    await page.keyboard.press('Enter')
    await expect(handle).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'true')
    await expect(page.getByText('The diya is lit. Welcome.')).toBeFocused()
    await expect(page.getByTestId('fireworks')).toBeVisible()
  })

  test.describe('waiting for the others', () => {
    test('the bar fills as people light their diyas; at 100 the welcome and fireworks come', async ({
      page,
    }) => {
      const crowd = await visitAsAPerson(page, 36)
      await lightByKeyboard(page)

      const bar = page.getByRole('progressbar', {
        name: 'Let’s wait for others to light their diya',
      })
      await expect(bar).toBeVisible()
      await expect(bar).toHaveAttribute('aria-valuenow', '37')
      await expect(bar).toHaveAttribute('aria-valuemax', '100')
      await expect(page.getByTestId('crowd-count')).toHaveText('37 of 100 diyas lit')
      // Still waiting: no welcome and no fireworks.
      await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '0')
      await expect(page.getByTestId('fireworks')).toHaveCount(0)
      await expectNoAxeViolations(page)

      crowd.others = 60
      await expect(bar).toHaveAttribute('aria-valuenow', '61', { timeout: 10_000 })
      await expect(page.getByTestId('fireworks')).toHaveCount(0)

      crowd.others = 99
      const full = page.getByRole('progressbar', {
        name: 'All 100 diyas are lit. Time to inaugurate Annakut Mahotsav!',
      })
      await expect(full).toHaveAttribute('aria-valuenow', '100', { timeout: 10_000 })
      await expect(page.getByTestId('crowd-count')).toHaveText('100 of 100 diyas lit')
      await expect(page.getByTestId('fireworks')).toBeVisible()
      await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '1')

      // Once the count is complete, the page stops asking.
      const asked = crowd.requests.length
      await page.waitForTimeout(4000)
      expect(crowd.requests.length).toBe(asked)
    })

    test('a device is counted once, however often it lights the diya', async ({ page }) => {
      const crowd = await visitAsAPerson(page, 10)
      await lightByKeyboard(page)
      await expect(page.getByTestId('crowd-count')).toHaveText('11 of 100 diyas lit')

      await page.reload()
      await expect(page.getByTestId('crowd')).toBeHidden()
      await lightByKeyboard(page)
      await expect(page.getByTestId('crowd-count')).toHaveText('11 of 100 diyas lit')
      expect(crowd.devices.size).toBe(1)
    })

    test('if the count cannot be reached, the page keeps waiting and tries again', async ({
      page,
    }) => {
      const crowd = await visitAsAPerson(page, 100)
      crowd.failing = true
      await lightByKeyboard(page)
      await expect(page.getByTestId('crowd')).toBeVisible()
      await expect(page.getByTestId('crowd-count')).toHaveText('Counting the diyas…')
      await expect(page.getByTestId('fireworks')).toHaveCount(0)
      await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '0')

      crowd.failing = false
      await expect(page.getByTestId('fireworks')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '1')
    })

    test('the waiting text is in Gujarati too', async ({ page }) => {
      await visitAsAPerson(page, 36)
      await page.getByRole('button', { name: 'ગુજરાતી' }).click()
      await page.getByRole('button', { name: 'દીવો પ્રગટાવો' }).focus()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('crowd-count')).toHaveText('100 માંથી 37 દીવા પ્રગટ્યા')
      await expect(page.getByText('ચાલો, બીજા લોકો પોતાનો દીવો પ્રગટાવે તેની રાહ જોઈએ')).toBeVisible()
      await expectNoAxeViolations(page)
    })
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('one press lights the diya, with no fuljadi and no fireworks', async ({ page }) => {
      await visitAsAPerson(page)
      await page.getByRole('button', { name: 'Light the diya' }).click()
      await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'true')
      await expect(page.getByTestId('fuljadi')).toHaveCount(0)
      await expect(page.getByText('The diya is lit. Welcome.')).toBeVisible()
      await expect(page.getByTestId('fireworks')).toHaveCount(0)
      await expect(page.getByTestId('welcome')).toHaveCSS('opacity', '1')
      await expectNoAxeViolations(page)
    })
  })
})
