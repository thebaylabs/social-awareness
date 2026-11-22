import type { ComponentType } from 'react'
import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { Card, CardItem, CardList } from '../components/Card'
import { GameArt, PillsArt, TempleArt, WordsArt } from '../components/Art'
import { AUDIENCE_SECTIONS, GAMES, HUBS, SECTIONS, paths, type GameId } from '../config/sections'
import { gameIsPlaceholder } from '../content/games'

const GAME_ART: Record<GameId, ComponentType> = {
  doodle: GameArt,
  pills: PillsArt,
  words: WordsArt,
  temple: TempleArt,
}

/** All games from Bhulkao and Yuvako, listed together. */
export default function HubGames() {
  const { t } = useI18n()
  const hub = HUBS.activity
  usePage(t(hub.nameKey), { to: paths.home(), label: t('nav.home') })
  const entries = AUDIENCE_SECTIONS.flatMap((section) =>
    SECTIONS[section].games.map((game) => ({ section, game })),
  )
  return (
    <>
      <h1>{t(hub.nameKey)}</h1>
      <p>{t(hub.leadKey)}</p>
      <CardList>
        {entries.map(({ section, game }) => {
          const Art = GAME_ART[game]
          return (
            <CardItem key={`${section}-${game}`}>
              <Card
                to={paths.game(section, game)}
                title={t(GAMES[game].titleKey)}
                description={t(GAMES[game].descKey)}
                art={<Art />}
                curatedKids={section === 'bhulkao'}
                placeholder={gameIsPlaceholder(game)}
              />
            </CardItem>
          )
        })}
      </CardList>
    </>
  )
}
