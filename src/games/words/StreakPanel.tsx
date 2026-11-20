import { useEffect, useId, useState } from 'react'
import { useI18n } from '../../i18n/context'
import type { Player } from './player'
import { currentStreak, type StreakEntry, type StreakRecord } from './streak'
import { getStreakBoard, streakBoardAvailable } from './streakBoard'
import styles from './StreakBoard.module.css'

type BoardState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'ready'; top: StreakEntry[]; mine: StreakRecord | null }

/**
 * Below a finished daily word: counts the day for a named player, then shows
 * the longest running streaks and a button to add or change the name.
 */
export function StreakPanel({
  day,
  won,
  player,
  onEditName,
}: {
  day: number
  won: boolean
  player: Player | null
  onEditName: () => void
}) {
  const { t } = useI18n()
  const titleId = useId()
  const [state, setState] = useState<BoardState>({ status: 'loading' })
  const playerId = player?.id
  const playerName = player?.name

  useEffect(() => {
    let alive = true
    const me = playerId && playerName ? { id: playerId, name: playerName } : null
    getStreakBoard()
      .then(async (board): Promise<BoardState> => {
        if (!board) return { status: 'unavailable' }
        const mine = me ? await board.record(me, day, won) : null
        return { status: 'ready', top: await board.top(day), mine }
      })
      .catch((): BoardState => ({ status: 'error' }))
      .then((next) => {
        if (alive) setState(next)
      })
    return () => {
      alive = false
    }
  }, [day, won, playerId, playerName])

  const mine = state.status === 'ready' && state.mine ? currentStreak(state.mine, day) : null

  return (
    <section className={styles.board} aria-labelledby={titleId} data-testid="streak-board">
      <h2 id={titleId} className={styles.boardTitle}>
        {t('words.streak.title')}
      </h2>
      <p className={styles.about}>{t('words.streak.about')}</p>
      <div aria-live="polite">
        {state.status === 'loading' && <p>{t('words.streak.loading')}</p>}
        {state.status === 'unavailable' && <p>{t('words.streak.unavailable')}</p>}
        {state.status === 'error' && <p>{t('words.streak.error')}</p>}
        {state.status === 'ready' &&
          (state.top.length === 0 ? (
            <p>{t('words.streak.empty')}</p>
          ) : (
            <ol className={styles.list}>
              {state.top.map((entry, i) => (
                <li key={entry.id} className={entry.id === playerId ? styles.me : undefined}>
                  <span className={styles.rank} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    {entry.streak === 1
                      ? t('words.streak.entry.one', { name: entry.name })
                      : t('words.streak.entry', { name: entry.name, n: entry.streak })}
                    {entry.id === playerId && ` ${t('words.streak.you')}`}
                  </span>
                </li>
              ))}
            </ol>
          ))}
        {mine !== null && (
          <p className={styles.mine}>
            {mine === 0
              ? t('words.streak.mine.none')
              : mine === 1
                ? t('words.streak.mine.one')
                : t('words.streak.mine', { n: mine })}
          </p>
        )}
      </div>
      {streakBoardAvailable() && (
        <div className={styles.player}>
          <p>
            {playerName
              ? t('words.streak.playingAs', { name: playerName })
              : t('words.streak.join')}
          </p>
          <button type="button" className={styles.nameButton} onClick={onEditName}>
            {t(playerName ? 'words.streak.changeName' : 'words.streak.addName')}
          </button>
        </div>
      )}
    </section>
  )
}
