/**
 * The pill game as a small state machine:
 * start → red (one card at a time) → back to start after the last card
 * start → blue swap (on the same screen, the guide tosses the blue pill away
 *         and offers a green pill instead) → green (a few pages) → exit → start
 * From the blue swap screen the red pill can still be taken.
 * Start over returns to start from anywhere.
 */
export type PillPath = 'red' | 'blue'

export type PillState =
  | { screen: 'start' }
  | { screen: 'red'; index: number }
  | { screen: 'blueSwap' }
  | { screen: 'green'; index: number }

export type PillAction =
  | { type: 'choose'; path: PillPath }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'takeGreen' }
  | { type: 'exit' }
  | { type: 'startOver' }

export const START: PillState = { screen: 'start' }

export function pillReducer(redCount: number, greenCount: number) {
  return (state: PillState, action: PillAction): PillState => {
    switch (action.type) {
      case 'choose':
        if (action.path === 'blue') return { screen: 'blueSwap' }
        return redCount > 0 ? { screen: 'red', index: 0 } : START
      case 'next':
        if (state.screen === 'red') {
          // Finishing the last red card returns to the start, where either pill can be chosen.
          return state.index + 1 < redCount ? { screen: 'red', index: state.index + 1 } : START
        }
        if (state.screen === 'green') {
          return state.index + 1 < greenCount ? { screen: 'green', index: state.index + 1 } : state
        }
        return state
      case 'back':
        if (state.screen === 'red') {
          return state.index > 0 ? { screen: 'red', index: state.index - 1 } : START
        }
        if (state.screen === 'green') {
          return state.index > 0
            ? { screen: 'green', index: state.index - 1 }
            : { screen: 'blueSwap' }
        }
        return state
      case 'takeGreen':
        // The green pill is only on offer once the blue one has been tossed away.
        return state.screen === 'blueSwap' && greenCount > 0 ? { screen: 'green', index: 0 } : state
      case 'exit':
        // Only the last green page has an Exit button.
        return state.screen === 'green' && state.index + 1 >= greenCount ? START : state
      case 'startOver':
        return START
    }
  }
}
