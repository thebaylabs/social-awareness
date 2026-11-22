import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameId } from '../config/sections'

/** Each game is a separate chunk, loaded only when its page is opened. */
export const GAME_COMPONENTS: Record<GameId, LazyExoticComponent<ComponentType>> = {
  pills: lazy(() => import('./pills/PillGame')),
  words: lazy(() => import('./words/WordGame')),
  doodle: lazy(() => import('./doodle/DoodleGame')),
  temple: lazy(() => import('./temple/TempleRunGame')),
}
