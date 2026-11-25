import {
  createShapeId,
  type Editor,
  type TLArrowShape,
  type TLShapeId,
  type TLShapePartial,
  type VecLike,
} from 'tldraw'
import {
  BRANCH_COLORS,
  computeMindmapLayout,
  MINDMAP_NODE_TYPE,
  MindmapTree,
  type MindmapLayoutMode,
} from '@canvas/shared'
import {
  getMapNodes,
  getNode,
  isRoot,
  measureNode,
  toLogicNode,
  type MindmapShape,
} from './mindmapModel'

/** Métadonnées des flèches-connecteurs générées automatiquement. */
export interface MindmapEdgeMeta {
  readonly mindmapEdge: true
  readonly mapId: string
  readonly parentId: string
  readonly childId: string
}

export function isMindmapEdge(shape: { type: string; meta: Record<string, unknown> }): boolean {
  return shape.type === 'arrow' && shape.meta['mindmapEdge'] === true
}

function edgeMeta(shape: TLArrowShape): MindmapEdgeMeta | null {
  const m = shape.meta
  if (
    m['mindmapEdge'] !== true ||
    typeof m['childId'] !== 'string' ||
    typeof m['parentId'] !== 'string'
  )
    return null
  return {
    mindmapEdge: true,
    mapId: String(m['mapId']),
    parentId: m['parentId'],
    childId: m['childId'],
  }
}

/** Crée une nouvelle carte mentale avec quelques branches de départ. */
export function createMindmap(
  editor: Editor,
  center: VecLike,
  layout: MindmapLayoutMode,
  title = 'Idée centrale',
): TLShapeId {
  const rootId = createShapeId()
  const size = measureNode(editor, title, true)
  editor.run(() => {
    editor.createShape<MindmapShape>({
      id: rootId,
      type: MINDMAP_NODE_TYPE,
      x: center.x - size.w / 2,
      y: center.y - size.h / 2,
      props: {
        ...size,
        text: title,
        color: 'black',
        mapId: rootId,
        parentNodeId: '',
        side: 'right',
        order: 0,
        collapsed: false,
        layout,
      },
    })
    for (const label of ['Branche 1', 'Branche 2', 'Branche 3'])
      addChildNode(editor, rootId, label, false)
    relayout(editor, rootId)
  })
  editor.select(rootId)
  return rootId
}

/** Ajoute un enfant au nœud ; retourne l'id créé. */
export function addChildNode(
  editor: Editor,
  parentId: string,
  text = '',
  relayoutAfter = true,
): TLShapeId | null {
  const parent = getNode(editor, parentId)
  if (!parent) return null
  const tree = new MindmapTree(getMapNodes(editor, parent.props.mapId).map(toLogicNode))
  const id = createShapeId()
  const size = measureNode(editor, text, false)
  editor.createShape<MindmapShape>({
    id,
    type: MINDMAP_NODE_TYPE,
    x: parent.x + parent.props.w + 60,
    y: parent.y,
    props: {
      ...size,
      text,
      // Branche colorée : couleur tournante sous la racine, héritée ensuite.
      color: isRoot(parent) ? tree.branchColorForNewChild(parent.id) : parent.props.color,
      mapId: parent.props.mapId,
      parentNodeId: parent.id,
      side: tree.sideForNewChild(parent.id),
      order: tree.nextChildOrder(parent.id),
      collapsed: false,
      layout: parent.props.layout,
    },
  })
  // Ajouter un enfant à un nœud replié le déplie.
  if (parent.props.collapsed)
    editor.updateShape<MindmapShape>({
      id: parent.id,
      type: MINDMAP_NODE_TYPE,
      props: { collapsed: false },
    })
  if (relayoutAfter) relayout(editor, parent.props.mapId)
  return id
}

/** Ajoute un frère juste après le nœud (un enfant si c'est la racine). */
export function addSiblingNode(editor: Editor, nodeId: string): TLShapeId | null {
  const node = getNode(editor, nodeId)
  if (!node) return null
  if (isRoot(node)) return addChildNode(editor, node.id)
  const parent = getNode(editor, node.props.parentNodeId)
  if (!parent) return null
  // Décale les frères suivants pour insérer juste après.
  const siblings = getMapNodes(editor, node.props.mapId).filter(
    (n) => n.props.parentNodeId === parent.id && n.props.order > node.props.order,
  )
  editor.updateShapes(
    siblings.map((s) => ({
      id: s.id,
      type: MINDMAP_NODE_TYPE,
      props: { order: s.props.order + 1 },
    })),
  )
  const id = addChildNode(editor, parent.id, '', false)
  if (!id) return null
  editor.updateShape<MindmapShape>({
    id,
    type: MINDMAP_NODE_TYPE,
    props: { order: node.props.order + 1, side: node.props.side, color: node.props.color },
  })
  relayout(editor, node.props.mapId)
  return id
}

