/**
 * Logique pure de la mind map (aucune dépendance à tldraw) : arbre, replis, layout.
 */

export type MindmapSide = 'left' | 'right'
export type MindmapLayoutMode = 'tree' | 'radial'

export interface MindmapNode {
  readonly id: string
  /** `null` pour la racine. */
  readonly parentId: string | null
  readonly w: number
  readonly h: number
  readonly order: number
  readonly collapsed: boolean
  readonly side: MindmapSide
}

export interface Point {
  readonly x: number
  readonly y: number
}

export interface LayoutOptions {
  readonly hGap: number
  readonly vGap: number
  readonly radialFirstRing: number
  readonly radialRingGap: number
  /** Ouverture angulaire max du secteur des petits-enfants (garde les branches groupées). */
  readonly radialMaxChildSpan: number
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  hGap: 64,
  vGap: 20,
  radialFirstRing: 240,
  radialRingGap: 200,
  radialMaxChildSpan: Math.PI / 2,
}

/** Couleurs de branche (noms de couleurs tldraw), attribuées aux enfants directs de la racine. */
export const BRANCH_COLORS = [
  'blue',
  'orange',
  'green',
  'violet',
  'red',
  'light-blue',
  'yellow',
  'light-green',
  'light-violet',
  'light-red',
] as const

export type BranchColor = (typeof BRANCH_COLORS)[number]

export class MindmapTree {
  private readonly byId = new Map<string, MindmapNode>()
  private readonly children = new Map<string, MindmapNode[]>()

  constructor(nodes: readonly MindmapNode[]) {
    for (const n of nodes) this.byId.set(n.id, n)
    for (const n of nodes) {
      if (n.parentId === null || !this.byId.has(n.parentId)) continue
      const list = this.children.get(n.parentId) ?? []
      list.push(n)
      this.children.set(n.parentId, list)
    }
    for (const list of this.children.values())
      list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  }

  get(id: string): MindmapNode | undefined {
    return this.byId.get(id)
  }

  childrenOf(id: string): readonly MindmapNode[] {
    return this.children.get(id) ?? []
  }

  /** Enfants affichés (aucun si le nœud est replié). */
  visibleChildrenOf(id: string): readonly MindmapNode[] {
    return this.byId.get(id)?.collapsed ? [] : this.childrenOf(id)
  }

  descendantsOf(id: string): string[] {
    const out: string[] = []
    const stack = [...this.childrenOf(id)]
    while (stack.length > 0) {
      const n = stack.pop()
      if (!n || out.includes(n.id)) continue
      out.push(n.id)
      stack.push(...this.childrenOf(n.id))
    }
    return out
  }

  /** Nœuds masqués car un ancêtre est replié. */
  hiddenIds(): Set<string> {
    const hidden = new Set<string>()
    for (const n of this.byId.values()) {
      if (n.collapsed) for (const d of this.descendantsOf(n.id)) hidden.add(d)
    }
    return hidden
  }

  depthOf(id: string): number {
    let depth = 0
    let cur = this.byId.get(id)
    const seen = new Set<string>()
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id)
      depth++
      cur = this.byId.get(cur.parentId)
    }
    return depth
  }

  nextChildOrder(parentId: string): number {
    const kids = this.childrenOf(parentId)
    return kids.length === 0 ? 0 : Math.max(...kids.map((k) => k.order)) + 1
  }

  /** Côté d'un nouvel enfant : équilibre gauche/droite à la racine, hérité ailleurs. */
  sideForNewChild(parentId: string): MindmapSide {
    const parent = this.byId.get(parentId)
    if (!parent) return 'right'
    if (parent.parentId !== null) return parent.side
    const kids = this.childrenOf(parentId)
    const right = kids.filter((k) => k.side === 'right').length
    return right <= kids.length - right ? 'right' : 'left'
  }

  /** Couleur d'un nouvel enfant direct de la racine (rotation dans la palette). */
  branchColorForNewChild(parentId: string): BranchColor {
    const index = this.childrenOf(parentId).length % BRANCH_COLORS.length
    return BRANCH_COLORS[index] ?? 'blue'
  }
}

