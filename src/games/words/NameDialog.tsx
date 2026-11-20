import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useI18n } from '../../i18n/context'
import type { MessageKey } from '../../i18n/messages'
import { focusElement } from '../../components/focus'
import { MAX_NAME_LENGTH, checkName, type NameProblem } from '../doodle/name'
import styles from './StreakBoard.module.css'

/** "ask": right after a first daily win. "join": from the board's button. "change": a new name. */
export type NameDialogMode = 'ask' | 'join' | 'change'

const NAME_PROBLEMS: Record<NameProblem, MessageKey> = {
  empty: 'words.name.error.empty',
  tooLong: 'words.name.error.tooLong',
  characters: 'words.name.error.characters',
  blocked: 'words.name.error.blocked',
}

const INTRO: Record<NameDialogMode, MessageKey> = {
  ask: 'words.name.intro',
  join: 'words.name.introJoin',
  change: 'words.name.introChange',
}

/**
 * Asks for the player's leaderboard name in a modal dialog. Render it to open
 * it; it calls onClose when it closes (Save, the cancel button or Escape).
 * Focus moves to the name field, and back to `returnFocus` (or to whatever
 * had focus before) when it closes.
 */
export function NameDialog({
  mode,
  initialName,
  returnFocus,
  onSave,
  onClose,
}: {
  mode: NameDialogMode
  initialName: string
  returnFocus?: RefObject<HTMLElement | null>
  onSave: (name: string) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const [draft, setDraft] = useState(initialName)
  const [problem, setProblem] = useState<NameProblem | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const active = document.activeElement
    const back = returnFocus?.current ?? (active instanceof HTMLElement ? active : null)
    if (dialog && !dialog.open) dialog.showModal()
    inputRef.current?.focus()
    return () => {
      if (dialog?.open) dialog.close()
      if (back?.isConnected) focusElement(back)
    }
  }, [returnFocus])

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const check = checkName(draft)
    if (!check.ok) {
      setProblem(check.problem)
      inputRef.current?.focus()
      return
    }
    onSave(check.name)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onClose={() => {
        // A close event for a dialog that is open again is stale (React re-runs effects in development).
        if (!dialogRef.current?.open) onClose()
      }}
      data-testid="word-name-dialog"
    >
      <form onSubmit={save} noValidate>
        <h2 id={`${id}-title`} className={styles.dialogTitle}>
          {t(mode === 'change' ? 'words.name.titleChange' : 'words.name.title')}
        </h2>
        <p id={`${id}-intro`}>{t(INTRO[mode])}</p>
        <label htmlFor={`${id}-name`} className={styles.label}>
          {t('words.name.label')}
        </label>
        <input
          id={`${id}-name`}
          ref={inputRef}
          className={styles.input}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setProblem(null)
          }}
          maxLength={MAX_NAME_LENGTH * 4}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={problem !== null}
          aria-describedby={`${id}-hint${problem ? ` ${id}-error` : ''}`}
        />
        <p id={`${id}-hint`} className={styles.hint}>
          {t('words.name.hint')}
        </p>
        {problem && (
          <p id={`${id}-error`} className={styles.error} role="alert">
            {t(NAME_PROBLEMS[problem])}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" className={styles.save}>
            {t('words.name.save')}
          </button>
          <button type="button" className={styles.cancel} onClick={() => onClose()}>
            {t(mode === 'change' ? 'words.name.cancelChange' : 'words.name.cancel')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
