import type { TLRecordAuthorizers } from '@tldraw/sync-core'
import type { TLRecord, TLShape } from '@tldraw/tlschema'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_MESSAGE_TYPE,
  classifyTransition,
  CONNECT4_TYPE,
  connect4Rules,
  initialState,
  PICTIONARY_TYPE,
  propsToGameState,
  gameStateToProps,
  TICTACTOE_TYPE,
  ticTacToeRules,
} from '@canvas/shared'
import type { SessionMeta } from './roomManager'

type ShapeRecord = TLShape

/** Props hors dimensions : ce que les clients ne peuvent pas modifier librement sur un jeu. */
function gameProps(shape: ShapeRecord): string {
  const { w: _w, h: _h, ...rest } = shape.props as Record<string, unknown>
  return JSON.stringify(rest)
}

/** Création : un jeu démarre toujours vierge (on ignore l'état envoyé par le client). */
function sanitizeCreatedShape(next: ShapeRecord): ShapeRecord {
  switch (next.type) {
    case PICTIONARY_TYPE:
      return {
        ...next,
        props: {
          ...next.props,
          status: 'idle',
          round: 0,
          drawerId: '',
          drawerName: '',
          hint: '',
          endsAt: 0,
          revealedWord: '',
          winnerName: '',
        },
      }
    case TICTACTOE_TYPE:
      return {
        ...next,
        props: { ...next.props, ...gameStateToProps(ticTacToeRules, initialState(ticTacToeRules)) },
      }
    case CONNECT4_TYPE:
      return {
        ...next,
        props: { ...next.props, ...gameStateToProps(connect4Rules, initialState(connect4Rules)) },
      }
    default:
      return next
  }
}

/** Mise à jour d'une shape de jeu : seules les transitions conformes aux règles passent. */
function isAllowedShapeUpdate(prev: ShapeRecord, next: ShapeRecord, meta: SessionMeta): boolean {
  if (prev.type !== next.type) return false
  const user = { id: meta.userId, name: meta.username }
  switch (next.type) {
    case PICTIONARY_TYPE:
      // L'état de la manche n'est écrit que par le serveur (API pictionary).
      return gameProps(prev) === gameProps(next)
    case TICTACTOE_TYPE:
      if (prev.type !== TICTACTOE_TYPE) return false
      return (
        classifyTransition(
          ticTacToeRules,
          propsToGameState(ticTacToeRules, prev.props),
          propsToGameState(ticTacToeRules, next.props),
          user,
        ) !== null
      )
    case CONNECT4_TYPE:
      if (prev.type !== CONNECT4_TYPE) return false
      return (
        classifyTransition(
          connect4Rules,
          propsToGameState(connect4Rules, prev.props),
          propsToGameState(connect4Rules, next.props),
          user,
        ) !== null
      )
    default:
      return true
  }
}

/**
 * Règles d'écriture par type de record, appliquées par TLSocketRoom côté serveur.
 * Doivent être synchrones et sans I/O.
 */
export function createRecordAuthorizers(
  now: () => number = Date.now,
): TLRecordAuthorizers<TLRecord, SessionMeta> {
  return {
    [CHAT_MESSAGE_TYPE]: ({ type, next, prev, session }) => {
      if (type === 'create') {
        const text = next.text.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH)
        if (text.length === 0) return null
        // L'identité vient de la session authentifiée, jamais du client.
        return {
          ...next,
          text,
          authorId: session.meta.userId,
          authorName: session.meta.username,
          authorColor: session.meta.color,
          createdAt: now(),
        }
      }
      // Messages immuables ; suppression par l'auteur ou le propriétaire du board.
      if (type === 'update') return null
      return prev.authorId === session.meta.userId || session.meta.role === 'OWNER' ? prev : null
    },
    shape: ({ type, next, prev, session }) => {
      if (type === 'create') return sanitizeCreatedShape(next)
      if (type === 'delete') return prev
      return isAllowedShapeUpdate(prev, next, session.meta) ? next : null
    },
  }
}
