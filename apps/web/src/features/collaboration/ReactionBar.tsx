import { REACTION_EMOJIS, sendReaction } from './reactions'

/** Barre de réactions : l'emoji part du curseur de l'utilisateur, vu par tous. */
export function ReactionBar() {
  return (
    <div
      role="toolbar"
      aria-label="Réactions"
      className="pointer-events-auto flex gap-0.5 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur"
    >
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
  )
}
