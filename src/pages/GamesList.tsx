import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { Card, CardItem, CardList } from '../components/Card'
import type { ComponentType } from 'react'
import { GameArt, PillsArt, WordsArt } from '../components/Art'
import { GAMES, SECTIONS, paths, type GameId, type SectionId } from '../config/sections'
import { gameIsPlaceholder } from '../content/games'

/** Each game's own picture on its card. */
const GAME_ART: Record<GameId, ComponentType> = {
  doodle: GameArt,
  pills: PillsArt,
  words: WordsArt,
}

export default function GamesList({ section }: { section: SectionId }) {
  const { t } = useI18n()
  const config = SECTIONS[section]
  usePage(t('games.title'), { to: paths.section(section), label: t(config.nameKey) })
  return (
    <>
      <h1>{t('games.title')}</h1>
      <p>{t('games.lead')}</p>
      <CardList>
        {config.games.map((id) => {
          const Art = GAME_ART[id]
          return (
            <CardItem key={id}>
              <Card
                to={paths.game(section, id)}
                title={t(GAMES[id].titleKey)}
                description={t(GAMES[id].descKey)}
                art={<Art />}
                placeholder={gameIsPlaceholder(id)}
              />
            </CardItem>
          )
        })}
      </CardList>
    </>
  )
}
