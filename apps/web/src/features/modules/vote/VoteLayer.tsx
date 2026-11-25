import { useEditor, useValue } from 'tldraw'
import { readVotes, voteCount } from './voteLogic'

/** Pastilles de votes affichées sur les post-its (espace page). */
export function VoteLayer() {
  const editor = useEditor()
  const badges = useValue(
    'vote-badges',
    () =>
      editor
        .getCurrentPageShapes()
        .filter((s) => s.type === 'note' && !editor.isShapeHidden(s))
        .flatMap((s) => {
          const count = voteCount(readVotes(s.meta))
          const b = editor.getShapePageBounds(s)
          return count > 0 && b ? [{ id: s.id, count, x: b.maxX, y: b.minY }] : []
        }),
    [editor],
  )
  return (
    <>
      {badges.map((b) => (
        <div
          key={b.id}
          aria-label={`${b.count} vote(s)`}
          className="pointer-events-none absolute grid h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 animate-pop place-items-center rounded-full bg-primary px-2 text-sm font-bold text-white shadow-lg ring-2 ring-white"
          style={{ left: b.x, top: b.y }}
        >
          {'●'.repeat(Math.min(b.count, 3))}
          {b.count > 3 ? ` ${b.count}` : ''}
        </div>
      ))}
    </>
  )
}
