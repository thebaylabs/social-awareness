import { useI18n } from '../i18n/context'
import { BRAND_NAME, COPYRIGHT_HOLDER, ORGANISATION, TRANSLATION_REVIEWED } from '../config/site'
import styles from './Footer.module.css'

export function Footer() {
  const { t, l, lang } = useI18n()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {ORGANISATION.name ? (
          <p className={styles.org}>{l(ORGANISATION.name)}</p>
        ) : (
          <p className={styles.org} lang="en">
            {BRAND_NAME}
          </p>
        )}
        {ORGANISATION.contact && <p>{l(ORGANISATION.contact)}</p>}
        {!TRANSLATION_REVIEWED[lang] && (
          <p className={styles.note} data-testid="translation-note">
            {t('footer.translationNote')}
          </p>
        )}
        <p data-testid="copyright">
          © {new Date().getFullYear()} <span lang="en">{COPYRIGHT_HOLDER}</span>.{' '}
          {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
