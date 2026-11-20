import { useId } from 'react'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import type { LocalizedTextData, StoryNode } from '../../content/schemas'
import styles from './Story.module.css'

/** "How you got here": the choices taken on the way to a Yuvako ending, in order. */
export function PathRecap({ labels }: { labels: readonly LocalizedTextData[] }) {
  const { t, l, lang } = useI18n()
  if (labels.length === 0) return null
  return (
    <div className={styles.path}>
      <h3 className={styles.subheading}>{t('story.path.title')}</h3>
      <ol className={styles.pathList} data-testid="choices-taken">
        {labels.map((label, i) => (
          <li key={i} lang={localizedLang(label, lang)}>
            {l(label)}
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Every ending of a Yuvako scenario, with the ones found so far named and the
 * rest hidden. Found, not found and "this ending" are each shown with text and
 * a shape, never colour alone.
 */
export function EndingsFound({
  endings,
  found,
  current,
}: {
  endings: readonly StoryNode[]
  found: readonly string[]
  current: string
}) {
  const { t, l, lang } = useI18n()
  const id = useId()
  const count = endings.filter((ending) => found.includes(ending.id)).length
  return (
    <section className={styles.endings} aria-labelledby={id}>
      <h2 id={id} className={styles.endingsHeading}>
        {t('story.endings.title')}
        <span className="visually-hidden">: </span>
        <span className={styles.endingsCount}>
          {t('story.endings.count', { found: count, total: endings.length })}
        </span>
      </h2>
      <ul className={styles.badges}>
        {endings.map((ending, i) => {
          const isFound = found.includes(ending.id)
          const isCurrent = ending.id === current
          const title = ending.ending?.title
          return (
            <li
              key={ending.id}
              className={styles.badge}
              data-found={isFound || undefined}
              data-current={isCurrent || undefined}
            >
              <span className={styles.badgeMark} aria-hidden="true">
                {isFound && <Icon name="check" size={18} />}
              </span>
              <span className={styles.badgeText}>
                {isFound ? (
                  <span lang={title ? localizedLang(title, lang) : undefined}>
                    {title ? l(title) : t('story.endings.unnamed', { n: i + 1 })}
                  </span>
                ) : (
                  <span>{t('story.endings.hidden')}</span>
                )}
                {isCurrent && (
                  <>
                    <span className="visually-hidden">, </span>
                    <span className={styles.badgeNote}>{t('story.endings.this')}</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {count === endings.length && <p className={styles.allFound}>{t('story.endings.all')}</p>}
    </section>
  )
}
