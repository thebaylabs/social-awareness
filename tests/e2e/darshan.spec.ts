import { expect, test, type Page } from '@playwright/test'
import { expectNoAxeViolations, trackExternalRequests } from './helpers'

/** Requests for the 3D viewer's files (public/darshan-3d), by file name within that folder. */
function trackViewerRequests(page: Page): string[] {
  const files: string[] = []
  page.on('request', (request) => {
    const match = /\/darshan-3d\/(.*)$/.exec(new URL(request.url()).pathname)
    if (match) files.push(match[1]!)
  })
  return files
}

const stage = (page: Page) => page.getByTestId('darshan-stage')
/** The viewer's own page, inside the iframe (whose title changes with the language). */
const viewer = (page: Page) => page.frameLocator('[data-testid="darshan-stage"] iframe')

test('the home page leads to Annakut Darshan', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^Annakut Darshan/ }).click()
  await expect(page).toHaveURL(/\/annakut-darshan$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Annakut Darshan')
})

test('nothing of the 3D scene is fetched until the visitor asks for it', async ({ page }) => {
  const files = trackViewerRequests(page)
  await page.goto('/annakut-darshan')
  await expect(page.getByRole('button', { name: 'Load the 3D view' })).toBeVisible()
  await expect(page.getByText('About 34 MB. Best on Wi-Fi.')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(files).toEqual(['poster.webp'])
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('the viewer opens inside the page, without its own heading or language switch', async ({
  page,
  baseURL,
}) => {
  const external = trackExternalRequests(page, baseURL!)
  await page.goto('/annakut-darshan')
  await page.getByRole('button', { name: 'Load the 3D view' }).click()
  await expect(stage(page)).toHaveAttribute('data-state', /^(loading|ready|error)$/)
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    /\/darshan-3d\/index\.html\?embed&lang=en$/,
  )
  // The page's own heading and language switch are the only ones on screen.
  await expect(viewer(page).locator('#reset')).toBeVisible()
  await expect(viewer(page).locator('#site-title')).toBeHidden()
  await expect(viewer(page).locator('#lang')).toBeHidden()
  await expect(page.locator('h1')).toHaveCount(1)

  // "Fill the screen" covers the window; Escape or the same button brings the page back.
  const size = page.viewportSize()!
  await page.getByRole('button', { name: 'Fill the screen' }).click()
  await expect
    .poll(async () => (await stage(page).boundingBox())?.width)
    .toBeGreaterThanOrEqual(size.width - 1)
  expect((await stage(page).boundingBox())?.height).toBeGreaterThanOrEqual(size.height - 1)
  await page.getByRole('button', { name: 'Back to the page' }).click()
  await expect(stage(page)).toHaveAttribute('data-expanded', 'false')
  await page.getByRole('button', { name: 'Fill the screen' }).click()
  await page.getByRole('button', { name: 'Back to the page' }).press('Escape')
  await expect(stage(page)).toHaveAttribute('data-expanded', 'false')
  expect(external).toEqual([])
})

test('full view, walk view and the language switch work in the loaded scene', async ({ page }) => {
  // Headless browsers draw the scene's 800,000 points slowly, and clicks wait
  // while the camera moves, so this test takes 20 seconds alone and over a
  // minute beside others. It has not been tried on a CI machine, which has no
  // graphics card, so it is left out there unless E2E_DARSHAN_3D=1 is set.
  test.skip(
    !!process.env.CI && !process.env.E2E_DARSHAN_3D,
    'the loaded 3D scene is not tested on CI unless E2E_DARSHAN_3D=1',
  )
  test.setTimeout(240_000)
  await page.goto('/annakut-darshan')
  await page.getByRole('button', { name: 'Load the 3D view' }).click()
  // Drawing the scene needs WebGL 2 or WebGPU. A test machine without either
  // gets the viewer's own message instead, and the rest cannot be checked there.
  await expect(stage(page)).toHaveAttribute('data-state', /^(ready|error)$/, { timeout: 60_000 })
  if ((await stage(page).getAttribute('data-state')) === 'error') {
    await expect(viewer(page).locator('#error')).toBeVisible()
    test.skip(true, 'this browser cannot draw the 3D scene (no WebGL 2 or WebGPU)')
  }

  // The whole viewer is on screen, buttons included, without the visitor scrolling.
  await expect(stage(page)).toBeInViewport({ ratio: 0.99 })

  // Full view to walk view and back.
  await viewer(page).getByRole('button', { name: 'Walk along the display' }).click()
  await expect(viewer(page).getByRole('button', { name: 'Full view' })).toBeVisible()
  await expect(viewer(page).locator('#walk-count')).toHaveText(/^1 \/ \d+$/)
  await viewer(page)
    .getByRole('button', { name: /Move left/ })
    .click()
  await expect(viewer(page).locator('#walk-count')).toHaveText(/^2 \/ \d+$/)
  await viewer(page).getByRole('button', { name: 'Full view' }).click()
  await expect(viewer(page).getByRole('button', { name: 'Walk along the display' })).toBeVisible()

  // The header's language switch changes the viewer too, without reloading it.
  await page.getByRole('button', { name: 'ગુજરાતી' }).click()
  await expect(viewer(page).getByRole('button', { name: 'ચાલતાં ચાલતાં દર્શન' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveAttribute('src', /lang=en$/)
  await page.getByRole('button', { name: 'English' }).click()
  await expect(viewer(page).getByRole('button', { name: 'Walk along the display' })).toBeVisible()

  await expectNoAxeViolations(page)
})
