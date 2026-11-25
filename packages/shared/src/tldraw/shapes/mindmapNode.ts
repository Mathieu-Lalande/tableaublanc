import {
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  type RecordProps,
  type TLShape,
  type TLDefaultColorStyle,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import type { MindmapLayoutMode, MindmapSide } from '../../logic/mindmap'

export const MINDMAP_NODE_TYPE = 'mindmap-node'

export interface MindmapNodeProps {
  w: number
  h: number
  text: string
  color: TLDefaultColorStyle
  /** Identifiant de la racine de la carte (la racine porte son propre id). */
  mapId: string
  /** Nœud parent ('' pour la racine). */
  parentNodeId: string
  side: MindmapSide
  order: number
  collapsed: boolean
  /** Mode de disposition (lu sur la racine). */
  layout: MindmapLayoutMode
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    [MINDMAP_NODE_TYPE]: MindmapNodeProps
  }
}

export const mindmapNodeProps: RecordProps<TLShape<typeof MINDMAP_NODE_TYPE>> = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  text: T.string,
  // Style tldraw : la couleur est modifiable depuis le panneau de styles natif.
  color: DefaultColorStyle,
  mapId: T.string,
  parentNodeId: T.string,
  side: T.literalEnum('left', 'right'),
  order: T.number,
  collapsed: T.boolean,
  layout: T.literalEnum('tree', 'radial'),
}

export const mindmapNodeMigrations = createShapePropsMigrationSequence({ sequence: [] })
