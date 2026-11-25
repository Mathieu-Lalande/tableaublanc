import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TLRecord, TLShape } from '@tldraw/tlschema'
import { connectSyncClient, type ConnectedClient } from './helpers/syncClient'
import { createTestApp, registerUser, type TestApp } from './helpers/testApp'

type Shape<K extends TLShape['type']> = TLShape<K>

const cookieHeader = (setCookie: unknown) =>
  ([] as string[])
    .concat((setCookie as string[] | undefined) ?? [])
    .map((c) => c.split(';')[0])
    .join('; ')

const waitFor = async (predicate: () => boolean, timeout = 3000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 25))
  }
}
const settle = () => new Promise((r) => setTimeout(r, 400))

function baseShape<K extends TLShape['type']>(
  id: string,
  type: K,
  props: Shape<K>['props'],
): Shape<K> {
  return {
    id: `shape:${id}`,
    typeName: 'shape',
    type,
    x: 0,
    y: 0,
    rotation: 0,
    index: 'a1',
    parentId: 'page:page',
    isLocked: false,
    opacity: 1,
    meta: {},
    props,
  } as unknown as Shape<K>
}

function get<K extends TLShape['type']>(client: ConnectedClient, id: string): Shape<K> | undefined {
  return client.store.get(id as TLRecord['id']) as Shape<K> | undefined
}

