import type { Editor, TLShape, TLShapeId } from 'tldraw'
import { MINDMAP_NODE_TYPE } from '@canvas/shared'
import { getMapNodes, getNode, isHiddenByCollapse, isMindmapNode, isRoot } from './mindmapModel'
import { addChildNode, addSiblingNode, isMindmapEdge, relayout } from './mindmapOps'

/** Masque les nœuds (et leurs connecteurs) dont un ancêtre est replié. */
export function mindmapShapeVisibility(shape: TLShape, editor: Editor): 'hidden' | 'inherit' {
  if (isMindmapNode(shape)) return isHiddenByCollapse(editor, shape) ? 'hidden' : 'inherit'
  if (isMindmapEdge(shape)) {
    const child = getNode(editor, String(shape.meta['childId']))
    return child && isHiddenByCollapse(editor, child) ? 'hidden' : 'inherit'
  }
  return 'inherit'
}

function startEditing(editor: Editor, id: TLShapeId | null): void {
  if (!id) return
  editor.select(id)
  editor.setEditingShape(id)
}

/**
 * Comportements de la mind map : raccourcis clavier (Tab = enfant, Entrée = frère),
 * suppression en cascade, ré-agencement après modification locale.
 */
export function registerMindmap(editor: Editor): () => void {
  const container = editor.getContainer()
  const onKeyDown = (e: KeyboardEvent) => {
    if (editor.getIsReadonly() || e.metaKey || e.ctrlKey || e.altKey) return
    // Ignore les saisies hors du canvas (chat, dialogues…).
    const target = e.target
    if (target instanceof HTMLElement && target !== document.body && !container.contains(target))
      return
    if (e.key !== 'Tab' && e.key !== 'Enter') return
    const editingId = editor.getEditingShapeId()
    const editing = editingId ? getNode(editor, editingId) : undefined
    const selected = editor.getOnlySelectedShape()
    const node = editing ?? (isMindmapNode(selected) ? selected : undefined)
    if (!node) return

    if (editing) {
      // Entrée valide la saisie (Maj+Entrée = retour à la ligne), Tab crée un enfant.
      if (e.key === 'Enter' && e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      editor.setEditingShape(null)
      if (e.key === 'Tab') startEditing(editor, addChildNode(editor, node.id))
      return
    }

    e.preventDefault()
    e.stopPropagation()
    editor.markHistoryStoppingPoint('mindmap add node')
    const created =
      e.key === 'Tab' || isRoot(node)
        ? addChildNode(editor, node.id)
        : addSiblingNode(editor, node.id)
    startEditing(editor, created)
  }
  document.addEventListener('keydown', onKeyDown, { capture: true })

  // Suppression en cascade : descendants et connecteurs disparaissent avec leur nœud.
  const offDelete = editor.sideEffects.registerAfterDeleteHandler('shape', (shape, source) => {
    if (source !== 'user' || !isMindmapNode(shape)) return
    const orphans = getMapNodes(editor, shape.props.mapId).filter(
      (n) => n.props.parentNodeId === shape.id,
    )
    const edges = editor
      .getCurrentPageShapes()
      .filter(
        (s) =>
          isMindmapEdge(s) && (s.meta['childId'] === shape.id || s.meta['parentId'] === shape.id),
      )
    const ids = [...orphans.map((n) => n.id), ...edges.map((s) => s.id)]
    editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
    if (!isRoot(shape)) queueMicrotask(() => relayout(editor, shape.props.mapId))
  })

  // Le style « couleur » natif appliqué à un nœud se propage à ses connecteurs.
  const offChange = editor.sideEffects.registerAfterChangeHandler('shape', (prev, next, source) => {
    if (
      source !== 'user' ||
      next.type !== MINDMAP_NODE_TYPE ||
      !isMindmapNode(prev) ||
      !isMindmapNode(next)
    )
      return
    if (prev.props.color !== next.props.color || prev.props.layout !== next.props.layout) {
      queueMicrotask(() => relayout(editor, next.props.mapId))
    }
  })

  return () => {
    document.removeEventListener('keydown', onKeyDown, { capture: true })
    offDelete()
    offChange()
  }
}
