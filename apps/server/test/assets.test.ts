import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, registerUser, type TestApp } from './helpers/testApp'

// PNG 1x1 valide.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Assets', () => {
  let t: TestApp
  let owner: Awaited<ReturnType<typeof registerUser>>
  let stranger: Awaited<ReturnType<typeof registerUser>>
  let boardId: string

  beforeAll(async () => {
    t = await createTestApp()
    owner = await registerUser(t, 'owner')
    stranger = await registerUser(t, 'stranger')
    boardId = (await owner.agent.post('/api/boards').send({ name: 'Images' })).body.id
  })
  afterAll(() => t.close())

  it('accepte une vraie image PNG et la sert avec des en-têtes sûrs', async () => {
    const res = await owner.agent
      .post(`/api/boards/${boardId}/assets`)
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.src).toMatch(/^\/api\/assets\/[0-9a-f-]{36}$/)

    const file = await owner.agent.get(res.body.src)
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toBe('image/png')
    expect(file.headers['x-content-type-options']).toBe('nosniff')
    expect(file.headers['content-security-policy']).toBe("default-src 'none'")
  })

  it('rejette un fichier déguisé (type MIME réel vérifié)', async () => {
    const fake = Buffer.from('<svg onload="alert(1)"></svg>')
    const res = await owner.agent
      .post(`/api/boards/${boardId}/assets`)
      .attach('file', fake, { filename: 'evil.png', contentType: 'image/png' })
    expect(res.status).toBe(415)
  })

  it('refuse un fichier trop volumineux', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(11 * 1024 * 1024)])
    const res = await owner.agent
      .post(`/api/boards/${boardId}/assets`)
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' })
    expect(res.status).toBe(413)
  })

  it('ne sert pas un asset à un non-membre', async () => {
    const up = await owner.agent
      .post(`/api/boards/${boardId}/assets`)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
    expect((await stranger.agent.get(up.body.src)).status).toBe(404)
  })

  it('un non-membre ne peut pas uploader', async () => {
    const res = await stranger.agent
      .post(`/api/boards/${boardId}/assets`)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
    expect(res.status).toBe(404)
  })
})