describe('Jeux : règles imposées par le serveur', () => {
  let t: TestApp
  let base: string
  let boardId: string
  let owner: Awaited<ReturnType<typeof registerUser>>
  let friend: Awaited<ReturnType<typeof registerUser>>
  let viewer: Awaited<ReturnType<typeof registerUser>>
  let ownerClient: ConnectedClient
  let friendClient: ConnectedClient
  let viewerClient: ConnectedClient

  beforeAll(async () => {
    t = await createTestApp()
    await t.app.listen({ port: 0, host: '127.0.0.1' })
    base = `ws://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`
    owner = await registerUser(t, 'owner')
    friend = await registerUser(t, 'friend')
    viewer = await registerUser(t, 'viewer')
    boardId = (await owner.agent.post('/api/boards').send({ name: 'Jeux' })).body.id
    for (const [u, role] of [
      [friend, 'EDITOR'],
      [viewer, 'VIEWER'],
    ] as const) {
      const inv = await owner.agent.post(`/api/boards/${boardId}/invites`).send({ role })
      await u.agent.post(`/api/invites/${inv.body.token}/accept`).expect(200)
    }
    const url = (s: string) => `${base}/api/sync/${boardId}?sessionId=${s}`
    ownerClient = await connectSyncClient(url('o'), cookieHeader(owner.cookie))
    friendClient = await connectSyncClient(url('f'), cookieHeader(friend.cookie))
    viewerClient = await connectSyncClient(url('v'), cookieHeader(viewer.cookie))
    // Page par défaut nécessaire comme parent des shapes.
    ownerClient.store.put([
      { id: 'page:page', typeName: 'page', name: 'P', index: 'a1', meta: {} } as TLRecord,
    ])
    await waitFor(() => friendClient.store.has('page:page' as TLRecord['id']))
  })
  afterAll(async () => {
    ownerClient.close()
    friendClient.close()
    viewerClient.close()
    await t.close()
  })

  it('morpion : création assainie, places, coups légaux seulement', async () => {
    const forged = baseShape('ttt', 'tictactoe', {
      w: 300,
      h: 340,
      cells: 'XXX......',
      next: 'O',
      playerAId: 'someone',
      playerAName: 'X',
      playerBId: '',
      playerBName: '',
      winner: 'X',
      winLine: '0,1,2',
    })
    ownerClient.store.put([forged as TLRecord])
    await waitFor(() => get(friendClient, 'shape:ttt') !== undefined)
    const created = get<'tictactoe'>(friendClient, 'shape:ttt')
    expect(created?.props.cells).toBe('.........')
    expect(created?.props.winner).toBe('')

    // Places : propriétaire en X, ami en O.
    ownerClient.store.update('shape:ttt' as TLRecord['id'], (r) => {
      const s = r as Shape<'tictactoe'>
      return { ...s, props: { ...s.props, playerAId: owner.id, playerAName: 'owner' } } as TLRecord
    })
    await waitFor(() => get<'tictactoe'>(friendClient, 'shape:ttt')?.props.playerAId === owner.id)
    friendClient.store.update('shape:ttt' as TLRecord['id'], (r) => {
      const s = r as Shape<'tictactoe'>
      return {
        ...s,
        props: { ...s.props, playerBId: friend.id, playerBName: 'friend' },
      } as TLRecord
    })
    await waitFor(() => get<'tictactoe'>(ownerClient, 'shape:ttt')?.props.playerBId === friend.id)

    // L'ami joue hors de son tour : refusé.
    friendClient.store.update('shape:ttt' as TLRecord['id'], (r) => {
      const s = r as Shape<'tictactoe'>
      return { ...s, props: { ...s.props, cells: 'O........', next: 'X' } } as TLRecord
    })
    await settle()
    expect(get<'tictactoe'>(ownerClient, 'shape:ttt')?.props.cells).toBe('.........')

    // Coup légal du propriétaire : accepté.
    ownerClient.store.update('shape:ttt' as TLRecord['id'], (r) => {
      const s = r as Shape<'tictactoe'>
      return { ...s, props: { ...s.props, cells: '....X....', next: 'O' } } as TLRecord
    })
    await waitFor(() => get<'tictactoe'>(friendClient, 'shape:ttt')?.props.cells === '....X....')

    // Victoire inventée : refusée.
    friendClient.store.update('shape:ttt' as TLRecord['id'], (r) => {
      const s = r as Shape<'tictactoe'>
      return { ...s, props: { ...s.props, winner: 'O' } } as TLRecord
    })
    await settle()
    expect(get<'tictactoe'>(ownerClient, 'shape:ttt')?.props.winner).toBe('')

    // Déplacer la shape reste libre.
    friendClient.store.update(
      'shape:ttt' as TLRecord['id'],
      (r) => ({ ...(r as Shape<'tictactoe'>), x: 500 }) as TLRecord,
    )
    await waitFor(() => get<'tictactoe'>(ownerClient, 'shape:ttt')?.x === 500)
  })

  it('pictionary : le mot n’est connu que du dessinateur et l’état n’est écrit que par le serveur', async () => {
    ownerClient.store.put([
      baseShape('pic', 'pictionary', {
        w: 320,
        h: 220,
        status: 'solved',
        round: 9,
        drawerId: '',
        drawerName: '',
        hint: '',
        endsAt: 0,
        revealedWord: 'triche',
        winnerName: 'moi',
      }) as TLRecord,
    ])
    await waitFor(() => get(friendClient, 'shape:pic') !== undefined)
    expect(get<'pictionary'>(friendClient, 'shape:pic')?.props.revealedWord).toBe('')

    const started = await owner.agent
      .post(`/api/boards/${boardId}/pictionary/shape:pic/start`)
      .expect(200)
    const word: string = started.body.word
    expect(word.length).toBeGreaterThan(0)
    await waitFor(() => get<'pictionary'>(friendClient, 'shape:pic')?.props.status === 'drawing')

    // Le mot n'apparaît nulle part dans le document reçu par les devineurs.
    const everything = JSON.stringify(friendClient.store.allRecords())
    expect(everything.includes(`"${word}"`)).toBe(false)
    expect(get<'pictionary'>(friendClient, 'shape:pic')?.props.hint).not.toMatch(/[a-z]/i)

    // Seul le dessinateur peut lire le mot.
    expect(
      (await friend.agent.get(`/api/boards/${boardId}/pictionary/shape:pic/word`)).status,
    ).toBe(403)
    expect(
      (await owner.agent.get(`/api/boards/${boardId}/pictionary/shape:pic/word`)).body.word,
    ).toBe(word)

    // Un client ne peut pas forcer l'état de la manche.
    friendClient.store.update('shape:pic' as TLRecord['id'], (r) => {
      const s = r as Shape<'pictionary'>
      return { ...s, props: { ...s.props, status: 'solved', winnerName: 'friend' } } as TLRecord
    })
    await settle()
    expect(get<'pictionary'>(ownerClient, 'shape:pic')?.props.status).toBe('drawing')

    // Le dessinateur ne peut pas deviner ; une mauvaise réponse ne termine pas la manche.
    expect(
      (
        await owner.agent
          .post(`/api/boards/${boardId}/pictionary/shape:pic/guess`)
          .send({ guess: word })
      ).status,
    ).toBe(400)
    const wrong = await friend.agent
      .post(`/api/boards/${boardId}/pictionary/shape:pic/guess`)
      .send({ guess: 'zzz' })
    expect(wrong.body).toEqual({ correct: false })

    // Un lecteur peut deviner (via l'API) et gagner.
    const right = await viewer.agent
      .post(`/api/boards/${boardId}/pictionary/shape:pic/guess`)
      .send({ guess: word.toUpperCase() })
    expect(right.body).toEqual({ correct: true })
    await waitFor(() => get<'pictionary'>(friendClient, 'shape:pic')?.props.status === 'solved')
    const solved = get<'pictionary'>(friendClient, 'shape:pic')
    expect(solved?.props.winnerName).toBe('viewer')
    expect(solved?.props.revealedWord).toBe(word)
    expect(get<'pictionary'>(viewerClient, 'shape:pic')?.props.status).toBe('solved')
  })

  it('pictionary : un VIEWER ne peut pas lancer de manche', async () => {
    expect(
      (await viewer.agent.post(`/api/boards/${boardId}/pictionary/shape:pic/start`)).status,
    ).toBe(403)
  })

  it('expose l’heure serveur', async () => {
    const res = await owner.agent.get('/api/time').expect(200)
    expect(Math.abs(res.body.now - Date.now())).toBeLessThan(5000)
  })
})
