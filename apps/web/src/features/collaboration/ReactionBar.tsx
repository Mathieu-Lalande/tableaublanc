import { useState } from 'react'
import { SmilePlus, X } from 'lucide-react'
import { REACTION_EMOJIS, sendReaction } from './reactions'

/** Barre de réactions repliable : l'emoji part du curseur de l'utilisateur, vu par tous. */
export function ReactionBar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Fermer les réactions' : 'Réactions'}
        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {open ? <X className="h-4 w-4" /> : <SmilePlus className="h-4 w-4" />}
      </button>
      {open && (
        <div role="toolbar" aria-label="Réactions" className="flex animate-pop gap-0.5">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => sendReaction(e)}
              aria-label={`Réagir ${e}`}
              className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-muted active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
