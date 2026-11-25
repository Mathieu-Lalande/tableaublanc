import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { buildApp } from '../../src/app'
import { loadEnv } from '../../src/config/env'
import { createContainer, type Container } from '../../src/container'

export const ORIGIN = 'http://localhost:5173'

export interface TestApp {
  readonly app: FastifyInstance
  readonly container: Container
  readonly signupCode: string
  close(): Promise<void>
}

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }

export async function createTestApp(): Promise<TestApp> {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'canvas-test-')),
    PUBLIC_ORIGIN: ORIGIN,
    AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
  })
  const container = createContainer(env, silentLog)
  const app = await buildApp(container)
  await app.ready()
  const signupCode = container.signupCodes.create({ maxUses: 100 })
  return { app, container, signupCode, close: () => app.close() }
}

/** Agent supertest qui conserve les cookies et envoie les en-têtes anti-CSRF. */
export function agent(app: FastifyInstance) {
  const a = request.agent(app.server)
  return {
    raw: a,
    get: (url: string) => a.get(url).set('origin', ORIGIN),
    post: (url: string) => a.post(url).set('origin', ORIGIN).set('x-canvas-csrf', '1'),
    patch: (url: string) => a.patch(url).set('origin', ORIGIN).set('x-canvas-csrf', '1'),
    put: (url: string) => a.put(url).set('origin', ORIGIN).set('x-canvas-csrf', '1'),
    delete: (url: string) => a.delete(url).set('origin', ORIGIN).set('x-canvas-csrf', '1'),
  }
}

export type Agent = ReturnType<typeof agent>

export async function registerUser(
  t: TestApp,
  username: string,
  password = 'correct-horse-battery',
) {
  const a = agent(t.app)
  const res = await a
    .post('/api/account/register')
    .send({ username, password, signupCode: t.signupCode })
  if (res.status !== 200)
    throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`)
  const me = await a.get('/api/me')
  return { agent: a, id: (me.body as { id: string }).id, cookie: res.headers['set-cookie'] }
}
