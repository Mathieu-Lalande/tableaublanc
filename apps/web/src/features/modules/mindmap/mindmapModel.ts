import type { Editor, TLShape, TLShapeId } from 'tldraw'
import { MINDMAP_NODE_TYPE, type MindmapNode } from '@canvas/shared'

export type MindmapShape = TLShape<typeof MINDMAP_NODE_TYPE>

export const ROOT_FONT = { size: 22, weight: '700' } as const
export const NODE_FONT = { size: 17, weight: '500' } as const
export const NODE_PADDING = { x: 18, y: 10 } as const
export const NODE_BORDER = 2.5
export const NODE_MAX_TEXT_WIDTH = 260
export const NODE_LINE_HEIGHT = 1.35
export const NODE_FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, sans-serif"

export function isMindmapNode(shape: TLShape | null | undefined): shape is MindmapShape {
  return shape?.type === MINDMAP_NODE_TYPE
}

export function isRoot(shape: MindmapShape): boolean {
  return shape.props.parentNodeId === ''
}

export function getNode(editor: Editor, id: string): MindmapShape | undefined {
  const s = editor.getShape(id as TLShapeId)
  return isMindmapNode(s) ? s : undefined
}

/** Tous les nœuds d'une carte (sur la page courante). */
export function getMapNodes(editor: Editor, mapId: string): MindmapShape[] {
  return editor
    .getCurrentPageShapes()
    .filter((s): s is MindmapShape => isMindmapNode(s) && s.props.mapId === mapId)
}

export function toLogicNode(s: MindmapShape): MindmapNode {
  return {
    id: s.id,
    parentId: s.props.parentNodeId === '' ? null : s.props.parentNodeId,
    w: s.props.w,
    h: s.props.h,
    order: s.props.order,
    collapsed: s.props.collapsed,
    side: s.props.side,
  }
}

/** Un nœud est masqué si l'un de ses ancêtres est replié. */
export function isHiddenByCollapse(editor: Editor, shape: MindmapShape): boolean {
  let parentId = shape.props.parentNodeId
  const seen = new Set<string>()
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = getNode(editor, parentId)
    if (!parent) return false
    if (parent.props.collapsed) return true
    parentId = parent.props.parentNodeId
  }
  return false
}

/** Taille d'un nœud d'après son texte (mesure native tldraw). */
export function measureNode(editor: Editor, text: string, root: boolean): { w: number; h: number } {
  const font = root ? ROOT_FONT : NODE_FONT
  const size = editor.textMeasure.measureText(text || ' ', {
    fontStyle: 'normal',
    fontWeight: font.weight,
    fontFamily: NODE_FONT_FAMILY,
    fontSize: font.size,
    lineHeight: NODE_LINE_HEIGHT,
    maxWidth: NODE_MAX_TEXT_WIDTH,
    padding: '0px',
  })
  // + bordure des deux côtés + marge anti-arrondi (sinon le texte repasse à la ligne).
  const chrome = NODE_BORDER * 2 + 4
  return {
    w: Math.ceil(Math.max(size.w, 24) + NODE_PADDING.x * 2 + chrome),
    h: Math.ceil(size.h + NODE_PADDING.y * 2 + NODE_BORDER * 2),
  }
}
