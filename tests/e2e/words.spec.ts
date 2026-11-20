import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoAxeViolations, expectNoHorizontalOverflow } from './helpers'
import { fakeFirestore } from './fake-firestore'

const WORDS: string[] = (
  JSON.parse(readFileSync('content/words.json', 'utf8')) as { words: { word: string }[] }
).words.map((w) => w.word)

/** The local day number, as the game counts days. */
const dayOf = (x: Date) =>
  Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86_400_000)

/** A date (10 a.m. local) whose daily word is the given word: day number modulo list length. */
function dateFor(word: string): Date {
  const index = WORDS.indexOf(word)
  const d = new Date(2026, 10, 14, 10)
  while (dayOf(d) % WORDS.length !== index) d.setDate(d.getDate() + 1)
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
    // This build has no Firebase settings: no name is asked for, and the board says so.
    await expect(page.getByTestId('streak-board')).toContainText(
      'The leaderboard is not set up yet.',
    )
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()

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

/** The cookie that keeps a Shabd Khoj player's id and name. */
const COOKIE = 'outreach_words_player'
const PLAYER_ID = 'e2etestplayer0000001'

async function expectTapSize(controls: Locator[]) {
  for (const control of controls) {
    const box = await control.boundingBox()
    expect(box!.width, 'at least 44px wide').toBeGreaterThanOrEqual(44)
    expect(box!.height, 'at least 44px tall').toBeGreaterThanOrEqual(44)
  }
}

test.describe('streak leaderboard', () => {
  // A build with (made-up) Firebase settings; fakeFirestore() answers its requests.
  test.use({ baseURL: process.env.E2E_FIREBASE_URL })

  test('asks for a name on the first daily win, then shows the streak on the board', async ({
    page,
    context,
  }) => {
    const today = dayOf(dateFor('seva'))
    const firestore = await fakeFirestore(page, [
      { id: 'aaaaaaaaaaaaaaaaaaaa', name: 'Aarav', streak: 4, lastDay: today - 1 },
      { id: 'mmmmmmmmmmmmmmmmmmmm', name: 'Meera', streak: 2, lastDay: today },
      { id: 'oooooooooooooooooooo', name: 'Old', streak: 30, lastDay: today - 3 },
      { id: 'llllllllllllllllllll', name: 'Lost', streak: 0, lastDay: today },
    ])
    await open(page, 'seva')
    await typeWord(page, 'seva')

    const dialog = page.getByRole('dialog', { name: 'Join the streak leaderboard' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("You solved today's word!")
    const name = dialog.getByRole('textbox', { name: 'Your name' })
    await expect(name).toBeFocused()
    const save = dialog.getByRole('button', { name: 'Save name' })
    await expectTapSize([name, save, dialog.getByRole('button', { name: 'Not now' })])
    await expectNoHorizontalOverflow(page)
    await expectNoAxeViolations(page)

    // Keyboard only: the name rules apply, and focus stays in the field to fix it.
    await page.keyboard.type('Riya7')
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('alert')).toHaveText(
      'Use letters only, with no numbers or symbols.',
    )
    await expect(name).toBeFocused()
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Enter')

    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()
    const board = page.getByTestId('streak-board')
    await expect(board.getByRole('heading', { name: 'Longest streaks' })).toBeVisible()
    await expect(board.getByRole('listitem')).toHaveText([
      /Aarav: 4 days$/,
      /Meera: 2 days$/,
      /Riya: 1 day \(you\)$/,
    ])
    await expect(board).toContainText('Your streak: 1 day. Come back tomorrow to make it 2.')
    await expect(board).toContainText('Playing as Riya.')
    await expectTapSize([board.getByRole('button', { name: 'Change name' })])
    expect(firestore.writes).toEqual([{ name: 'Riya', streak: 1, lastDay: today }])

    const cookie = (await context.cookies()).find((c) => c.name === COOKIE)
    expect(cookie?.value).toMatch(/^[a-z0-9]{20}\.Riya$/)
    expect(cookie?.sameSite).toBe('Lax')
    expect(cookie!.expires * 1000 - Date.now()).toBeGreaterThan(399 * 86_400_000)
    expect(firestore.entries().map((e) => e.id)).toContain(cookie?.value.split('.')[0])
    await expectNoAxeViolations(page)
  })

  test('does not ask again once the cookie is set; the streak grows and the name can change', async ({
    page,
    context,
  }) => {
    const today = dayOf(dateFor('seva'))
    const firestore = await fakeFirestore(page, [
      { id: PLAYER_ID, name: 'Riya', streak: 3, lastDay: today - 1 },
      { id: 'aaaaaaaaaaaaaaaaaaaa', name: 'Aarav', streak: 9, lastDay: today },
    ])
    await context.addCookies([
      { name: COOKIE, value: `${PLAYER_ID}.Riya`, url: process.env.E2E_FIREBASE_URL! },
    ])
    await open(page, 'seva')
    await typeWord(page, 'seva')

    const heading = page.getByRole('heading', { name: 'You found the word!' })
    await expect(heading).toBeFocused()
    const board = page.getByTestId('streak-board')
    await expect(board.getByRole('listitem')).toHaveText([
      /Aarav: 9 days$/,
      /Riya: 4 days \(you\)$/,
    ])
    await expect(board).toContainText('Your streak: 4 days in a row.')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(heading).toBeFocused()
    expect(firestore.writes).toEqual([{ name: 'Riya', streak: 4, lastDay: today }])

    // Change the name with the keyboard; the streak stays.
    const change = board.getByRole('button', { name: 'Change name' })
    await change.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Change your name' })
    const name = dialog.getByRole('textbox', { name: 'Your name' })
    await expect(name).toBeFocused()
    await expect(name).toHaveValue('Riya')
    await name.fill('Riya Shah')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(change).toBeFocused()
    await expect(board.getByRole('listitem')).toHaveText([
      /Aarav: 9 days$/,
      /Riya Shah: 4 days \(you\)$/,
    ])
    expect(firestore.writes.at(-1)).toEqual({ name: 'Riya Shah', streak: 4, lastDay: today })
    const cookie = (await context.cookies()).find((c) => c.name === COOKIE)
    expect(cookie?.value).toBe(`${PLAYER_ID}.Riya%20Shah`)

    // A reload shows the same board and saves nothing new.
    await page.reload()
    await expect(page.getByTestId('streak-board').getByRole('listitem')).toHaveText([
      /Aarav: 9 days$/,
      /Riya Shah: 4 days \(you\)$/,
    ])
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(firestore.writes).toHaveLength(2)
    await expectNoAxeViolations(page)
  })

  test('practice wins never ask or count; Escape and "Not now" close the dialog', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      Math.random = () => 0
    })
    const firestore = await fakeFirestore(page)
    await open(page, 'seva')

    await page.getByRole('button', { name: 'Practice' }).click()
    await typeWord(page, 'swadharma')
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByTestId('streak-board')).toHaveCount(0)

    await page.getByRole('button', { name: "Today's word" }).click()
    await typeWord(page, 'seva')
    const dialog = page.getByRole('dialog', { name: 'Join the streak leaderboard' })
    await expect(dialog.getByRole('textbox', { name: 'Your name' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { name: 'You found the word!' })).toBeFocused()

    const board = page.getByTestId('streak-board')
    await expect(board).toContainText("No streaks yet. Solve today's word to start one.")
    await expect(board).toContainText('Add your name to appear on the leaderboard.')
    const add = board.getByRole('button', { name: 'Add your name' })
    await add.click()
    await expect(page.getByRole('dialog', { name: 'Join the streak leaderboard' })).toContainText(
      'Add your name to show your streak to everyone who plays.',
    )
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(add).toBeFocused()

    expect(firestore.writes).toEqual([])
    expect((await context.cookies()).find((c) => c.name === COOKIE)).toBeUndefined()
  })
})
