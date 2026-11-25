import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { CHAT_MESSAGE_MAX_LENGTH, type Me } from '@canvas/shared'
import { Avatar } from '@/components/ui/avatar'
import { useChatMessages, useSendChatMessage } from './useChatMessages'

export interface ChatPanelProps {
  readonly me: Me
  readonly onClose: () => void
}

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function ChatPanel({ me, onClose }: ChatPanelProps) {
  const messages = useChatMessages()
  const send = useSendChatMessage(me)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    send(text)
    setText('')
  }

  return (
    <section
      aria-label="Chat du board"
      className="pointer-events-auto flex h-[min(60vh,440px)] w-[min(92vw,320px)] animate-pop flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
      // Empêche les raccourcis tldraw de capter la saisie.
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Chat</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le chat"
          className="rounded p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <ol
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <li className="text-center text-sm text-muted-foreground">Dis bonjour 👋</li>
        )}
        {messages.map((m) => (
          <li key={m.id} className="flex gap-2">
            <Avatar name={m.authorName} color={m.authorColor} size="sm" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">{m.authorName}</span>
                <span className="text-muted-foreground">{timeFmt.format(m.createdAt)}</span>
              </div>
              {/* Rendu texte brut (React échappe) : aucun HTML interprété. */}
              <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder="Écrire un message…"
          aria-label="Message"
          className="h-9 flex-1 rounded-lg bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={!text.trim()}
          className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  )
}
