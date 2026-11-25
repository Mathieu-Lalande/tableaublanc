import type { SchemaPropsInfo } from '@tldraw/tlschema'
import { MINDMAP_NODE_TYPE, mindmapNodeMigrations, mindmapNodeProps } from './mindmapNode'

export * from './mindmapNode'

/** Schémas des shapes custom, validés par le serveur sync (props + migrations). */
export const customShapeSchemas: Record<string, SchemaPropsInfo> = {
  [MINDMAP_NODE_TYPE]: { props: mindmapNodeProps, migrations: mindmapNodeMigrations },
}
