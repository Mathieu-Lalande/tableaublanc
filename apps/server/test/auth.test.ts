import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/auth'
import { agent, createTestApp, registerUser, type TestApp } from './helpers/testApp'

describe('Auth', () => {
  let t: TestApp
  beforeAll(async () => {
    t = await createTestApp()
  })
  afterAll(() => t.close())

  it('hash les mots de passe en Argon2id', async () => {
    const hash = await hashPassword('un-mot-de-passe-solide')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword({ hash, password: 'un-mot-de-passe-solide' })).toBe(true)
    expect(await verifyPassword({ hash, password: 'mauvais' })).toBe(false)
  })

  it('refuse l’inscription sans code valide', async () => {
    const res = await agent(t.app)
      .post('/api/account/register')
      .send({ username: 'intrus', password: 'correct-horse-battery', signupCode: 'FAUX-CODE' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: "Code d'invitation invalide ou expiré" })
  })

  it('inscrit avec un code, pose un cookie httpOnly SameSite=Lax et ouvre la session', async () => {
    const a = agent(t.app)
    const res = await a
      .post('/api/account/register')
      .send({ username: 'alice', password: 'correct-horse-battery', signupCode: t.signupCode })
    expect(res.status).toBe(200)
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    const sessionCookie = cookies.find((c) => c.includes('session_token'))
    expect(sessionCookie).toMatch(/HttpOnly/i)
    expect(sessionCookie).toMatch(/SameSite=Lax/i)
    const me = await a.get('/api/me')
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({ username: 'alice' })
    expect(me.body.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('refuse un pseudo déjà pris', async () => {
    await registerUser(t, 'bob')
    const res = await agent(t.app)
      .post('/api/account/register')
      .send({ username: 'bob', password: 'correct-horse-battery', signupCode: t.signupCode })
    expect(res.status).toBe(409)
  })

  it('respecte le nombre d’utilisations d’un code', async () => {
    const single = t.container.signupCodes.create({ maxUses: 1 })
    const ok = await agent(t.app)
      .post('/api/account/register')
      .send({ username: 'carol', password: 'correct-horse-battery', signupCode: single })
    expect(ok.status).toBe(200)
    const ko = await agent(t.app)
      .post('/api/account/register')
      .send({ username: 'dave', password: 'correct-horse-battery', signupCode: single })
    expect(ko.status).toBe(400)
  })

  it('connecte par pseudo + mot de passe et refuse un mauvais mot de passe', async () => {
    await registerUser(t, 'erin')
    const good = await agent(t.app)
      .post('/api/auth/sign-in/username')
      .send({ username: 'erin', password: 'correct-horse-battery' })
    expect(good.status).toBe(200)
    const bad = await agent(t.app)
      .post('/api/auth/sign-in/username')
      .send({ username: 'erin', password: 'wrong-password-123' })
    expect(bad.status).toBe(401)
  })

  it('bloque l’inscription publique Better Auth', async () => {
    const res = await agent(t.app)
      .post('/api/auth/sign-up/email')
      .send({ email: 'x@y.z', password: 'correct-horse-battery', name: 'x' })
    expect(res.status).toBe(404)
  })

  it('rejette une requête mutante sans en-tête CSRF ou d’une autre origine', async () => {
    const { agent: a } = await registerUser(t, 'frank')
    const noHeader = await a.raw
      .post('/api/boards')
      .set('origin', 'http://localhost:5173')
      .send({ name: 'x' })
    expect(noHeader.status).toBe(403)
    const evil = await a.raw
      .post('/api/boards')
      .set('origin', 'https://evil.example')
      .set('x-canvas-csrf', '1')
      .send({ name: 'x' })
    expect(evil.status).toBe(403)
  })

  it('exige une session pour l’API', async () => {
    const res = await agent(t.app).get('/api/boards')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Authentification requise' })
  })

  it('envoie les en-têtes de sécurité (CSP)', async () => {
    const res = await agent(t.app).get('/api/health')
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })
})
