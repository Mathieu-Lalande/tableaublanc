import Fastify, { type FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'
import type { Env } from './config/env'
import type { RoomManager } from './sync/roomManager'
import { syncRoutes, type SyncAuthorizer } from './sync/syncRoutes'

export interface AppDeps {
  readonly env: Env
  readonly rooms: RoomManager
  readonly syncAuthorizer: SyncAuthorizer
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.env.NODE_ENV === 'test' ? false : { level: deps.env.LOG_LEVEL },
    trustProxy: deps.env.NODE_ENV === 'production',
  })
  await app.register(websocket, { options: { maxPayload: 16 * 1024 * 1024 } })
  await app.register(syncRoutes, {
    rooms: deps.rooms,
    authorizer: deps.syncAuthorizer,
    allowedOrigins: [deps.env.PUBLIC_ORIGIN],
  })
  app.get('/api/health', async () => ({ ok: true }))
  return app
}
