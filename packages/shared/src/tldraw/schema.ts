import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
  type SchemaPropsInfo,
  type CustomRecordInfo,
  type TLSchema,
} from '@tldraw/tlschema'
import { customShapeSchemas } from './shapes'
import { customRecordSchemas, OBJECT_LANE_RECORD_TYPES } from './records'

export { OBJECT_LANE_RECORD_TYPES }

const shapes: Record<string, SchemaPropsInfo> = { ...defaultShapeSchemas, ...customShapeSchemas }
const records: Record<string, CustomRecordInfo> = { ...customRecordSchemas }

/**
 * Schéma tldraw unique, partagé par le client et le serveur.
 * Le serveur valide chaque record reçu contre ce schéma : toute shape custom
 * doit donc être déclarée ici (props + migrations), sans dépendance React.
 */
export function createCanvasSchema(): TLSchema {
  return createTLSchema({ shapes, bindings: defaultBindingSchemas, records })
}
