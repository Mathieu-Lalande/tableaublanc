import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { boardIdSchema } from '@canvas/shared'
import type { Auth } from '../../auth/auth'
import type { AccountService } from '../../services/accountService'
import type { PictionaryService } from '../../services/pictionaryService'
import { currentUser, requireAuth } from '../session'
import { parse } from '../validation'

const params = z.object({
  boardId: boardIdSchema,
  shapeId: z.string().regex(/^shape:[A-Za-z0-9_-]{1,64}$/),
})
const guessBody = z.object({ guess: z.string().trim().min(1).max(80) })

export async function gameRoutes(
  app: FastifyInstance,
  opts: { auth: Auth; accounts: AccountService; pictionary: PictionaryService },
): Promise<void> {
  // Horloge serveur : sert aux clients à corriger leur décalage (minuteur, fin de manche).
  app.get('/api/time', async () => ({ now: Date.now() }))

  await app.register(async (scoped) => {
    scoped.addHook('preHandler', requireAuth(opts.auth))
    const userOf = (id: string) => ({ id, name: opts.accounts.getMe(id).username })
    const base = '/api/boards/:boardId/pictionary/:shapeId'

    scoped.post(`${base}/start`, async (req) => {
      const { boardId, shapeId } = parse(params, req.params)
      return opts.pictionary.start(boardId, shapeId, userOf(currentUser(req).id))
    })

    scoped.get(`${base}/word`, async (req) => {
      const { boardId, shapeId } = parse(params, req.params)
      return opts.pictionary.word(boardId, shapeId, currentUser(req).id)
    })

    scoped.post(
      `${base}/guess`,
      { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
      async (req) => {
        const { boardId, shapeId } = parse(params, req.params)
        const { guess } = parse(guessBody, req.body)
        return opts.pictionary.guess(boardId, shapeId, userOf(currentUser(req).id), guess)
      },
    )

    scoped.post(`${base}/skip`, async (req, reply) => {
      const { boardId, shapeId } = parse(params, req.params)
      await opts.pictionary.skip(boardId, shapeId, currentUser(req).id)
      return reply.code(204).send()
    })
  })
}
