import { expect, test } from '@playwright/test'

test.describe('story player', () => {
  test('plays a Bhulkao story to two different endings, with Back and restart', async ({
    page,
  }) => {
    await page.goto('/bhulkao/story')
    await expect(page).toHaveURL(/\/bhulkao\/story\/homework-time$/)
    await expect(page.getByTestId('placeholder-notice')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Homework Time')
    await expect(page.getByRole('heading', { name: 'Step 1' })).toBeVisible()

    await page.getByRole('button', { name: 'Play the game now' }).click()
    await expect(page.getByRole('heading', { name: 'Step 2' })).toBeFocused()
    await page.getByRole('button', { name: 'Keep playing' }).click()
    await expect(page.getByRole('heading', { name: 'Step 3' })).toBeFocused()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()
    await expect(page.getByRole('heading', { name: 'How it ends' })).toBeFocused()
    await expect(page.getByText('Your homework is not finished.')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'What we learn' })).toContainText(
      'A game can wait',
    )

    // Back undoes one choice.
    await page.getByRole('button', { name: 'Back one step' }).click()
    await expect(page.getByRole('heading', { name: 'Step 3' })).toBeVisible()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()

    await page.getByRole('button', { name: 'Try a different choice' }).click()
    await expect(page.getByRole('heading', { name: 'Step 1' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish homework first' }).click()
    await page.getByRole('button', { name: 'Ask Mira to do homework with you' }).click()
    await page.getByRole('button', { name: 'After homework, play outside' }).click()
    await expect(page.getByText('You both finish early')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'What we learn' })).toContainText(
      'Good friends help each other',
    )
  })

  test('plays a Yuvako scenario by keyboard alone', async ({ page }) => {
    await page.goto('/yuvako/scenario/one-am-exam')
    const first = page.getByRole('button', { name: 'Put the phone away now' })
    await first.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Step 2' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Sit quietly and take ten slow breaths' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'How it ends' })).toBeFocused()
    await expect(page.getByRole('complementary', { name: 'Think about it' })).toBeVisible()
  })

  test('a Yuvako ending names itself, recaps the choices and counts the endings found', async ({
    page,
  }) => {
    const picture = (name: RegExp) => page.getByTestId('story-node').getByRole('img', { name })
    const endings = page.getByRole('region', { name: /^Endings found/ })

    await page.goto('/yuvako/scenario/one-am-exam')
    await expect(picture(/clock showing 1:00/)).toBeVisible()
    await page.getByRole('button', { name: 'Watch one more video' }).click()
    await expect(picture(/2:00 by the clock/)).toBeVisible()
    await page.getByRole('button', { name: 'Keep scrolling until you feel sleepy' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Groggy morning$/ }),
    ).toBeFocused()
    await expect(picture(/clock shows 4:00/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How you got here' })).toBeVisible()
    await expect(page.getByTestId('choices-taken').getByRole('listitem')).toHaveText([
      'Watch one more video',
      'Keep scrolling until you feel sleepy',
    ])
    await expect(endings).toHaveAccessibleName(/^Endings found\s*:\s*1 of 3$/)
    await expect(endings.getByRole('listitem')).toHaveText([
      'Groggy morning, This ending',
      'Not found yet',
      'Not found yet',
    ])
    await expect(endings).not.toContainText('You have found every ending.')

    await page.getByRole('button', { name: 'Try a different choice' }).click()
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await expect(picture(/phone charges on a shelf/)).toBeVisible()
    await page.getByRole('button', { name: 'Sit quietly and take ten slow breaths' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Clear head$/ }),
    ).toBeFocused()
    await expect(picture(/eyes closed, breathing slowly/)).toBeVisible()
    await expect(endings).toHaveAccessibleName(/^Endings found\s*:\s*2 of 3$/)
    await expect(endings.getByRole('listitem')).toHaveText([
      'Groggy morning',
      'Not found yet',
      'Clear head, This ending',
    ])

    // The count lasts for the browser tab, so it survives a reload.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Step 1' })).toBeVisible()
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await page.getByRole('button', { name: 'Check it one last time' }).click()
    await page.getByRole('button', { name: 'Stop, even though sleep feels far away' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Late, but stopped$/ }),
    ).toBeFocused()
    await expect(picture(/phone sits on a table in the next room/)).toBeVisible()
    await expect(page.getByTestId('choices-taken').getByRole('listitem')).toHaveText([
      'Put the phone away now',
      'Check it one last time',
      'Stop, even though sleep feels far away',
    ])
    await expect(endings).toHaveAccessibleName(/^Endings found\s*:\s*3 of 3$/)
    await expect(endings).toContainText('You have found every ending.')
  })

  test('a Bhulkao story ending has no choice recap or endings count', async ({ page }) => {
    await page.goto('/bhulkao/story/homework-time')
    await page.getByRole('button', { name: 'Play the game now' }).click()
    await page.getByRole('button', { name: 'Keep playing' }).click()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()
    await expect(page.getByRole('heading', { name: 'How it ends' })).toBeFocused()
    await expect(page.getByTestId('choices-taken')).toHaveCount(0)
    await expect(page.getByRole('region', { name: /^Endings found/ })).toHaveCount(0)
  })

  test('shows the scenario in Gujarati', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await page.goto('/yuvako/scenario/one-am-exam')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'કામચલાઉ: રાતનો એક વાગ્યો, કાલે પરીક્ષા',
    )
    await page.getByRole('button', { name: 'હમણાં જ ફોન બાજુ પર મૂકો' }).click()
    await page.getByRole('button', { name: 'શાંતિથી બેસો અને દસ ધીમા શ્વાસ લો' }).click()
    await expect(page.getByRole('heading', { name: /^અંતે શું થયું\s*:\s*સ્પષ્ટ મન$/ })).toBeFocused()
    await expect(page.getByRole('heading', { name: 'તમે અહીં કેવી રીતે પહોંચ્યા' })).toBeVisible()
    await expect(page.getByRole('region', { name: /^મળેલા અંત\s*:\s*3માંથી 1$/ })).toContainText(
      'આ અંત',
    )
  })
})

