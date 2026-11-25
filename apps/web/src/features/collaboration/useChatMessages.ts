import { useCallback } from 'react'
import { uniqueId, useEditor, useValue } from 'tldraw'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_MESSAGE_TYPE,
  chatMessageId,
  type ChatMessageRecord,
  type Me,
} from '@canvas/shared'

const MAX_VISIBLE = 200

/** Messages du chat (records de la lane objects), triés chronologiquement. */
export function useChatMessages(): readonly ChatMessageRecord[] {
  const editor = useEditor()
  return useValue(
    'canvas-chat-messages',
    () =>
      editor.store.query
        .records(CHAT_MESSAGE_TYPE)
        .get()
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-MAX_VISIBLE),
    [editor],
  )
}

export function useSendChatMessage(me: Me): (text: string) => void {
  const editor = useEditor()
  return useCallback(
    (text: string) => {
      const trimmed = text.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH)
      if (!trimmed) return
      // Auteur et date sont de toute façon réécrits par le serveur (authorizeRecord).
      const record: ChatMessageRecord = {
        id: chatMessageId(uniqueId()),
        typeName: CHAT_MESSAGE_TYPE,
        authorId: me.id,
        authorName: me.username,
        authorColor: me.color,
        text: trimmed,
        createdAt: Date.now(),
      }
      editor.run(() => editor.store.put([record]), { history: 'ignore' })
    },
    [editor, me],
  )
}
