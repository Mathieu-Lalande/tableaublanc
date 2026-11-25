import { describe, expect, it } from 'vitest'
import { computeMindmapLayout, MindmapTree, type MindmapNode, type Point } from './mindmap'

function at(map: Map<string, Point>, id: string): Point {
  const p = map.get(id)
  if (!p) throw new Error(`position manquante : ${id}`)
  return p
}

const node = (
  id: string,
  parentId: string | null,
  extra: Partial<MindmapNode> = {},
): MindmapNode => ({
  id,
  parentId,
  w: 100,
  h: 40,
  order: 0,
  collapsed: false,
  side: 'right',
  ...extra,
})

describe('MindmapTree', () => {
  const nodes = [
    node('root', null),
    node('a', 'root', { order: 1 }),
    node('b', 'root', { order: 0, side: 'left' }),
    node('a1', 'a'),
    node('a11', 'a1'),
  ]
  const tree = new MindmapTree(nodes)

  it('trie les enfants par ordre', () => {
    expect(tree.childrenOf('root').map((n) => n.id)).toEqual(['b', 'a'])
  })
  it('liste les descendants', () => {
    expect(tree.descendantsOf('a').sort()).toEqual(['a1', 'a11'])
  })
  it('calcule la profondeur', () => {
    expect(tree.depthOf('a11')).toBe(3)
    expect(tree.depthOf('root')).toBe(0)
  })
  it('masque les descendants d’un nœud replié', () => {
    const t = new MindmapTree(nodes.map((n) => (n.id === 'a' ? { ...n, collapsed: true } : n)))
    expect([...t.hiddenIds()].sort()).toEqual(['a1', 'a11'])
  })
  it('équilibre les côtés à la racine et hérite ensuite', () => {
    expect(tree.sideForNewChild('root')).toBe('right')
    const t2 = new MindmapTree([node('root', null), node('x', 'root')])
    expect(t2.sideForNewChild('root')).toBe('left')
    expect(tree.sideForNewChild('b')).toBe('left')
  })
  it('donne l’ordre suivant et une couleur de branche tournante', () => {
    expect(tree.nextChildOrder('root')).toBe(2)
    expect(tree.nextChildOrder('a11')).toBe(0)
    expect(tree.branchColorForNewChild('root')).toBe('green')
  })
  it('résiste aux cycles', () => {
    const cyc = new MindmapTree([node('x', 'y'), node('y', 'x')])
    expect(cyc.depthOf('x')).toBeLessThan(5)
  })
})

describe('computeMindmapLayout (arbre)', () => {
  it('place la racine à sa position et les enfants à droite/gauche', () => {
    const pos = computeMindmapLayout(
      [node('root', null), node('r', 'root'), node('l', 'root', { side: 'left' })],
      'root',
      { x: 0, y: 0 },
      'tree',
    )
    expect(pos.get('root')).toEqual({ x: 0, y: 0 })
    expect(at(pos, 'r').x).toBeGreaterThan(100)
    expect(at(pos, 'l').x).toBeLessThan(0)
    // Un enfant unique est centré verticalement sur son parent.
    expect(at(pos, 'r').y).toBe(0)
  })

  it('empile les frères sans chevauchement', () => {
    const pos = computeMindmapLayout(
      [
        node('root', null),
        node('a', 'root', { order: 0 }),
        node('b', 'root', { order: 1 }),
        node('c', 'root', { order: 2 }),
      ],
      'root',
      { x: 0, y: 0 },
      'tree',
    )
    const [ya, yb, yc] = ['a', 'b', 'c'].map((id) => at(pos, id).y) as [number, number, number]
    expect(yb - ya).toBeGreaterThanOrEqual(40)
    expect(yc - yb).toBeGreaterThanOrEqual(40)
    // Le groupe est centré sur la racine.
    expect((ya + yc) / 2).toBeCloseTo(0)
  })

  it('ne positionne pas les descendants d’un nœud replié', () => {
    const pos = computeMindmapLayout(
      [node('root', null), node('a', 'root', { collapsed: true }), node('a1', 'a')],
      'root',
      { x: 0, y: 0 },
      'tree',
    )
    expect(pos.has('a')).toBe(true)
    expect(pos.has('a1')).toBe(false)
  })

  it('renvoie une carte vide si la racine est absente', () => {
    expect(computeMindmapLayout([], 'nope', { x: 0, y: 0 }, 'tree').size).toBe(0)
  })
})

describe('computeMindmapLayout (radial)', () => {
  it('place les enfants directs sur le premier anneau autour de la racine', () => {
    const nodes = [
      node('root', null),
      node('a', 'root', { order: 0 }),
      node('b', 'root', { order: 1 }),
      node('c', 'root', { order: 2 }),
    ]
    const pos = computeMindmapLayout(nodes, 'root', { x: 0, y: 0 }, 'radial')
    const center = { x: 50, y: 20 }
    for (const id of ['a', 'b', 'c']) {
      const p = at(pos, id)
      const d = Math.hypot(p.x + 50 - center.x, p.y + 20 - center.y)
      expect(d).toBeCloseTo(240)
    }
  })

  it('éloigne les petits-enfants sur l’anneau suivant', () => {
    const pos = computeMindmapLayout(
      [node('root', null), node('a', 'root'), node('a1', 'a')],
      'root',
      { x: 0, y: 0 },
      'radial',
    )
    const p = at(pos, 'a1')
    expect(Math.hypot(p.x + 50 - 50, p.y + 20 - 20)).toBeCloseTo(440)
  })
})
