/**
 * Daily-word streaks: the number of days in a row a player has solved the
 * daily word. Pure functions, no storage. Days are local day numbers from
 * localDayNumber() in ./logic, the same numbers that pick the daily word.
 * Practice games never reach these functions.
 *
 * firestore.rules checks the same steps on the server: a streak can grow by
 * one only on the day after the last one, can start again at 1, or end at 0.
 */

/** A player's streak as it stands after their last daily game. */
export interface StreakRecord {
  /** Days in a row solved, ending on lastDay. 0 when the last daily game was lost. */
  streak: number
  /** Local day number of the last daily game the player finished (won or lost). */
  lastDay: number
}

export interface StreakEntry extends StreakRecord {
  /** Random id of the player's browser (see ./player). */
  id: string
  name: string
}

/** How many players the leaderboard shows. */
export const BOARD_SIZE = 10

/**
 * The record after the daily game for `day` ends. A win on the day after the
 * last game adds one; any other win starts again at 1; a loss ends the streak
 * at 0. A day that was already counted (a reload) or an earlier day (a clock
 * change) leaves the record as it was.
 */
export function recordDaily(
  previous: StreakRecord | null,
  day: number,
  won: boolean,
): StreakRecord {
  if (previous && day <= previous.lastDay) {
    return { streak: previous.streak, lastDay: previous.lastDay }
  }
  if (!won) return { streak: 0, lastDay: day }
  if (previous && day === previous.lastDay + 1) return { streak: previous.streak + 1, lastDay: day }
  return { streak: 1, lastDay: day }
}

/**
 * The days on which a last game keeps a streak running on `today`: yesterday
 * (today's word is still to play), today, and tomorrow, because a player in a
 * time zone ahead of the viewer can already be on the next day.
 */
export function runningDays(today: number): number[] {
  return [today - 1, today, today + 1]
}

/** The streak still running on `today`, or 0 when the player missed a day since. */
export function currentStreak(record: StreakRecord, today: number): number {
  return runningDays(today).includes(record.lastDay) ? record.streak : 0
}

/** The leaderboard: running streaks only, longest first, then by name. */
export function rankStreaks(
  entries: readonly StreakEntry[],
  today: number,
  size = BOARD_SIZE,
): StreakEntry[] {
  return entries
    .filter((entry) => currentStreak(entry, today) > 0)
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name))
    .slice(0, size)
}
