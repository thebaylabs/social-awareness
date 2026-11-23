import styles from './Toran.module.css'

/** A marigold toran: marigolds, mango leaves and jasmine strings, repeated across the width. Decorative. */
export function Toran({ className }: { className?: string }) {
  return <div className={[styles.toran, className].filter(Boolean).join(' ')} aria-hidden="true" />
}
