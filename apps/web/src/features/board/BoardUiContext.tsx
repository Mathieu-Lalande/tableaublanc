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

/** Utilisateur courant, ou null hors d'un board (ex. rendu d'export). */
export function useCurrentUser(): { id: string; name: string } | null {
  const ctx = useContext(BoardUiContext)
  return ctx ? { id: ctx.me.id, name: ctx.me.username } : null
}

/** Contexte du board s'il existe (les shapes peuvent être rendues hors board, ex. export). */
export function useOptionalBoardUi(): BoardUi | null {
  return useContext(BoardUiContext)
}
