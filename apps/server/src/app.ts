import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import type { Container } from './container'
import security from './http/plugins/security'
import { assetRoutes } from './http/routes/assetRoutes'
import { authRoutes } from './http/routes/authRoutes'
import { boardRoutes } from './http/routes/boardRoutes'
import { gameRoutes } from './http/routes/gameRoutes'
import { inviteRoutes } from './http/routes/inviteRoutes'
import { syncRoutes } from './sync/syncRoutes'

export async function buildApp(c: Container): Promise<FastifyInstance> {
  const { env } = c
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.LOG_LEVEL },
    // Un seul saut de proxy de confiance (Caddy) : req.ip n'est pas falsifiable via X-Forwarded-For.
    trustProxy: env.NODE_ENV === 'production' ? (_address: string, hop: number) => hop < 1 : false,
    bodyLimit: 1024 * 1024,
  })

  await app.register(security, {
    publicOrigin: env.PUBLIC_ORIGIN,
    isTest: env.NODE_ENV === 'test',
    rateLimitMultiplier: env.RATE_LIMIT_MULTIPLIER,
  })
  await app.register(multipart, { limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1, fields: 5 } })
  await app.register(websocket, { options: { maxPayload: 16 * 1024 * 1024 } })

  app.get('/api/health', async () => ({ ok: true }))
  await app.register(authRoutes, {
    auth: c.auth,
    accounts: c.accounts,
    publicOrigin: env.PUBLIC_ORIGIN,
    rateLimitMultiplier: env.RATE_LIMIT_MULTIPLIER,
  })
  await app.register(boardRoutes, { auth: c.auth, boards: c.boards, invites: c.invites })
  await app.register(inviteRoutes, { auth: c.auth, invites: c.invites })
  await app.register(assetRoutes, { auth: c.auth, assets: c.assets })
  await app.register(gameRoutes, { auth: c.auth, accounts: c.accounts, pictionary: c.pictionary })
  await app.register(syncRoutes, {
    rooms: c.rooms,
    authorizer: c.syncAuthorizer,
    allowedOrigins: [new URL(env.PUBLIC_ORIGIN).origin],
  })

  // Production : le serveur sert aussi le front buildé (même origine → pas de CORS).
  const webDist = env.WEB_DIST_DIR ? resolve(env.WEB_DIST_DIR) : undefined
  if (webDist && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false, index: ['index.html'] })
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html')
      return reply.code(404).send({ error: 'Ressource introuvable' })
    })
  }

  app.addHook('onClose', async () => {
    c.pictionary.dispose()
    c.rooms.closeAll()
    c.dbHandle.sqlite.close()
  })
  return app
}
