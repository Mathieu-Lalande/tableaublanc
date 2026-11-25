import type { FastifyReply, FastifyRequest } from 'fastify'

/** Convertit une requête Fastify en `Request` Fetch (pour le handler Better Auth). */
export function toFetchRequest(req: FastifyRequest, publicOrigin: string): Request {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else headers.set(key, value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined
  return new Request(new URL(req.url, publicOrigin), {
    method: req.method,
    headers,
    ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
  })
}

/** Relaie une `Response` Fetch (statut, cookies, corps) vers Fastify. */
export interface SendOptions {
  /**
   * Remplace un corps de succès par `{ ok: true }` : Better Auth renvoie le token de session
   * dans le JSON, ce qui l'exposerait au JavaScript (le cookie httpOnly suffit).
   */
  readonly redactSuccessBody?: boolean
}

export async function sendFetchResponse(
  reply: FastifyReply,
  response: Response,
  { redactSuccessBody = false }: SendOptions = {},
): Promise<FastifyReply> {
  reply.status(response.status)
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'content-length') {
      reply.header(key, value)
    }
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) reply.header('set-cookie', cookies)
  if (redactSuccessBody && response.ok) {
    reply.header('content-type', 'application/json; charset=utf-8')
    return reply.send({ ok: true })
  }
  const text = await response.text()
  return reply.send(text.length > 0 ? text : null)
}
