import { expect, test } from '@playwright/test'

test.describe('story player', () => {
  test('plays a Bhulkao story to two different endings, with Back and restart', async ({
    page,
  }) => {
    await page.goto('/bhulkao/scenario/homework-time')
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
    await page.getByRole('button', { name: 'Ask your friend to do homework with you' }).click()
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

  test("links to Bhulkao's earlier story address still open the scenario", async ({ page }) => {
    await page.goto('/bhulkao/story/homework-time')
    await expect(page).toHaveURL(/\/bhulkao\/scenario\/homework-time$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Homework Time')
    await page.goto('/bhulkao/story')
    await expect(page).toHaveURL(/\/scenario$/)
  })

  test('a Bhulkao story ending has no choice recap or endings count, but counts towards the lesson', async ({
    page,
  }) => {
    await page.goto('/bhulkao/scenario/homework-time')
    await page.getByRole('button', { name: 'Play the game now' }).click()
    await page.getByRole('button', { name: 'Keep playing' }).click()
    await page.getByRole('button', { name: 'Play until bedtime' }).click()
    await expect(page.getByRole('heading', { name: 'How it ends' })).toBeFocused()
    await expect(page.getByTestId('choices-taken')).toHaveCount(0)
    await expect(page.getByRole('region', { name: /^Endings found/ })).toHaveCount(0)
    const shared = page.getByRole('region', { name: /^The lesson they share/ })
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*1 of 3 finished$/)
    await expect(shared.getByRole('listitem')).toHaveText([
      'Homework Time, Finished',
      '1 a.m., Exam Tomorrow, Not finished yet',
      'The Group Chat Joke, Not finished yet',
      'The Extra Change, Not finished yet',
    ])
    await expect(
      shared.getByRole('link', { name: /^Next scenario\s*:\s*1 a\.m\., Exam Tomorrow$/ }),
    ).toBeVisible()
  })

  test('the four scenarios share a lesson, revealed after an ending in any three', async ({
    page,
  }) => {
    const shared = page.getByRole('region', { name: /^The lesson they share/ })
    const ticks = page.getByTestId('lesson-counter').locator('[data-filled]')
    const picture = (name: RegExp) => page.getByTestId('story-node').getByRole('img', { name })
    const cards = page.getByRole('main').getByRole('list').first().getByRole('link')

    await page.goto('/scenario')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Activities')
    // The scenarios and their lesson are no longer marked as placeholder.
    await expect(page.getByRole('main')).not.toContainText('Placeholder')
    await expect(cards).toHaveText([
      /^Homework Time\s*Curated for Kids\s*Not finished yet/,
      /^1 a\.m\., Exam Tomorrow\s*Not finished yet/,
      /^The Group Chat Joke\s*Not finished yet/,
      /^The Extra Change\s*Not finished yet/,
    ])
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*0 of 3 finished$/)
    await expect(shared).toContainText('Finish any 3 of the 4 scenarios to reveal the lesson')
    // The counter: three markers, none ticked yet.
    await expect(page.getByTestId('lesson-counter').locator('span')).toHaveCount(3)
    await expect(ticks).toHaveCount(0)
    await expect(shared.getByRole('button')).toHaveCount(0)

    // 1. The 1 a.m. exam.
    await page.getByRole('link', { name: /^1 a\.m\., Exam Tomorrow/ }).click()
    await expect(page.getByTestId('placeholder-notice')).toHaveCount(0)
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await page.getByRole('button', { name: 'Sit quietly and take ten slow breaths' }).click()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*1 of 3 finished$/)
    await expect(ticks).toHaveCount(1)
    await expect(shared.getByRole('listitem')).toHaveText([
      'Homework Time, Not finished yet',
      '1 a.m., Exam Tomorrow, Finished',
      'The Group Chat Joke, Not finished yet',
      'The Extra Change, Not finished yet',
    ])

    // 2. The group chat joke, sent at once and apologised for later.
    await shared.getByRole('link', { name: /^Next scenario\s*:\s*The Group Chat Joke$/ }).click()
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
    await expect(ticks).toHaveCount(2)

    // 3. The extra change, kept at first and then taken back.
    await shared.getByRole('link', { name: /^Next scenario\s*:\s*The Extra Change$/ }).click()
    await expect(page).toHaveURL(/\/yuvako\/scenario\/extra-change$/)
    await expect(picture(/hands over a fan of notes/)).toBeVisible()
    await page.getByRole('button', { name: 'Walk out quickly' }).click()
    await page.getByRole('button', { name: 'Turn around and go back in' }).click()
    await expect(page.getByRole('heading', { name: /^How it ends\s*:\s*Came back$/ })).toBeFocused()
    // Three of the four are enough; Homework Time is still not finished.
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(ticks).toHaveCount(3)
    await expect(shared.getByRole('listitem').first()).toHaveText('Homework Time, Not finished yet')
    await expect(shared).toContainText('You have finished 3 scenarios.')
    await expect(shared.getByRole('link', { name: /^Next scenario/ })).toHaveCount(0)

    await shared.getByRole('button', { name: 'Reveal the lesson' }).click()
    await expect(
      shared.getByRole('heading', { level: 3, name: 'Pause, and remember what matters' }),
    ).toBeFocused()
    await expect(shared.getByRole('img', { name: /glowing pause sign/ })).toBeVisible()
    await expect(shared.getByRole('heading', { level: 4 })).toHaveText([
      'Focus',
      'Atmiyata',
      'Seva',
    ])
    await expect(shared).toContainText('it is never too late to turn back')
    await expect(shared.getByRole('button', { name: 'Reveal the lesson' })).toHaveCount(0)
    await expect(page.getByRole('main')).not.toContainText('Placeholder')

    // The list shows the three as finished, and the lesson stays revealed.
    await page.goto('/scenario')
    await expect(cards).toHaveText([
      /^Homework Time\s*Curated for Kids\s*Not finished yet/,
      /Finished · 1 of 3 endings found/,
      /Finished · 1 of 3 endings found/,
      /Finished · 1 of 3 endings found/,
    ])
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(
      shared.getByRole('heading', { name: 'Pause, and remember what matters' }),
    ).toBeVisible()
    await expect(shared.getByRole('button')).toHaveCount(0)

    // Finishing the fourth changes nothing: the counter stops at three.
    await page.getByRole('link', { name: /^Homework Time/ }).click()
    await page.getByRole('button', { name: 'Finish homework first' }).click()
    await page.getByRole('button', { name: 'Ask your friend to do homework with you' }).click()
    await page.getByRole('button', { name: 'After homework, play outside' }).click()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(ticks).toHaveCount(3)
    await expect(shared.getByRole('listitem').first()).toHaveText('Homework Time, Finished')
    await expect(
      shared.getByRole('heading', { name: 'Pause, and remember what matters' }),
    ).toBeVisible()
  })

  test('the best ending of a Yuvako scenario plays fireworks with a short message', async ({
    page,
    browser,
  }) => {
    const best = page.getByTestId('best-outcome')
    const fireworks = page.getByTestId('fireworks')

    // A good ending reached the long way round is not the best one.
    await page.goto('/yuvako/scenario/one-am-exam')
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await page.getByRole('button', { name: 'Check it one last time' }).click()
    await page.getByRole('button', { name: 'Stop, even though sleep feels far away' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Late, but stopped$/ }),
    ).toBeFocused()
    await expect(best).toHaveCount(0)
    await expect(fireworks).toHaveCount(0)

    // Every right choice: the message, and a short show that ends by itself.
    await page.goto('/yuvako/scenario/one-am-exam')
    await page.getByRole('button', { name: 'Put the phone away now' }).click()
    await expect(best).toHaveCount(0)
    await page.getByRole('button', { name: 'Sit quietly and take ten slow breaths' }).click()
    await expect(
      page.getByRole('heading', { name: /^How it ends\s*:\s*Clear head$/ }),
    ).toBeFocused()
    await expect(best).toHaveText('You made all the right choices and reached the best outcome.')
    await expect(fireworks).toHaveCount(1)
    await expect(fireworks).toHaveCount(0, { timeout: 15_000 })
    await expect(best).toBeVisible()

    // With reduced motion: the message alone.
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const still = await context.newPage()
    await still.goto('/yuvako/scenario/extra-change')
    await still.getByRole('button', { name: 'Stop and count it again' }).click()
    await still.getByRole('button', { name: 'Hand the ₹500 back to the shopkeeper' }).click()
    await expect(still.getByTestId('best-outcome')).toBeVisible()
    await expect(still.getByTestId('fireworks')).toHaveCount(0)
    await context.close()
  })

  test('the kids scenario can be one of the three that reveal the lesson', async ({ page }) => {
    // Two scenarios already finished in this tab, Homework Time among them.
    await page.addInitScript(() => {
      if (sessionStorage.getItem('outreach.scenario.endings')) return
      sessionStorage.setItem(
        'outreach.scenario.endings',
        JSON.stringify({ 'homework-time': ['outside'], 'one-am-exam': ['calm'] }),
      )
    })
    const shared = page.getByRole('region', { name: /^The lesson they share/ })
    await page.goto('/scenario')
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*2 of 3 finished$/)
    await expect(page.getByRole('main').getByRole('list').first().getByRole('link')).toHaveText([
      /^Homework Time\s*Curated for Kids\s*Finished · 1 of 8 endings found/,
      /Finished · 1 of 3 endings found/,
      /Not finished yet/,
      /Not finished yet/,
    ])

    await page.goto('/yuvako/scenario/extra-change')
    await page.getByRole('button', { name: 'Stop and count it again' }).click()
    await page.getByRole('button', { name: 'Hand the ₹500 back to the shopkeeper' }).click()
    await expect(shared).toHaveAccessibleName(/^The lesson they share\s*:\s*3 of 3 finished$/)
    await expect(shared.getByRole('listitem')).toHaveText([
      'Homework Time, Finished',
      '1 a.m., Exam Tomorrow, Finished',
      'The Group Chat Joke, Not finished yet',
      'The Extra Change, Finished',
    ])
    await shared.getByRole('button', { name: 'Reveal the lesson' }).click()
    await expect(
      shared.getByRole('heading', { level: 3, name: 'Pause, and remember what matters' }),
    ).toBeFocused()
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
    await page.goto('/scenario')
    const shared = page.getByRole('region', { name: /^સહિયારો બોધ\s*:\s*3માંથી 3 પૂરી$/ })
    await expect(shared).toContainText('તમે 3 પરિસ્થિતિ પૂરી કરી છે.')
    await shared.getByRole('button', { name: 'બોધ જુઓ' }).click()
    await expect(
      shared.getByRole('heading', { level: 3, name: 'થોભો, અને યાદ રાખો કે શું મહત્ત્વનું છે' }),
    ).toBeFocused()
    await expect(shared.getByRole('heading', { level: 4 })).toHaveText([
      'એકાગ્રતા',
      'આત્મીયતા',
      'સેવા',
    ])
  })

  test('shows the scenario in Gujarati', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'ગુજરાતી' }).click()
    await page.goto('/yuvako/scenario/one-am-exam')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('રાતનો એક વાગ્યો, કાલે પરીક્ષા')
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
    await page.goto('/yuvako/prasang/einstein-prayer')
    await expect(page.getByTestId('placeholder-notice')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Einstein's Prayer")
    await expect(page.getByTestId('prasang-video')).toBeVisible()
    const subs = page.getByTestId('prasang-subs-toggle')
    await expect(subs).toHaveAttribute('aria-pressed', 'false')
    await expect(subs).toHaveAccessibleName('CC subtitles off')
    await subs.click()
    await expect(subs).toHaveAttribute('aria-pressed', 'true')
    await expect(subs).toHaveAccessibleName('CC subtitles on')
    const lesson = page.getByRole('complementary', { name: 'Reflect' })
    await lesson.scrollIntoViewIfNeeded()
    await expect(lesson).toBeVisible()
    await expect(lesson).toContainText('Atmiyata')
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
  // The Yuvako games, scenarios and prasang are all final, so no part carries a badge.
  await expect(page.getByRole('link', { name: /Prasang/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Prasang.*Placeholder/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Games/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Games.*Placeholder/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Activities/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Activities.*Placeholder/ })).toHaveCount(0)
  await page.goto('/activity')
  await expect(page.getByRole('link', { name: /Wordle/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Temple Run/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Placeholder/ })).toHaveCount(0)
})
