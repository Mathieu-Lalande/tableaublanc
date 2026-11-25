import { createContext, useContext } from 'react'
import type { BoardDetail, Me } from '@canvas/shared'

export interface BoardUi {
  readonly me: Me
  readonly board: BoardDetail
  readonly chatOpen: boolean
  readonly toggleChat: () => void
  readonly openShare: () => void
  readonly openLibrary: () => void
}

export const BoardUiContext = createContext<BoardUi | null>(null)

/** Accès au contexte du board depuis les composants injectés dans l'UI tldraw. */
export function useBoardUi(): BoardUi {
  const ctx = useContext(BoardUiContext)
  if (!ctx) throw new Error('useBoardUi hors de <BoardUiContext>')
  return ctx
}
