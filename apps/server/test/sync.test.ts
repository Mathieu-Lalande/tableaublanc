import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TLRecord } from '@tldraw/tlschema'
import { chatMessageId, type ChatMessageRecord } from '@canvas/shared'
import { connectSyncClient, upgradeStatus } from './helpers/syncClient'
import { createTestApp, ORIGIN, registerUser, type TestApp } from './helpers/testApp'

const cookieHeader = (setCookie: unknown) =>
  ([] as string[])
    .concat((setCookie as string[] | undefined) ?? [])
    .map((c) => c.split(';')[0])
    .join('; ')

const newPage = (id: string): TLRecord =>
  ({ id: `page:${id}`, typeName: 'page', name: id, index: 'a9', meta: {} }) as TLRecord

const waitFor = async (predicate: () => boolean, timeout = 3000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 25))
  }
}

describe('Serveur sync', () => {
  let t: TestApp
  let base: string
  let boardId: string
  let ownerCookie: string
  let viewerCookie: string
  let strangerCookie: string

  beforeAll(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    base = `ws://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`

    const owner = await registerUser(t, 'owner')
    const viewer = await registerUser(t, 'viewer')
    const stranger = await registerUser(t, 'stranger')
    ownerCookie = cookieHeader(owner.cookie)
    viewerCookie = cookieHeader(viewer.cookie)
    strangerCookie = cookieHeader(stranger.cookie)
    boardId = (await owner.agent.post('/api/boards').send({ name: 'Sync' })).body.id
    const invite = await owner.agent.post(`/api/boards/${boardId}/invites`).send({ role: 'VIEWER' })
    await viewer.agent.post(`/api/invites/${invite.body.token}/accept`).expect(200)
  })
  afterAll(() => t.close())

  const url = (id = boardId, session = 'sess-1') => `${base}/api/sync/${id}?sessionId=${session}`

  it('refuse la connexion sans session (401, avant l’upgrade)', async () => {
    expect(await upgradeStatus(url(), { origin: ORIGIN })).toBe(401)
  })

  it('refuse un non-membre (403)', async () => {
    expect(await upgradeStatus(url(), { origin: ORIGIN, cookie: strangerCookie })).toBe(403)
  })

  it('refuse une origine étrangère (protection CSWSH)', async () => {
    expect(
      await upgradeStatus(url(), { origin: 'https://evil.example', cookie: ownerCookie }),
    ).toBe(403)
  })

  it('refuse un identifiant de board invalide', async () => {
    expect(await upgradeStatus(url('../../x'), { origin: ORIGIN, cookie: ownerCookie })).not.toBe(
      101,
    )
  })

  it('accepte le propriétaire et synchronise ses écritures', async () => {
    const owner = await connectSyncClient(url(boardId, 'owner-a'), ownerCookie)
    const other = await connectSyncClient(url(boardId, 'owner-b'), ownerCookie)
    expect(owner.isReadonly).toBe(false)
    owner.store.put([newPage('fromOwner')])
    await waitFor(() => other.store.has('page:fromOwner' as TLRecord['id']))
    owner.close()
    other.close()
  })

  it('un VIEWER est en lecture seule CÔTÉ SERVEUR : ses écritures ne sont pas propagées', async () => {
    const viewer = await connectSyncClient(url(boardId, 'viewer-a'), viewerCookie)
    const owner = await connectSyncClient(url(boardId, 'owner-c'), ownerCookie)
    expect(viewer.isReadonly).toBe(true)

    // On contourne volontairement l'UI : écriture directe dans le store du client.
    viewer.store.put([newPage('fromViewer')])
    await new Promise((r) => setTimeout(r, 500))
    expect(owner.store.has('page:fromViewer' as TLRecord['id'])).toBe(false)

    // Une nouvelle connexion ne voit pas non plus la page (rien n'a été persisté).
    const fresh = await connectSyncClient(url(boardId, 'owner-d'), ownerCookie)
    expect(fresh.store.has('page:fromViewer' as TLRecord['id'])).toBe(false)
    viewer.close()
    owner.close()
    fresh.close()
  })

  it('chat : un VIEWER peut écrire, et le serveur impose l’auteur (anti-usurpation)', async () => {
    const viewer = await connectSyncClient(url(boardId, 'viewer-chat'), viewerCookie)
    const owner = await connectSyncClient(url(boardId, 'owner-chat'), ownerCookie)
    const id = chatMessageId('m1')
    const forged: ChatMessageRecord = {
      id,
      typeName: 'chat_message',
      authorId: 'someone-else',
      authorName: 'owner',
      authorColor: '#000000',
      text: '  salut  ',
      createdAt: 0,
    }
    viewer.store.put([forged as unknown as TLRecord])
    await waitFor(() => owner.store.has(id as unknown as TLRecord['id']))
    const received = owner.store.get(
      id as unknown as TLRecord['id'],
    ) as unknown as ChatMessageRecord
    expect(received.authorName).toBe('viewer')
    expect(received.authorId).not.toBe('someone-else')
    expect(received.text).toBe('salut')
    expect(received.createdAt).toBeGreaterThan(0)

    // Modification refusée : le texte ne change pas côté propriétaire.
    viewer.store.update(
      id as unknown as TLRecord['id'],
      (r) => ({ ...r, text: 'modifié' }) as TLRecord,
    )
    await new Promise((r) => setTimeout(r, 400))
    expect(
      (owner.store.get(id as unknown as TLRecord['id']) as unknown as ChatMessageRecord).text,
    ).toBe('salut')
    viewer.close()
    owner.close()
  })
})
