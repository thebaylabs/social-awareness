import { expect, test } from '@playwright/test'
import { inaugurateHome } from './helpers'

test('language choice survives reload and navigation', async ({ page }) => {
  await inaugurateHome(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'ગુજરાતી' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('અન્નકૂટ મહોત્સવ 2026')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  await expect(page.getByRole('button', { name: 'ગુજરાતી' })).toHaveAttribute('aria-pressed', 'true')

  // Reloading resets the diya; inaugurate again so the Explore hubs are clickable.
  await page.getByRole('button', { name: 'દીવો પ્રગટાવો' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('explore')).toHaveAttribute('data-revealed', 'true')

  await page.getByRole('link', { name: /પ્રવૃત્તિઓ/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('પ્રવૃત્તિઓ')
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Activities')
  await page.goto('/bhulkao')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('each language option is marked with its own lang attribute', async ({ page }) => {
  await page.goto('/')
  const group = page.getByRole('group', { name: 'Language' })
  await expect(group.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en')
  await expect(group.getByRole('button', { name: 'ગુજરાતી' })).toHaveAttribute('lang', 'gu')
  await expect(group.getByRole('button', { name: 'हिन्दी' })).toHaveCount(0)
})

test.describe('first visit in Hindi', () => {
  test.use({ locale: 'hi-IN' })
  test('a Hindi browser gets English, as Hindi is not offered', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})

test.describe('first visit in Gujarati', () => {
  test.use({ locale: 'gu-IN' })
  test('a Gujarati browser gets Gujarati', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  })
})

test.describe('first visit in another language', () => {
  test.use({ locale: 'fr-FR' })
  test('falls back to English', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})

test('the draft-translation note shows only for unreviewed languages', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('translation-note')).toHaveCount(0)
  await page.getByRole('button', { name: 'ગુજરાતી' }).click()
  await expect(page.getByTestId('translation-note')).toBeVisible()
})
