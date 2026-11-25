import { GitBranch, ListTree, Network, Plus } from 'lucide-react'
import { stopEventPropagation, useEditor, useValue } from 'tldraw'
import { getNode, isMindmapNode } from './mindmapModel'
import { addChildNode, addSiblingNode, setLayoutMode } from './mindmapOps'

const btn =
  'grid h-8 w-8 place-items-center rounded-lg text-foreground transition hover:bg-muted aria-pressed:bg-accent aria-pressed:text-primary'

/** Barre contextuelle affichée au-dessus d'un nœud de mind map sélectionné. */
export function MindmapToolbar() {
  const editor = useEditor()
  const info = useValue(
    'mindmap-toolbar',
    () => {
      const shape = editor.getOnlySelectedShape()
      if (!isMindmapNode(shape) || editor.getEditingShapeId() || editor.getIsReadonly()) return null
      if (!editor.isIn('select.idle')) return null
      const bounds = editor.getSelectionPageBounds()
      if (!bounds) return null
      const p = editor.pageToViewport({ x: bounds.midX, y: bounds.minY })
      const root = getNode(editor, shape.props.mapId)
      return {
        id: shape.id,
        mapId: shape.props.mapId,
        layout: root?.props.layout ?? 'tree',
        x: p.x,
        y: p.y,
      }
    },
    [editor],
  )
  if (!info) return null

  const select = (id: string | null) => {
    if (!id) return
    editor.select(id as never)
    editor.setEditingShape(id as never)
  }

  return (
    <div
      role="toolbar"
      aria-label="Mind map"
      onPointerDown={stopEventPropagation}
      className="pointer-events-auto absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%+14px)] items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-lg animate-pop"
      style={{ left: info.x, top: info.y }}
    >
      <button
        type="button"
        className={btn}
        title="Ajouter un enfant (Tab)"
        aria-label="Ajouter un enfant"
        onClick={() => select(addChildNode(editor, info.id))}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        title="Ajouter un frère (Entrée)"
        aria-label="Ajouter un frère"
        onClick={() => select(addSiblingNode(editor, info.id))}
      >
        <GitBranch className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        className={btn}
        title="Disposition en arbre"
        aria-label="Disposition en arbre"
        aria-pressed={info.layout === 'tree'}
        onClick={() => setLayoutMode(editor, info.mapId, 'tree')}
      >
        <ListTree className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        title="Disposition radiale"
        aria-label="Disposition radiale"
        aria-pressed={info.layout === 'radial'}
        onClick={() => setLayoutMode(editor, info.mapId, 'radial')}
      >
        <Network className="h-4 w-4" />
      </button>
    </div>
  )
}
