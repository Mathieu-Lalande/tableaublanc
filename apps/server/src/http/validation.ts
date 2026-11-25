import type { z } from 'zod'
import { badRequest } from '../lib/errors'

/** Valide une entrée avec Zod ; toute erreur devient un 400 générique (pas de fuite de détails). */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data)
  if (!result.success) throw badRequest()
  return result.data
}
