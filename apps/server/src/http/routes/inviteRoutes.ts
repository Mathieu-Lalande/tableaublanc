import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { inviteTokenSchema } from '@canvas/shared'
import type { Auth } from '../../auth/auth'
import type { InviteService } from '../../services/inviteService'
import { currentUser, requireAuth } from '../session'
import { parse } from '../validation'

const tokenParams = z.object({ token: inviteTokenSchema })

export async function inviteRoutes(
  app: FastifyInstance,
  opts: { auth: Auth; invites: InviteService },
): Promise<void> {
  app.addHook('preHandler', requireAuth(opts.auth))

  app.get(
    '/api/invites/:token',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req) => {
      const { token } = parse(tokenParams, req.params)
      return opts.invites.preview(token)
    },
  )

  app.post(
    '/api/invites/:token/accept',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req) => {
      const { token } = parse(tokenParams, req.params)
      return opts.invites.accept(token, currentUser(req).id)
    },
  )
}
