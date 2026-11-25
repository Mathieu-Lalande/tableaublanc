import type { CustomRecordInfo } from '@tldraw/tlschema'

/** Records custom (ex. messages de chat). */
export const customRecordSchemas: Record<string, CustomRecordInfo> = {}

/**
 * Types de records rangés dans la "object lane" de tldraw sync : leur droit d'écriture
 * est contrôlé par `objectAccess` et non par `isReadonly` (un VIEWER peut donc chatter).
 */
export const OBJECT_LANE_RECORD_TYPES: readonly string[] = []
