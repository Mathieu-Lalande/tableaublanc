import { join, resolve } from 'node:path'
import { createCanvasSchema, OBJECT_LANE_RECORD_TYPES } from '@canvas/shared'
import { loadEnv } from './config/env'
import { buildApp } from './app'
import { RoomManager } from './sync/roomManager'

const env = loadEnv()
const dataDir = resolve(env.DATA_DIR)

const placeholderLog = { info: () => {}, warn: () => {}, error: () => {} }
const rooms = new RoomManager({
  roomsDir: join(dataDir, 'rooms'),
  schema: createCanvasSchema(),
  objectTypes: OBJECT_LANE_RECORD_TYPES,
  log: placeholderLog,
})

const app = await buildApp({
  env,
  rooms,
  // P1 : accès ouvert en local uniquement. Remplacé par l'autorisation par board en P2.
  syncAuthorizer: {
    authorize: async () => ({ userId: 'dev', role: 'EDITOR' }),
  },
})
Object.assign(placeholderLog, {
  info: (o: object, m: string) => app.log.info(o, m),
  warn: (o: object, m: string) => app.log.warn(o, m),
  error: (o: object, m: string) => app.log.error(o, m),
})

const shutdown = async () => {
  await app.close()
  rooms.closeAll()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ host: env.HOST, port: env.PORT })