export function toggleCollapse(editor: Editor, nodeId: string): void {
  const node = getNode(editor, nodeId)
  if (!node) return
  editor.updateShape<MindmapShape>({
    id: node.id,
    type: MINDMAP_NODE_TYPE,
    props: { collapsed: !node.props.collapsed },
  })
  relayout(editor, node.props.mapId)
}

export function setLayoutMode(editor: Editor, mapId: string, layout: MindmapLayoutMode): void {
  const nodes = getMapNodes(editor, mapId)
  editor.updateShapes(nodes.map((n) => ({ id: n.id, type: MINDMAP_NODE_TYPE, props: { layout } })))
  relayout(editor, mapId)
}

export function setNodeText(editor: Editor, nodeId: string, text: string): void {
  const node = getNode(editor, nodeId)
  if (!node) return
  const size = measureNode(editor, text, isRoot(node))
  editor.updateShape<MindmapShape>({
    id: node.id,
    type: MINDMAP_NODE_TYPE,
    props: { text, ...size },
  })
}

/** Réapplique le layout de la carte et synchronise les connecteurs. */
export function relayout(editor: Editor, mapId: string): void {
  const nodes = getMapNodes(editor, mapId)
  const root = nodes.find((n) => n.id === mapId)
  if (!root) return
  const positions = computeMindmapLayout(
    nodes.map(toLogicNode),
    root.id,
    { x: root.x, y: root.y },
    root.props.layout,
  )
  const updates = nodes.flatMap((n): TLShapePartial<MindmapShape>[] => {
    const p = positions.get(n.id)
    if (!p || (Math.abs(p.x - n.x) < 0.5 && Math.abs(p.y - n.y) < 0.5)) return []
    return [{ id: n.id, type: MINDMAP_NODE_TYPE, x: p.x, y: p.y }]
  })
  editor.run(
    () => {
      if (updates.length > 0) editor.updateShapes(updates)
      syncEdges(editor, mapId, nodes)
    },
    { ignoreShapeLock: true },
  )
}

/** Crée les flèches manquantes (liées aux nœuds via bindings) et supprime les orphelines. */
function syncEdges(editor: Editor, mapId: string, nodes: readonly MindmapShape[]): void {
  const byId = new Map(nodes.map((n) => [n.id as string, n]))
  const existing = new Map<string, TLArrowShape>()
  const toDelete: TLShapeId[] = []
  for (const s of editor.getCurrentPageShapes()) {
    if (s.type !== 'arrow') continue
    const meta = edgeMeta(s as TLArrowShape)
    if (!meta || meta.mapId !== mapId) continue
    const child = byId.get(meta.childId)
    if (!child || child.props.parentNodeId !== meta.parentId || existing.has(meta.childId))
      toDelete.push(s.id)
    else existing.set(meta.childId, s as TLArrowShape)
  }
  if (toDelete.length > 0) editor.deleteShapes(toDelete)

  for (const child of nodes) {
    if (isRoot(child)) continue
    const parent = byId.get(child.props.parentNodeId)
    if (!parent) continue
    const edge = existing.get(child.id)
    if (edge) {
      if (edge.props.color !== child.props.color) {
        editor.updateShape<TLArrowShape>({
          id: edge.id,
          type: 'arrow',
          props: { color: child.props.color },
        })
      }
      continue
    }
    createEdge(editor, mapId, parent, child)
  }
}

function createEdge(
  editor: Editor,
  mapId: string,
  parent: MindmapShape,
  child: MindmapShape,
): void {
  const arrowId = createShapeId()
  const start = { x: parent.x + parent.props.w / 2, y: parent.y + parent.props.h / 2 }
  const end = { x: child.x + child.props.w / 2, y: child.y + child.props.h / 2 }
  const meta: MindmapEdgeMeta = { mindmapEdge: true, mapId, parentId: parent.id, childId: child.id }
  editor.createShape<TLArrowShape>({
    id: arrowId,
    type: 'arrow',
    x: start.x,
    y: start.y,
    isLocked: true,
    meta: { ...meta },
    props: {
      start: { x: 0, y: 0 },
      end: { x: end.x - start.x, y: end.y - start.y },
      arrowheadStart: 'none',
      arrowheadEnd: 'none',
      color: child.props.color,
      size: 'm',
      dash: 'solid',
      bend: 0,
    },
  })
  const bindingProps = {
    normalizedAnchor: { x: 0.5, y: 0.5 },
    isExact: false,
    isPrecise: false,
    snap: 'none' as const,
  }
  editor.createBindings([
    {
      type: 'arrow',
      fromId: arrowId,
      toId: parent.id,
      props: { terminal: 'start', ...bindingProps },
    },
    { type: 'arrow', fromId: arrowId, toId: child.id, props: { terminal: 'end', ...bindingProps } },
  ])
}

/** Couleurs proposées (export pour l'UI). */
export const MINDMAP_COLORS = BRANCH_COLORS
