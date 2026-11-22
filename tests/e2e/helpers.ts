import { expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fakeCrowd } from './fake-crowd'

export const LANGS = ['en', 'gu'] as const
export type Lang = (typeof LANGS)[number]

/**
 * Seed the shared diya count at the goal, allow intro motion, light the diya,
 * and wait until Explore Annakut is revealed. Use before clicking home hubs.
 */
export async function inaugurateHome(page: Page): Promise<void> {
  await fakeCrowd(page, 100)
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
  })
  await page.goto('/')
  await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'false')
  const light = page.getByRole('button', { name: /Light the diya|દીવો પ્રગટાવો/ })
  await light.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('diya-lighting')).toHaveAttribute('data-lit', 'true')
  await expect(page.getByTestId('explore')).toHaveAttribute('data-revealed', 'true')
}

/** Set the stored language before any page script runs. */
export async function useLanguage(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l) => {
    try {
      if (!sessionStorage.getItem('e2e-lang-set')) {
        localStorage.setItem('outreach.lang', l)
        sessionStorage.setItem('e2e-lang-set', '1')
      }
    } catch {
      // ignore
    }
  }, lang)
}

/**
 * Block audio files. The Bhulkao film streams its soundtrack for as long as it
 * plays, so a page that is playing never reaches "network idle". Without the
 * audio the film waits on its "Tap to start" screen, which is still checked.
 */
export async function skipAudio(page: Page): Promise<void> {
  await page.route(/\.(mp3|m4a|ogg|wav)(\?|$)/, (route) => route.abort())
}

/** Fail on any request that leaves the site's own origin. */
export function trackExternalRequests(page: Page, baseURL: string): string[] {
  const origin = new URL(baseURL).origin
  const external: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (new URL(url).origin !== origin) external.push(url)
  })
  return external
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0)
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
  expect(summary, 'axe violations').toEqual([])
}
