import { expect, test } from '@playwright/test'
import {
  LANGS,
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  skipAudio,
  trackExternalRequests,
  useLanguage,
} from './helpers'

const ROUTES = [
  '/',
  '/bhulkao',
  '/yuvako',
  '/bhulkao/activity',
  '/yuvako/activity',
  '/bhulkao/activity/doodle',
  '/yuvako/activity/pills',
  '/yuvako/activity/words',
  '/bhulkao/story',
  '/yuvako/scenario',
  '/bhulkao/prasang',
  '/yuvako/prasang',
  '/bhulkao/story/homework-time',
  '/yuvako/scenario/one-am-exam',
  '/yuvako/scenario/group-chat-joke',
  '/yuvako/scenario/extra-change',
  '/bhulkao/prasang/sparrows-and-the-sea',
  '/yuvako/prasang/lamp-by-the-window',
  '/bhulkao/story/no-such-story',
  '/yuvako/prasang/no-such-prasang',
  '/no-such-page',
]

for (const lang of LANGS) {
  test.describe(`every route in ${lang}`, () => {
    for (const route of ROUTES) {
      test(route, async ({ page, baseURL }) => {
        const external = trackExternalRequests(page, baseURL!)
        await useLanguage(page, lang)
        await skipAudio(page)
        await page.goto(route)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('lang', lang)
        await page.waitForLoadState('networkidle')
        await expectNoHorizontalOverflow(page)
        await expectNoAxeViolations(page)
        expect(external).toEqual([])
      })
    }
  })
}
