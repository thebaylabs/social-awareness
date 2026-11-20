import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './helpers'

const WORDS: string[] = (
  JSON.parse(readFileSync('content/words.json', 'utf8')) as { words: { word: string }[] }
).words.map((w) => w.word)

/** A date (10 a.m. local) whose daily word is the given word: day number modulo list length. */
function dateFor(word: string): Date {
  const index = WORDS.indexOf(word)
  const d = new Date(2026, 10, 14, 10)
  const day = (x: Date) =>
    Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86_400_000)
  while (day(d) % WORDS.length !== index) d.setDate(d.getDate() + 1)
  return d
}

/** A wrong guess of the right length that shares no position with the answer. */
const wrong = (answer: string) => 'z'.repeat(answer.length)

async function open(page: Page, dailyWord: string) {
  await page.clock.setFixedTime(dateFor(dailyWord))
  await page.goto('/yuvako/activity/words')
  await expect(page.getByTestId('word-board')).toBeVisible()
}

/** Use the on-screen keyboard: real taps on the phone project, clicks on desktop. */
async function tapWord(page: Page, word: string) {
  const touch = test.info().project.name === 'phone'
  const keys = page.getByRole('group', { name: 'Letter keys' })
  for (const ch of word) {
    const key = keys.getByRole('button', { name: new RegExp(`^${ch.toUpperCase()}\\b`) })
    await (touch ? key.tap() : key.click())
  }
  const enter = keys.getByRole('button', { name: 'Enter' })
  await (touch ? enter.tap() : enter.click())
}

async function typeWord(page: Page, word: string) {
  await page.keyboard.type(word)
  await page.keyboard.press('Enter')
}

test.describe('word game', () => {
  test('daily: a win with the on-screen keyboard, restored after reload', async ({ page }) => {
    await open(page, 'seva')
    await expect(page.getByText('This word has 4 letters')).toBeVisible()
    await tapWord(page, 'daya')
    await expect(
      page
        .getByRole('group', { name: 'Letter keys' })
        .getByRole('button', { name: 'A right place' }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('group', { name: 'Letter keys' })
        .getByRole('button', { name: 'D not in the word' }),
    ).toBeVisible()
    await tapWord(page, 'seva')

    const result = page.getByTestId('word-result')
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()
    await expect(result).toContainText('SEVA')
    await expect(result.locator('[lang=gu]')).toHaveText('સેવા')
    await expect(result).toContainText('Solved in 2 of 6 tries.')
    await expect(result).toContainText('Selfless service')
    // The words are final for now, so the result is not marked as placeholder.
    await expect(result.getByTestId('placeholder-notice')).toHaveCount(0)
    await expect(result).not.toContainText('Placeholder')

    await page.reload()
    await expect(page.getByTestId('word-game')).toHaveAttribute('data-status', 'won')
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Guess 1: D not in the word' }),
    ).toHaveCount(1)
    await expect(page.getByTestId('word-result')).toContainText('SEVA')
  })

  test('daily: a loss on a 9-letter word with the physical keyboard, which fits at 360px', async ({
    page,
  }) => {
    await open(page, 'swadharma')
    await expectNoHorizontalOverflow(page)
    const board = await page.getByTestId('word-board').boundingBox()
    expect(board!.x).toBeGreaterThanOrEqual(0)
    expect(board!.x + board!.width).toBeLessThanOrEqual(page.viewportSize()!.width)

    await typeWord(page, 'aaaaaaaaa')
    // Two-pass scoring: only the three a's in place are marked, the rest are "not in the word".
    await expect(
      page
        .getByTestId('word-board')
        .getByText(/^Guess 1: A not in the word, A not in the word, A right place,/),
    ).toBeAttached()
    for (let i = 0; i < 5; i++) await typeWord(page, wrong('swadharma'))
    await expect(
      page.getByRole('heading', { name: 'Out of tries. Here is the word.' }),
    ).toBeFocused()
    await expect(page.getByTestId('word-result')).toContainText('SWADHARMA')
    await expectNoHorizontalOverflow(page)

    await page.reload()
    await expect(page.getByTestId('word-game')).toHaveAttribute('data-status', 'lost')
  })

  test('a short guess shows a notice and is not submitted', async ({ page }) => {
    await open(page, 'prarthna')
    await typeWord(page, 'seva')
    await expect(
      page.getByRole('status').filter({ hasText: 'Not enough letters. The word has 8 letters.' }),
    ).toBeVisible()
    await page.keyboard.press('Backspace')
    const board = page.getByTestId('word-board')
    await expect(board.getByText('Guess 1, typing: S E V')).toBeAttached()
    await page.keyboard.type('1ગ!')
    await expect(board.getByText('Guess 1, typing: S E V')).toBeAttached()
  })

  test("practice: a win and a loss, never today's word, and nothing saved", async ({ page }) => {
    // Practice words are random; pin Math.random so the word is known (index 0 is skipped as today's word).
    await page.addInitScript(() => {
      Math.random = () => 0
    })
    await open(page, 'seva')
    const saved = await page.evaluate(() => localStorage.getItem('outreach.words.daily'))
    await page.getByRole('button', { name: 'Practice' }).click()
    await expect(page.getByTestId('word-game')).toHaveAttribute('data-mode', 'practice')
    await expect(page.getByText('This word has 9 letters')).toBeVisible()
    await typeWord(page, 'swadharma')
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()
    await expect(page.getByTestId('word-result')).toContainText('SWADHARMA')

    await page.getByRole('button', { name: 'Another practice word' }).click()
    for (let i = 0; i < 6; i++) await typeWord(page, wrong('swadharma'))
    await expect(
      page.getByRole('heading', { name: 'Out of tries. Here is the word.' }),
    ).toBeFocused()
    expect(await page.evaluate(() => localStorage.getItem('outreach.words.daily'))).toBe(saved)

    await page.getByRole('button', { name: "Today's word" }).click()
    await expect(page.getByText('This word has 4 letters')).toBeVisible()
  })

  test('shows meaning and reflection in Gujarati', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('outreach.lang', 'gu'))
    await open(page, 'prarthna')
    await typeWord(page, 'prarthna')
    const result = page.getByTestId('word-result')
    await expect(result).toContainText('PRARTHNA')
    await expect(result.locator('[lang=gu]').first()).toHaveText('પ્રાર્થના')
    await expect(result).toContainText('ભગવાન સાથે મનથી વાત કરવી.')
  })
})
