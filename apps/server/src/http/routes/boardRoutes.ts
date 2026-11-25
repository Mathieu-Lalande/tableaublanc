import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  boardIdSchema,
  createBoardInputSchema,
  createInviteInputSchema,
  favoriteInputSchema,
  listBoardsQuerySchema,
  renameBoardInputSchema,
  updateMemberInputSchema,
} from '@canvas/shared'
import type { Auth } from '../../auth/auth'
import type { BoardService } from '../../services/boardService'
import type { InviteService } from '../../services/inviteService'
import { currentUser, requireAuth } from '../session'
import { parse } from '../validation'

export interface BoardRoutesOptions {
  readonly auth: Auth
  readonly boards: BoardService
  readonly invites: InviteService
}

const boardParams = z.object({ boardId: boardIdSchema })
const memberParams = boardParams.extend({ userId: z.string().min(1).max(64) })
const inviteParams = boardParams.extend({ inviteId: z.string().uuid() })

export async function boardRoutes(app: FastifyInstance, opts: BoardRoutesOptions): Promise<void> {
  const { boards, invites } = opts
  app.addHook('preHandler', requireAuth(opts.auth))

  app.get('/api/boards', async (req) => {
    const q = parse(listBoardsQuerySchema, req.query)
    return boards.list(currentUser(req).id, { query: q.q, favoritesOnly: q.favorites === '1' })
  })

  app.post('/api/boards', async (req, reply) => {
    const { name } = parse(createBoardInputSchema, req.body)
    return reply.code(201).send(boards.create(currentUser(req).id, name))
  })

  app.get('/api/boards/:boardId', async (req) => {
    const { boardId } = parse(boardParams, req.params)
    return boards.open(boardId, currentUser(req).id)
  })

  app.patch('/api/boards/:boardId', async (req, reply) => {
    const { boardId } = parse(boardParams, req.params)
    const { name } = parse(renameBoardInputSchema, req.body)
    boards.rename(boardId, currentUser(req).id, name)
    return reply.code(204).send()
  })

  app.delete('/api/boards/:boardId', async (req, reply) => {
    const { boardId } = parse(boardParams, req.params)
    boards.delete(boardId, currentUser(req).id)
    return reply.code(204).send()
  })

  app.put('/api/boards/:boardId/favorite', async (req, reply) => {
    const { boardId } = parse(boardParams, req.params)
    const { favorite } = parse(favoriteInputSchema, req.body)
    boards.setFavorite(boardId, currentUser(req).id, favorite)
    return reply.code(204).send()
  })

  app.get('/api/boards/:boardId/members', async (req) => {
    const { boardId } = parse(boardParams, req.params)
    return boards.listMembers(boardId, currentUser(req).id)
  })

  app.patch('/api/boards/:boardId/members/:userId', async (req, reply) => {
    const { boardId, userId } = parse(memberParams, req.params)
    const { role } = parse(updateMemberInputSchema, req.body)
    boards.updateMemberRole(boardId, currentUser(req).id, userId, role)
    return reply.code(204).send()
  })

  app.delete('/api/boards/:boardId/members/:userId', async (req, reply) => {
    const { boardId, userId } = parse(memberParams, req.params)
    boards.removeMember(boardId, currentUser(req).id, userId)
    return reply.code(204).send()
  })

  app.get('/api/boards/:boardId/invites', async (req) => {
    const { boardId } = parse(boardParams, req.params)
    return invites.list(boardId, currentUser(req).id)
  })

  app.post('/api/boards/:boardId/invites', async (req, reply) => {
    const { boardId } = parse(boardParams, req.params)
    const input = parse(createInviteInputSchema, req.body)
    return reply.code(201).send(invites.create(boardId, currentUser(req).id, input))
  })

  app.delete('/api/boards/:boardId/invites/:inviteId', async (req, reply) => {
    const { boardId, inviteId } = parse(inviteParams, req.params)
    invites.revoke(boardId, currentUser(req).id, inviteId)
    return reply.code(204).send()
  })
}
