import { useEffect, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { isReaction, myReaction, REACTION_TTL_MS, type Reaction } from './reactions'

/** Horloge rafraîchie à intervalle régulier (setState dans un callback de timer). */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

interface FloatingReaction extends Reaction {
  readonly key: string
  readonly x: number
  readonly y: number
}

/** Emojis flottants au-dessus des curseurs (soi + collaborateurs), dans l'espace de la page. */
export function ReactionsLayer() {
  const editor = useEditor()
  const now = useNow(250)

  const reactions = useValue(
    'canvas-reactions',
    () => {
      const list: FloatingReaction[] = []
      const mine = myReaction.get()
      if (mine) {
        const p = editor.inputs.getCurrentPagePoint()
        list.push({ ...mine, key: `me-${mine.at}`, x: p.x, y: p.y })
      }
      for (const c of editor.getCollaboratorsOnCurrentPage()) {
        const r: unknown = c.meta['reaction']
        if (isReaction(r) && c.cursor) {
          list.push({ ...r, key: `${c.userId}-${r.at}`, x: c.cursor.x, y: c.cursor.y })
        }
      }
      return list
    },
    [editor],
  )

  // Une réaction reçue juste après le dernier tick reste affichée (at > now - TTL).
  const active = reactions.filter((r) => now - r.at < REACTION_TTL_MS)

  const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
  return (
    <>
      {active.map((r) => (
        <div
          key={r.key}
          aria-hidden
          className="canvas-reaction pointer-events-none absolute select-none"
          style={{ left: r.x, top: r.y, fontSize: 36 / zoom }}
        >
          {r.emoji}
        </div>
      ))}
    </>
  )
}
