import type { FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import type { Auth } from '../auth/auth'
import { unauthorized } from '../lib/errors'

export interface SessionUser {
  readonly id: string
}

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser?: SessionUser
  }
}

/** Lit et valide la session Better Auth à partir des cookies de la requête. */
export async function readSessionUser(
  auth: Auth,
  req: FastifyRequest,
): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  return session ? { id: session.user.id } : null
}

/** preHandler : exige une session valide. */
export function requireAuth(auth: Auth) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = await readSessionUser(auth, req)
    if (!user) throw unauthorized()
    req.sessionUser = user
  }
}

export function currentUser(req: FastifyRequest): SessionUser {
  if (!req.sessionUser) throw unauthorized()
  return req.sessionUser
}
