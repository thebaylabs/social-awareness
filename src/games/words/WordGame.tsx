import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import { ContentError } from '../../components/ContentError'
import { PlaceholderNotice } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { WORDS } from '../../content/games'
import type { WordEntry } from '../../content/schemas'
import {
  MAX_GUESSES,
  boardReducer,
  dailyIndex,
  keyboardMarks,
  localDayNumber,
  newBoard,
  practiceIndex,
  scoreGuess,
  statusOf,
  type Mark,
} from './logic'
import { loadDaily, saveDaily } from './storage'
import { newPlayerId, readPlayer, savePlayer, type Player } from './player'
import { streakBoardAvailable } from './streakBoard'
import { StreakPanel } from './StreakPanel'
import { NameDialog, type NameDialogMode } from './NameDialog'
import { Tile } from './Tile'
import { MARK_ICON } from './marks'
import styles from './WordGame.module.css'

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
type Mode = 'daily' | 'practice'

function useMarkText() {
  const { t } = useI18n()
  return (mark: Mark) =>
    t(
      mark === 'correct'
        ? 'words.mark.correct'
        : mark === 'present'
          ? 'words.mark.present'
          : 'words.mark.absent',
    )
}

function NativeForms({ entry }: { entry: WordEntry }) {
  const { lang } = useI18n()
  const native = entry.native ?? {}
  const shown = lang === 'en' ? (['gu'] as const) : ([lang] as const)
  return (
    <>
      {shown.map((code) =>
        native[code] ? (
          <span key={code} lang={code} className={styles.native}>
            {native[code]}
          </span>
        ) : null,
      )}
    </>
  )
}

