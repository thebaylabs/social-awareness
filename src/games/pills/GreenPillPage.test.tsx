import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nProvider } from '../../i18n/I18nProvider'
import { PILLS } from '../../content/games'
import { GreenPillPage } from './GreenPillPage'

const greens = PILLS.data?.green.pages ?? []

describe('GreenPillPage', () => {
  it.each(greens.map((_, i) => i))('page %i shows its parts and numbered references', (i) => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <GreenPillPage data={greens[i]!} />
      </I18nProvider>,
    )
    expect(html).toContain('<h3')
    expect(html).toContain('What you can do')
    expect(html).toContain('Why it helps')
    expect(html).toContain('References')
    expect(html).toContain('[1]')
    expect(html).toContain('[Online]. Available:')
    expect(html).toContain('role="img"')
  })
})
