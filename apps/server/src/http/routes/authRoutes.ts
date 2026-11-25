import type { FastifyInstance } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { registerInputSchema, updateMeInputSchema } from '@canvas/shared'
import type { Auth } from '../../auth/auth'
import { notFound } from '../../lib/errors'
import type { AccountService } from '../../services/accountService'
import { sendFetchResponse, toFetchRequest } from '../fetchBridge'
import { currentUser, requireAuth } from '../session'
import { parse } from '../validation'

export interface AuthRoutesOptions {
  readonly auth: Auth
  readonly accounts: AccountService
  readonly publicOrigin: string
}

/** Chemins Better Auth exposés au navigateur (liste blanche). */
const ALLOWED_AUTH_PATHS = new Set([
  '/api/auth/sign-in/username',
  '/api/auth/sign-out',
  '/api/auth/get-session',
])

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): Promise<void> {
  const { auth, accounts } = opts

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const path = new URL(req.url, opts.publicOrigin).pathname
      if (!ALLOWED_AUTH_PATHS.has(path)) throw notFound()
      const response = await auth.handler(toFetchRequest(req, opts.publicOrigin))
      return sendFetchResponse(reply, response)
    },
  })

  app.post(
    '/api/account/register',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const input = parse(registerInputSchema, req.body)
      const response = await accounts.register(input, fromNodeHeaders(req.headers))
      return sendFetchResponse(reply, response)
    },
  )

  app.get('/api/me', { preHandler: requireAuth(auth) }, async (req) =>
    accounts.getMe(currentUser(req).id),
  )

  app.patch('/api/me', { preHandler: requireAuth(auth) }, async (req) =>
    accounts.updateMe(currentUser(req).id, parse(updateMeInputSchema, req.body)),
  )
}
