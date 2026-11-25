import type { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly body?: unknown
}

/**
 * Client HTTP de l'API : même origine, cookies de session, en-tête anti-CSRF sur toutes
 * les requêtes, réponses validées par Zod.
 */
export async function api<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = 'GET', body }: RequestOptions = {},
): Promise<z.infer<S>> {
  const res = await send(path, method, body)
  return schema.parse(await res.json())
}

/** Variante sans corps de réponse attendu (204). */
export async function apiVoid(
  path: string,
  { method = 'POST', body }: RequestOptions = {},
): Promise<void> {
  await send(path, method, body)
}

async function send(path: string, method: string, body: unknown): Promise<Response> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      'x-canvas-csrf': '1',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    let message = 'Une erreur est survenue'
    try {
      const data = (await res.json()) as { error?: unknown; message?: unknown }
      if (typeof data.error === 'string') message = data.error
    } catch {
      // corps non JSON : message générique
    }
    throw new ApiError(res.status, message)
  }
  return res
}
