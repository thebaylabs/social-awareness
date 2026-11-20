import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PillGuide, type GuidePill } from './PillGuide'

const render = (offer: 'blue' | 'green', lean: GuidePill | null = null) =>
  renderToStaticMarkup(<PillGuide offer={offer} lean={lean} />)

describe('PillGuide', () => {
  it('is decorative: hidden from assistive technology, with nothing to tab to', () => {
    const html = render('blue')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('focusable="false"')
    expect(html).not.toContain('tabindex')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<a ')
  })

  it('holds a red pill and a blue pill at first', () => {
    const html = render('blue')
    expect(html).toContain('data-offer="blue"')
    expect(html).toContain('data-pill="red"')
    expect(html).toContain('data-pill="blue"')
    expect(html).not.toContain('data-pill="green"')
  })

  it('holds a red pill and a green pill once the blue one is gone', () => {
    const html = render('green')
    expect(html).toContain('data-offer="green"')
    expect(html).toContain('data-pill="red"')
    expect(html).toContain('data-pill="green"')
    expect(html).not.toContain('data-pill="blue"')
  })

  it('marks which hand is hovered or focused', () => {
    expect(render('blue')).not.toContain('data-lean')
    expect(render('blue', 'red')).toContain('data-lean="left"')
    expect(render('blue', 'blue')).toContain('data-lean="right"')
    expect(render('green', 'green')).toContain('data-lean="right"')
  })

  it('lays the pill buttons it is given over his palms', () => {
    const html = renderToStaticMarkup(
      <PillGuide
        offer="blue"
        lean={null}
        left={<button type="button">Red pill</button>}
        right={<button type="button">Blue pill</button>}
      />,
    )
    // The buttons sit outside the hidden drawing, so they stay in the tab order.
    expect(html).toMatch(/<\/svg><div[^>]*data-hand="left"[^>]*><button[^>]*>Red pill<\/button>/)
    expect(html).toMatch(/data-hand="right"[^>]*><button[^>]*>Blue pill<\/button>/)
    // Over the palms: 44 and 276 across the 320-wide drawing, 167 down from 14 (of 222).
    expect(html).toContain('left:13.75%;top:68.92%')
    expect(html).toContain('left:86.25%;top:68.92%')
  })

  it('carries no film imagery, quotes or character names', () => {
    for (const html of [render('blue'), render('green')]) {
      expect(html).not.toMatch(/matrix|morpheus|neo\b|trinity/i)
    }
  })
})
