import type { TLRecordAuthorizers } from '@tldraw/sync-core'
import type { TLRecord } from '@tldraw/tlschema'
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_MESSAGE_TYPE } from '@canvas/shared'
import type { SessionMeta } from './roomManager'

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
  }
}
