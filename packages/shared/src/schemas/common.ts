import { z } from 'zod'

/** Identifiant de board : alphanumérique, utilisé aussi comme nom de fichier SQLite (pas de traversal). */
export const boardIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{8,64}$/, 'Identifiant de board invalide')

export type BoardId = z.infer<typeof boardIdSchema>

export const roleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER'])
export type Role = z.infer<typeof roleSchema>

/** Ordre croissant de privilèges. */
const ROLE_RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 }

export function hasAtLeastRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}

/** Code de sortie WebSocket applicatif (plage 4000-4999 réservée aux applications). */
export const WS_CLOSE_CODES = {
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
  BAD_REQUEST: 4400,
  REVOKED: 4409,
} as const
