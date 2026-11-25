import { loadEnv } from './config/env'
import { buildApp } from './app'
import { createContainer } from './container'
import type { RoomLogger } from './sync/roomManager'

const env = loadEnv()

// Le logger Fastify n'existe qu'après buildApp : on lui délègue via un proxy minimal.
const target: { current?: RoomLogger } = {}
const log: RoomLogger = {
  info: (o, m) => target.current?.info(o, m),
  warn: (o, m) => target.current?.warn(o, m),
  error: (o, m) => target.current?.error(o, m),
}

const container = createContainer(env, log)
const app = await buildApp(container)
target.current = {
  info: (o, m) => app.log.info(o, m),
  warn: (o, m) => app.log.warn(o, m),
  error: (o, m) => app.log.error(o, m),
}

// Bootstrap e2e uniquement : code d'inscription connu, jamais en production.
if (env.NODE_ENV !== 'production' && process.env.E2E_SIGNUP_CODE) {
  try {
    container.signupCodes.create({ maxUses: 1000, code: process.env.E2E_SIGNUP_CODE })
  } catch {
    // déjà créé lors d'un précédent démarrage
  }
}

const shutdown = async () => {
  await app.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ host: env.HOST, port: env.PORT })