export function WordGameView({ words }: { words: WordEntry[] }) {
  const { t, l, lang } = useI18n()
  const markText = useMarkText()
  const today = useMemo(() => new Date(), [])
  const day = localDayNumber(today)
  const daily = words[dailyIndex(today, words.length)] as WordEntry

  const [mode, setMode] = useState<Mode>('daily')
  const [entry, setEntry] = useState<WordEntry>(daily)
  const [board, dispatch] = useReducer(boardReducer, null, () =>
    newBoard(daily.word, loadDaily(day, daily.word) ?? []),
  )
  const [announcement, setAnnouncement] = useState('')
  const [player, setPlayer] = useState<Player | null>(readPlayer)
  const [nameDialog, setNameDialog] = useState<NameDialogMode | null>(null)
  const status = statusOf(board.guesses, board.answer)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const boardRef = useRef<HTMLOListElement>(null)
  const previousStatus = useRef(status)

  // The day's guesses are kept so that a reload restores the board. Practice is never saved.
  useEffect(() => {
    if (mode === 'daily' && board.guesses.length > 0) saveDaily(day, daily.word, board.guesses)
  }, [mode, day, daily.word, board.guesses])

  // The name cookie is renewed on every visit, so it stays for as long as the player keeps coming back.
  useEffect(() => {
    if (player) savePlayer(player)
  }, [player])

  // When a game finishes, move focus to the result heading.
  useEffect(() => {
    if (previousStatus.current === 'playing' && status !== 'playing')
      focusElement(resultRef.current)
    previousStatus.current = status
  }, [status])

  const describeRow = useCallback(
    (guess: string, n: number) =>
      t('words.row', {
        n,
        letters: scoreGuess(guess, board.answer)
          .map((mark, i) =>
            t('words.letterMark', {
              letter: (guess[i] as string).toUpperCase(),
              mark: markText(mark),
            }),
          )
          .join(', '),
      }),
    [t, board.answer, markText],
  )

  const letter = useCallback((key: string) => dispatch({ type: 'letter', letter: key }), [])
  const backspace = useCallback(() => dispatch({ type: 'backspace' }), [])
  const submit = useCallback(() => {
    if (status !== 'playing') return
    if (board.typed.length === board.answer.length) {
      setAnnouncement(describeRow(board.typed, board.guesses.length + 1))
      // A first daily win asks for a name for the streak leaderboard (never again once one is saved).
      if (mode === 'daily' && board.typed === board.answer && !player && streakBoardAvailable()) {
        setNameDialog('ask')
      }
    } else {
      setAnnouncement(t('words.tooShort', { n: board.answer.length }))
    }
    dispatch({ type: 'submit' })
  }, [status, board, describeRow, t, mode, player])

  // Physical keyboard: letters, Enter and Backspace.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      // Typing in the name dialog (or any text field) is not a guess.
      if (target?.closest('dialog, input, textarea, select')) return
      const onControl = !!target?.closest('button, a, summary')
      if (event.key === 'Enter') {
        if (onControl) return // let the focused button do its own job
        event.preventDefault()
        submit()
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        // Typing moves focus off any button (such as a mode button) onto the board,
        // so the next Enter submits the guess instead of pressing that button again.
        if (onControl) focusElement(boardRef.current)
        letter(event.key.toLowerCase())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit, backspace, letter])

  const startDaily = () => {
    setMode('daily')
    setEntry(daily)
    setAnnouncement('')
    dispatch({ type: 'load', answer: daily.word, guesses: loadDaily(day, daily.word) ?? [] })
  }
  const startPractice = () => {
    const next = words[practiceIndex(today, words.length, Math.random)] as WordEntry
    setMode('practice')
    setEntry(next)
    setAnnouncement('')
    dispatch({ type: 'load', answer: next.word, guesses: [] })
  }

  const keyMarks = keyboardMarks(board.guesses, board.answer)
  const cols = board.answer.length
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => i)

  return (
    <div className={styles.game} data-testid="word-game" data-status={status} data-mode={mode}>
      <div className={styles.modes} role="group" aria-label={t('words.mode.label')}>
        <button type="button" aria-pressed={mode === 'daily'} onClick={startDaily}>
          {t('words.mode.daily')}
        </button>
        <button type="button" aria-pressed={mode === 'practice'} onClick={startPractice}>
          {t('words.mode.practice')}
        </button>
      </div>

      <p>{t('words.intro', { n: cols })}</p>
      {mode === 'practice' && <p className={styles.small}>{t('words.practiceNote')}</p>}
      <div className={styles.legend}>
        <p className={styles.small}>{t('words.legend.title')}</p>
        <ul>
          {(['correct', 'present', 'absent'] as const).map((mark) => (
            <li key={mark}>
              <span className={`${styles.legendSwatch} ${styles[mark]}`}>
                <Icon name={MARK_ICON[mark]} size={14} />
              </span>
              {t(`words.legend.${mark}`)}
            </li>
          ))}
        </ul>
      </div>

      <ol
        ref={boardRef}
        tabIndex={-1}
        className={styles.board}
        aria-label={t('words.board')}
        style={{ '--cols': cols } as CSSProperties}
        data-testid="word-board"
      >
        {rows.map((i) => {
          const guess = board.guesses[i]
          const isCurrent = !guess && i === board.guesses.length && status === 'playing'
          const marks = guess ? scoreGuess(guess, board.answer) : []
          const letters = guess ?? (isCurrent ? board.typed : '')
          return (
            <li key={i} className={styles.row} data-row={i}>
              <span className="visually-hidden">
                {guess
                  ? describeRow(guess, i + 1)
                  : isCurrent && board.typed
                    ? t('words.rowCurrent', {
                        n: i + 1,
                        letters: board.typed.toUpperCase().split('').join(' '),
                      })
                    : t('words.rowEmpty', { n: i + 1 })}
              </span>
              <span className={styles.tiles} aria-hidden="true">
                {Array.from({ length: cols }, (_, j) => (
                  <Tile key={j} letter={letters[j]} mark={marks[j]} />
                ))}
              </span>
            </li>
          )
        })}
      </ol>

      <p className={styles.notice} role="status">
        {board.tooShort ? t('words.tooShort', { n: cols }) : ''}
      </p>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      {status === 'playing' ? (
        <div className={styles.keyboard} role="group" aria-label={t('words.keyboard')}>
          {KEY_ROWS.map((row, r) => (
            <div key={row} className={styles.keyRow}>
              {r === 2 && (
                <button type="button" className={`${styles.key} ${styles.wide}`} onClick={submit}>
                  {t('words.enter')}
                </button>
              )}
              {[...row].map((k) => {
                const mark = keyMarks.get(k)
                return (
                  <button
                    key={k}
                    type="button"
                    className={`${styles.key} ${mark ? styles[mark] : ''}`}
                    onClick={() => letter(k)}
                    aria-label={
                      mark
                        ? t('words.letterMark', { letter: k.toUpperCase(), mark: markText(mark) })
                        : k.toUpperCase()
                    }
                  >
                    <span aria-hidden="true">{k.toUpperCase()}</span>
                    {mark && (
                      <span className={styles.keyMark} aria-hidden="true">
                        <Icon name={MARK_ICON[mark]} size={10} />
                      </span>
                    )}
                  </button>
                )
              })}
              {r === 2 && (
                <button
                  type="button"
                  className={`${styles.key} ${styles.wide}`}
                  onClick={backspace}
                  aria-label={t('words.backspace')}
                >
                  <Icon name="backspace" size={22} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <section className={styles.result} data-testid="word-result">
          {entry.placeholder && <PlaceholderNotice />}
          <h2 ref={resultRef}>{status === 'won' ? t('words.won') : t('words.lost')}</h2>
          <p className={styles.answer}>
            <span className={styles.latin} lang="en">
              {entry.word.toUpperCase()}
            </span>
            <NativeForms entry={entry} />
          </p>
          {status === 'won' && <p>{t('words.tries', { n: board.guesses.length })}</p>}
          <dl className={styles.meaning}>
            <dt>{t('words.meaning')}</dt>
            <dd lang={localizedLang(entry.meaning, lang)}>{l(entry.meaning)}</dd>
            <dt>{t('words.reflection')}</dt>
            <dd lang={localizedLang(entry.reflection, lang)}>{l(entry.reflection)}</dd>
          </dl>
          {mode === 'daily' && <p>{t('words.dailyDone')}</p>}
          <button type="button" className={styles.primary} onClick={startPractice}>
            <Icon name="restart" size={20} />
            {mode === 'daily' ? t('words.playPractice') : t('words.anotherPractice')}
          </button>
        </section>
      )}

      {mode === 'daily' && status !== 'playing' && (
        <StreakPanel
          day={day}
          won={status === 'won'}
          player={player}
          onEditName={() => setNameDialog(player ? 'change' : 'join')}
        />
      )}
      {nameDialog && (
        <NameDialog
          mode={nameDialog}
          initialName={player?.name ?? ''}
          returnFocus={nameDialog === 'ask' ? resultRef : undefined}
          onSave={(name) => setPlayer({ id: player?.id ?? newPlayerId(), name })}
          onClose={() => setNameDialog(null)}
        />
      )}
    </div>
  )
}

export default function WordGame() {
  if (!WORDS.data)
    return <ContentError titleKey="game.error.title" problems={WORDS.errors} level={2} />
  return <WordGameView words={WORDS.data.words} />
}
