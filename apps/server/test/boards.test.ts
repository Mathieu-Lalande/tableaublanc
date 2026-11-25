import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, registerUser, type TestApp } from './helpers/testApp'

describe('Boards, membres et invitations', () => {
  let t: TestApp
  let owner: Awaited<ReturnType<typeof registerUser>>
  let friend: Awaited<ReturnType<typeof registerUser>>
  let stranger: Awaited<ReturnType<typeof registerUser>>
  let boardId: string

  beforeAll(async () => {
    t = await createTestApp()
    owner = await registerUser(t, 'owner')
    friend = await registerUser(t, 'friend')
    stranger = await registerUser(t, 'stranger')
    const res = await owner.agent.post('/api/boards').send({ name: 'Projet vacances' })
    expect(res.status).toBe(201)
    boardId = res.body.id
  })
  afterAll(() => t.close())

  it('liste les boards du propriétaire avec son rôle', async () => {
    const res = await owner.agent.get('/api/boards')
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ id: boardId, role: 'OWNER', memberCount: 1 })
  })

  it('valide les entrées (nom vide refusé)', async () => {
    const res = await owner.agent.post('/api/boards').send({ name: '   ' })
    expect(res.status).toBe(400)
  })

  it('cache un board aux non-membres (404, pas 403)', async () => {
    expect((await stranger.agent.get(`/api/boards/${boardId}`)).status).toBe(404)
  })

  it('recherche sans interpréter les jokers SQL', async () => {
    expect((await owner.agent.get('/api/boards?q=vacances')).body).toHaveLength(1)
    expect((await owner.agent.get('/api/boards?q=%25')).body).toHaveLength(0)
  })

  it('crée une invitation VIEWER, la prévisualise et l’accepte', async () => {
    const created = await owner.agent
      .post(`/api/boards/${boardId}/invites`)
      .send({ role: 'VIEWER', expiresInHours: 1, maxUses: 1 })
    expect(created.status).toBe(201)
    const token: string = created.body.token
    expect(token.length).toBeGreaterThanOrEqual(43)

    const preview = await friend.agent.get(`/api/invites/${token}`)
    expect(preview.body).toEqual({ boardId, boardName: 'Projet vacances', role: 'VIEWER' })

    const accepted = await friend.agent.post(`/api/invites/${token}/accept`)
    expect(accepted.body).toEqual({ boardId })
    expect((await friend.agent.get(`/api/boards/${boardId}`)).body.role).toBe('VIEWER')

    // Épuisée (maxUses = 1) : un tiers ne peut plus l'utiliser.
    expect((await stranger.agent.post(`/api/invites/${token}/accept`)).status).toBe(404)
  })

  it('ne stocke que le hash du token', async () => {
    const created = await owner.agent
      .post(`/api/boards/${boardId}/invites`)
      .send({ role: 'EDITOR' })
    const rows = t.container.dbHandle.sqlite
      .prepare('select token_hash from board_invite')
      .all() as {
      token_hash: string
    }[]
    expect(rows.some((r) => r.token_hash === created.body.token)).toBe(false)
  })

  it('refuse une invitation révoquée', async () => {
    const created = await owner.agent
      .post(`/api/boards/${boardId}/invites`)
      .send({ role: 'EDITOR' })
    await owner.agent.delete(`/api/boards/${boardId}/invites/${created.body.id}`).expect(204)
    expect((await stranger.agent.get(`/api/invites/${created.body.token}`)).status).toBe(404)
  })

  it('un VIEWER ne peut ni renommer, ni inviter, ni changer les rôles', async () => {
    expect(
      (await friend.agent.patch(`/api/boards/${boardId}`).send({ name: 'pirate' })).status,
    ).toBe(403)
    expect(
      (await friend.agent.post(`/api/boards/${boardId}/invites`).send({ role: 'EDITOR' })).status,
    ).toBe(403)
    expect(
      (
        await friend.agent
          .patch(`/api/boards/${boardId}/members/${friend.id}`)
          .send({ role: 'EDITOR' })
      ).status,
    ).toBe(403)
  })

  it('le propriétaire promeut un membre en EDITOR', async () => {
    await owner.agent
      .patch(`/api/boards/${boardId}/members/${friend.id}`)
      .send({ role: 'EDITOR' })
      .expect(204)
    const members = await friend.agent.get(`/api/boards/${boardId}/members`)
    expect(members.body.find((m: { userId: string }) => m.userId === friend.id).role).toBe('EDITOR')
  })

  it('ne rétrograde jamais via une invitation de rôle inférieur', async () => {
    const created = await owner.agent
      .post(`/api/boards/${boardId}/invites`)
      .send({ role: 'VIEWER' })
    await friend.agent.post(`/api/invites/${created.body.token}/accept`).expect(200)
    expect((await friend.agent.get(`/api/boards/${boardId}`)).body.role).toBe('EDITOR')
  })

  it('gère les favoris par utilisateur', async () => {
    await friend.agent.put(`/api/boards/${boardId}/favorite`).send({ favorite: true }).expect(204)
    expect((await friend.agent.get('/api/boards?favorites=1')).body).toHaveLength(1)
    expect((await owner.agent.get('/api/boards?favorites=1')).body).toHaveLength(0)
  })

  it('un membre peut quitter, le propriétaire non', async () => {
    expect((await owner.agent.delete(`/api/boards/${boardId}/members/${owner.id}`)).status).toBe(
      400,
    )
    await friend.agent.delete(`/api/boards/${boardId}/members/${friend.id}`).expect(204)
    expect((await friend.agent.get(`/api/boards/${boardId}`)).status).toBe(404)
  })

  it('seul le propriétaire supprime le board', async () => {
    const created = await owner.agent.post('/api/boards').send({ name: 'À jeter' })
    await owner.agent.delete(`/api/boards/${created.body.id}`).expect(204)
    expect((await owner.agent.get(`/api/boards/${created.body.id}`)).status).toBe(404)
  })
})
