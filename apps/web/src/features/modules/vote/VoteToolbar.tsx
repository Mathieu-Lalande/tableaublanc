import { stopEventPropagation, useEditor, useValue } from 'tldraw'
import { useCurrentUser } from '@/features/board/BoardUiContext'
import { MAX_VOTES_PER_USER, readVotes, toggleVote, usedVotes } from './voteLogic'

/** Bouton de vote au-dessus d'un post-it sélectionné. */
export function VoteToolbar() {
  const editor = useEditor()
  const me = useCurrentUser()
  const info = useValue(
    'vote-toolbar',
    () => {
      const shape = editor.getOnlySelectedShape()
      if (
        !me ||
        !shape ||
        shape.type !== 'note' ||
        editor.getIsReadonly() ||
        editor.getEditingShapeId()
      )
        return null
      if (!editor.isIn('select.idle')) return null
      const bounds = editor.getSelectionPageBounds()
      if (!bounds) return null
      const all = editor
        .getCurrentPageShapes()
        .filter((s) => s.type === 'note')
        .map((s) => readVotes(s.meta))
      const votes = readVotes(shape.meta)
      const p = editor.pageToViewport({ x: bounds.midX, y: bounds.maxY })
      return { id: shape.id, mine: votes[me.id] === 1, used: usedVotes(all, me.id), x: p.x, y: p.y }
    },
    [editor, me],
  )
  if (!info || !me) return null

  const remaining = MAX_VOTES_PER_USER - info.used
  const onClick = () => {
    const shape = editor.getShape(info.id)
    if (!shape) return
    const next = toggleVote(readVotes(shape.meta), me.id, info.used)
    if (next)
      editor.updateShape({ id: shape.id, type: shape.type, meta: { ...shape.meta, votes: next } })
  }

  return (
    <button
      type="button"
      onPointerDown={stopEventPropagation}
      onClick={onClick}
      disabled={!info.mine && remaining <= 0}
      className="pointer-events-auto absolute z-10 -translate-x-1/2 translate-y-3 animate-pop rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-lg transition hover:bg-muted disabled:opacity-50"
      style={{ left: info.x, top: info.y }}
    >
      {info.mine
        ? '↩️ Retirer mon vote'
        : `👍 Voter · ${remaining} point${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`}
    </button>
  )
}
