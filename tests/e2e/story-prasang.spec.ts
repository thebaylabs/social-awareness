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
    await expect(page.getByTestId('shared-lesson')).toHaveCount(0)
  })

  test('the three Yuvako scenarios share a lesson, revealed after an ending in each', async ({
    page,
  }) => {
    const shared = page.getByRole('region', { name: /^The lesson they share/ })
    const picture = (name: RegExp) => page.getByTestId('story-node').getByRole('img', { name })
    const cards = page.getByRole('main').getByRole('list').first().getByRole('link')

    await page.goto('/yuvako/scenario')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scenarios')
    await expect(cards).toHaveText([
      /^Placeholder: 1 a\.m\., Exam Tomorrow\s*Not finished yet/,
      /^Placeholder: The Group Chat Joke\s*Not finished yet/,
      /^Placeholder: The Extra Change\s*Not finished yet/,
    ])
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*0 of 3 finished$/)
    await expect(shared).toContainText('Reach an ending in every scenario')
    await expect(shared.getByRole('button')).toHaveCount(0)

    // 1. The 1 a.m. exam.
    await cards.first().click()
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await page.getByRole('button', { name: 'Sit quietly and take ten slow breaths' }).click()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*1 of 3 finished$/)
    await expect(shared.getByRole('listitem')).toHaveText([
      'Placeholder: 1 a.m., Exam Tomorrow, Finished',
      'Placeholder: The Group Chat Joke, Not finished yet',
      'Placeholder: The Extra Change, Not finished yet',
    ])

    // 2. The group chat joke, sent at once and apologised for later.
    await shared
      .getByRole('link', { name: /^Next scenario\s*:\s*Placeholder: The Group Chat Joke$/ })
      .click()
    await expect(page).toHaveURL(/\/yuvako\/scenario\/group-chat-joke$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(picture(/laughing faces/)).toBeVisible()
    await page.getByRole('button', { name: 'Send it now' }).click()
    await expect(picture(/someone has left the group/)).toBeVisible()
    await page.getByRole('button', { name: 'Message him privately to say sorry' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Sorry, said late$/ }),
    ).toBeFocused()
    await expect(picture(/an hour has passed/)).toBeVisible()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*2 of 3 finished$/)

    // 3. The extra change, kept at first and then taken back.
    await shared
      .getByRole('link', { name: /^Next scenario\s*:\s*Placeholder: The Extra Change$/ })
      .click()
    await expect(page).toHaveURL(/\/yuvako\/scenario\/extra-change$/)
    await expect(picture(/hands over a fan of notes/)).toBeVisible()
    await page.getByRole('button', { name: 'Walk out quickly' }).click()
    await page.getByRole('button', { name: 'Turn around and go back in' }).click()
    await expect(page.getByRole('heading', { name: /^How it ends\s*:\s*Came back$/ })).toBeFocused()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(shared).toContainText('You have reached an ending in every scenario.')
    await expect(shared.getByRole('link', { name: /^Next scenario/ })).toHaveCount(0)

    await shared.getByRole('button', { name: 'Reveal the lesson' }).click()
    await expect(
      shared.getByRole('heading', { level: 3, name: 'Stop. Think. Then choose.' }),
    ).toBeFocused()
    await expect(shared.getByRole('img', { name: /glowing pause sign/ })).toBeVisible()
    await expect(shared).toContainText('stopping late is still stopping')
    await expect(shared.getByRole('button', { name: 'Reveal the lesson' })).toHaveCount(0)

    // The list shows each scenario as finished, and the lesson stays revealed.
    await page.goto('/yuvako/scenario')
    await expect(cards).toHaveText([
      /Finished · 1 of 3 endings found/,
      /Finished · 1 of 3 endings found/,
      /Finished · 1 of 3 endings found/,
    ])
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(shared.getByRole('heading', { name: 'Stop. Think. Then choose.' })).toBeVisible()
    await expect(shared.getByRole('button')).toHaveCount(0)
  })

  test('reveals the shared lesson in Gujarati', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('outreach.lang', 'gu')
      sessionStorage.setItem(
        'outreach.scenario.endings',
        JSON.stringify({
          'one-am-exam': ['groggy'],
          'group-chat-joke': ['straight'],
          'extra-change': ['light'],
        }),
      )
    })
    await page.goto('/yuvako/scenario')
    const shared = page.getByRole('region', { name: /^સહિયારો બોધ\s*:\s*3માંથી 3 પૂરી$/ })
    await expect(shared).toContainText('તમે દરેક પરિસ્થિતિમાં એક અંત સુધી પહોંચી ગયા છો.')
    await shared.getByRole('button', { name: 'બોધ જુઓ' }).click()
    await expect(
      shared.getByRole('heading', { level: 3, name: 'થોભો. વિચારો. પછી પસંદ કરો.' }),
    ).toBeFocused()
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
