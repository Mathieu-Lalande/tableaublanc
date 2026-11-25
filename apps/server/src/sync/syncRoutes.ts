import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { boardIdSchema } from '@canvas/shared'
import type { RoomManager, SessionMeta } from './roomManager'

export type SyncAccess = SessionMeta

/** Décide si la requête d'upgrade peut rejoindre la room. Implémenté par le module boards en P2. */
export interface SyncAuthorizer {
  authorize(
    req: FastifyRequest,
    boardId: string,
  ): Promise<SyncAccess | 'UNAUTHORIZED' | 'FORBIDDEN'>
}

const paramsSchema = z.object({ boardId: boardIdSchema })
const querySchema = z.object({ sessionId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/) })

declare module 'fastify' {
  interface FastifyRequest {
    syncAccess?: SyncAccess
  }
}

export interface SyncRoutesOptions {
  readonly rooms: RoomManager
  readonly authorizer: SyncAuthorizer
  readonly allowedOrigins: readonly string[]
}

/**
 * Point d'entrée WebSocket du sync tldraw. Toute la vérification (Origin, session, droits)
 * se fait dans `preValidation`, donc AVANT l'upgrade : une requête refusée reçoit une réponse
 * HTTP 4xx et aucune socket n'est ouverte.
 */
export async function syncRoutes(app: FastifyInstance, opts: SyncRoutesOptions): Promise<void> {
  app.get(
    '/api/sync/:boardId',
    {
      websocket: true,
      preValidation: async (req, reply) => {
        // Protection Cross-Site WebSocket Hijacking : les navigateurs envoient toujours Origin.
        const origin = req.headers.origin
        if (!origin || !opts.allowedOrigins.includes(origin)) {
          return reply.code(403).send({ error: 'Forbidden' })
        }
        const params = paramsSchema.safeParse(req.params)
        const query = querySchema.safeParse(req.query)
        if (!params.success || !query.success) {
          return reply.code(400).send({ error: 'Bad request' })
        }
        const access = await opts.authorizer.authorize(req, params.data.boardId)
        if (access === 'UNAUTHORIZED') return reply.code(401).send({ error: 'Unauthorized' })
        if (access === 'FORBIDDEN') return reply.code(403).send({ error: 'Forbidden' })
        req.syncAccess = access
      },
    },
    (socket, req) => {
      const { boardId } = paramsSchema.parse(req.params)
      const { sessionId } = querySchema.parse(req.query)
      const access = req.syncAccess
      if (!access) {
        socket.close(1011, 'Internal error')
        return
      }
      // Chargement synchrone (better-sqlite3) : aucun message ne peut être perdu entre
      // l'ouverture de la socket et l'attachement des listeners par TLSocketRoom.
      opts.rooms.connect({ boardId, sessionId, socket, meta: access })
    },
  )
}