/**
 * Calcule la position (coin haut-gauche) de chaque nœud visible. La racine reste à `rootPosition`.
 */
export function computeMindmapLayout(
  nodes: readonly MindmapNode[],
  rootId: string,
  rootPosition: Point,
  mode: MindmapLayoutMode,
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
): Map<string, Point> {
  const tree = new MindmapTree(nodes)
  const root = tree.get(rootId)
  const result = new Map<string, Point>()
  if (!root) return result
  result.set(root.id, rootPosition)
  if (mode === 'radial') layoutRadial(tree, root, rootPosition, options, result)
  else layoutTree(tree, root, rootPosition, options, result)
  return result
}

function layoutTree(
  tree: MindmapTree,
  root: MindmapNode,
  pos: Point,
  o: LayoutOptions,
  out: Map<string, Point>,
): void {
  const heights = new Map<string, number>()
  const subtreeHeight = (n: MindmapNode): number => {
    const cached = heights.get(n.id)
    if (cached !== undefined) return cached
    const kids = tree.visibleChildrenOf(n.id)
    const kidsHeight =
      kids.reduce((sum, k) => sum + subtreeHeight(k), 0) + o.vGap * Math.max(0, kids.length - 1)
    const h = Math.max(n.h, kidsHeight)
    heights.set(n.id, h)
    return h
  }

  const placeChildren = (
    parent: MindmapNode,
    parentPos: Point,
    kids: readonly MindmapNode[],
    side: MindmapSide,
  ) => {
    if (kids.length === 0) return
    const total = kids.reduce((s, k) => s + subtreeHeight(k), 0) + o.vGap * (kids.length - 1)
    let y = parentPos.y + parent.h / 2 - total / 2
    for (const k of kids) {
      const sh = subtreeHeight(k)
      const x = side === 'right' ? parentPos.x + parent.w + o.hGap : parentPos.x - o.hGap - k.w
      const p = { x, y: y + sh / 2 - k.h / 2 }
      out.set(k.id, p)
      placeChildren(k, p, tree.visibleChildrenOf(k.id), side)
      y += sh + o.vGap
    }
  }

  const rootKids = tree.visibleChildrenOf(root.id)
  placeChildren(
    root,
    pos,
    rootKids.filter((k) => k.side === 'right'),
    'right',
  )
  placeChildren(
    root,
    pos,
    rootKids.filter((k) => k.side === 'left'),
    'left',
  )
}

function layoutRadial(
  tree: MindmapTree,
  root: MindmapNode,
  pos: Point,
  o: LayoutOptions,
  out: Map<string, Point>,
): void {
  const leaves = new Map<string, number>()
  const leafCount = (n: MindmapNode): number => {
    const cached = leaves.get(n.id)
    if (cached !== undefined) return cached
    const kids = tree.visibleChildrenOf(n.id)
    const c = kids.length === 0 ? 1 : kids.reduce((s, k) => s + leafCount(k), 0)
    leaves.set(n.id, c)
    return c
  }
  const center = { x: pos.x + root.w / 2, y: pos.y + root.h / 2 }

  const place = (kids: readonly MindmapNode[], start: number, span: number, depth: number) => {
    const total = kids.reduce((s, k) => s + leafCount(k), 0)
    let angle = start
    for (const k of kids) {
      const wedge = (span * leafCount(k)) / total
      const theta = angle + wedge / 2
      const radius = o.radialFirstRing + (depth - 1) * o.radialRingGap
      out.set(k.id, {
        x: center.x + radius * Math.cos(theta) - k.w / 2,
        y: center.y + radius * Math.sin(theta) - k.h / 2,
      })
      // Le secteur des enfants est recentré sur le nœud et plafonné pour rester lisible.
      const childSpan = Math.min(wedge, o.radialMaxChildSpan)
      place(tree.visibleChildrenOf(k.id), theta - childSpan / 2, childSpan, depth + 1)
      angle += wedge
    }
  }
  place(tree.visibleChildrenOf(root.id), -Math.PI / 2, Math.PI * 2, 1)
}
