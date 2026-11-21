import { expect, test, type Page } from '@playwright/test'

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
  for (const path of ['/', '/no-such-page']) {
    test(`${path}: 44px or more`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectTapTargets(page, 44)
    })
  }
})

test('the skip link is the first stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('production pages carry a Content-Security-Policy limited to the site', async ({ page }) => {
  await page.goto('/')
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
  expect(csp?.match(/https?:\/\/[^\s;]+/g)).toBeNull()
})
