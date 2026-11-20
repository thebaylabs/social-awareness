import { createContext, useContext, useEffect } from 'react'

/** Lets a game replace the page's main heading (for example with the pill the visitor chose). */
export const GameHeadingContext = createContext<(heading: string | undefined) => void>(() => {})

/** Show `heading` as the page's main heading while this component is mounted; undefined keeps the default. */
export function useGameHeading(heading: string | undefined): void {
  const setHeading = useContext(GameHeadingContext)
  useEffect(() => {
    setHeading(heading)
    return () => setHeading(undefined)
  }, [setHeading, heading])
}
