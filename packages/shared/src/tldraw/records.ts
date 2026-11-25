import type { CustomRecordInfo } from '@tldraw/tlschema'
import { createCustomRecordMigrationSequence } from '@tldraw/tlschema'
import type { BaseRecord, RecordId } from '@tldraw/store'
import { T } from '@tldraw/validate'

export const CHAT_MESSAGE_TYPE = 'chat_message'
export const CHAT_MESSAGE_MAX_LENGTH = 500

/** Message du mini-chat d'un board. Auteur et date sont imposés par le serveur. */
export interface ChatMessageRecord extends BaseRecord<
  typeof CHAT_MESSAGE_TYPE,
  RecordId<ChatMessageRecord>
> {
  readonly authorId: string
  readonly authorName: string
  readonly authorColor: string
  readonly text: string
  readonly createdAt: number
}

declare module '@tldraw/tlschema' {
  interface TLGlobalRecordPropsMap {
    [CHAT_MESSAGE_TYPE]: ChatMessageRecord
  }
}

export const chatMessageValidator = T.object({
  id: T.string,
  typeName: T.literal(CHAT_MESSAGE_TYPE),
  authorId: T.string,
  authorName: T.string,
  authorColor: T.string,
  text: T.string,
  createdAt: T.number,
})

/** Records custom (document scope : persistés et synchronisés). */
export const customRecordSchemas: Record<string, CustomRecordInfo> = {
  [CHAT_MESSAGE_TYPE]: {
    scope: 'document',
    validator: chatMessageValidator,
    migrations: createCustomRecordMigrationSequence({ sequence: [] }),
  },
}

/**
 * Types de records rangés dans la "object lane" de tldraw sync : leur droit d'écriture
 * est contrôlé par `objectAccess` et non par `isReadonly` (un VIEWER peut donc chatter).
 */
export const OBJECT_LANE_RECORD_TYPES: readonly string[] = [CHAT_MESSAGE_TYPE]

export function chatMessageId(id: string): RecordId<ChatMessageRecord> {
  return `${CHAT_MESSAGE_TYPE}:${id}` as RecordId<ChatMessageRecord>
}