test.describe('prasang reader', () => {
  test('reads a Yuvako prasang to its lesson box', async ({ page }) => {
    await page.goto('/yuvako/prasang')
    await expect(page).toHaveURL(/\/yuvako\/prasang\/lamp-by-the-window$/)
    await expect(page.getByTestId('placeholder-notice')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Placeholder: The Lamp by the Window',
    )
    await expect(page.getByRole('img', { name: /oil lamp flickering/ })).toBeVisible()
    const lesson = page.getByRole('complementary', { name: 'Reflect' })
    await lesson.scrollIntoViewIfNeeded()
    await expect(lesson).toBeVisible()
    await expect(lesson).toContainText('which open windows')
  })

  test('a Bhulkao film prasang has play and music controls', async ({ page }) => {
    await page.goto('/bhulkao/prasang/sparrows-and-the-sea')
    await expect(page.getByTestId('placeholder-notice')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Sparrows and the Sea')
    await expect(
      page.getByRole('img', { name: /mother sparrow shelters three chicks/i }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous page' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next page' })).toHaveCount(0)
    const music = page.getByRole('button', { name: /Music on|Music off/ })
    await expect(music).toBeVisible()
    await expect(page.getByRole('button', { name: 'Music on' })).toBeVisible()
    await music.click()
    await expect(page.getByRole('button', { name: 'Music off' })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Film position' })).toBeVisible()
    const play = page.getByRole('button', { name: /Play|Pause|Play again|Tap to start/ }).first()
    await play.click()
    await expect(page.getByRole('button', { name: /Play|Pause|Play again/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ચકલીઓ અને સમુદ્ર')
  })
})

test('placeholder content is marked unmistakably', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('preview-strip')).toHaveCount(0)
  await expect(page.getByTestId('placeholder-notice')).toHaveCount(0)
  await page.goto('/yuvako')
  await expect(page.getByRole('link', { name: /Scenario.*Placeholder/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Prasang.*Placeholder/ })).toBeVisible()
  // Both Yuvako games are final, so Activity and its game cards carry no badge.
  await expect(page.getByRole('link', { name: /Activity/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Activity.*Placeholder/ })).toHaveCount(0)
  await page.goto('/yuvako/activity')
  await expect(page.getByRole('link', { name: /Shabd Khoj/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Placeholder/ })).toHaveCount(0)
})
