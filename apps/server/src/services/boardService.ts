import {
  hasAtLeastRole,
  WS_CLOSE_CODES,
  type BoardDetail,
  type BoardSummary,
  type Member,
  type Role,
} from '@canvas/shared'
import { generateId } from '../lib/crypto'
import { AppError, forbidden, notFound } from '../lib/errors'
import type { BoardListFilter, BoardRepository } from '../repositories/boardRepository'
import { pickUserColor } from './userColors'

/** Opérations sur les rooms dont le service a besoin (découplé de tldraw). */
export interface RoomGateway {
  disconnectUser(boardId: string, userId: string, code: number, reason: string): number
  deleteRoom(boardId: string): void
}

/** Suppression des fichiers d'assets d'un board (implémenté par AssetService). */
export interface BoardAssetCleaner {
  deleteBoardAssets(boardId: string): void
}

export class BoardService {
  constructor(
    private readonly boards: BoardRepository,
    private readonly rooms: RoomGateway,
    private readonly assets: BoardAssetCleaner,
  ) {}

  /**
   * Vérifie le rôle minimal. Un non-membre reçoit 404 (on ne révèle pas l'existence du board).
   */
  requireRole(boardId: string, userId: string, minRole: Role): Role {
    const role = this.boards.getRole(boardId, userId)
    if (!role) throw notFound()
    if (!hasAtLeastRole(role, minRole)) throw forbidden()
    return role
  }

  /** Rôle courant ou `undefined` (utilisé par l'autorisation du sync). */
  findRole(boardId: string, userId: string): Role | undefined {
    return this.boards.getRole(boardId, userId)
  }

  create(userId: string, name: string): BoardSummary {
    const row = this.boards.create({ id: generateId(), name, ownerId: userId })
    return {
      id: row.id,
      name: row.name,
      role: 'OWNER',
      favorite: false,
      thumbnailUrl: null,
      memberCount: 1,
      updatedAt: row.updatedAt.toISOString(),
      lastOpenedAt: null,
    }
  }

  list(userId: string, filter: BoardListFilter): BoardSummary[] {
    return this.boards.listForUser(userId, filter).map((b) => ({
      id: b.id,
      name: b.name,
      role: b.role,
      favorite: b.favorite,
      thumbnailUrl: b.thumbnailAssetId ? `/api/assets/${b.thumbnailAssetId}` : null,
      memberCount: b.memberCount,
      updatedAt: b.updatedAt.toISOString(),
      lastOpenedAt: b.lastOpenedAt?.toISOString() ?? null,
    }))
  }

  open(boardId: string, userId: string): BoardDetail {
    const role = this.requireRole(boardId, userId, 'VIEWER')
    const board = this.boards.findById(boardId)
    const membership = this.boards.getMembership(boardId, userId)
    if (!board || !membership) throw notFound()
    this.boards.markOpened(boardId, userId)
    return { id: board.id, name: board.name, role, favorite: membership.favorite }
  }

  rename(boardId: string, userId: string, name: string): void {
    this.requireRole(boardId, userId, 'EDITOR')
    this.boards.rename(boardId, name)
  }

  delete(boardId: string, userId: string): void {
    this.requireRole(boardId, userId, 'OWNER')
    this.rooms.deleteRoom(boardId)
    this.assets.deleteBoardAssets(boardId)
    this.boards.delete(boardId)
  }

  setFavorite(boardId: string, userId: string, favorite: boolean): void {
    this.requireRole(boardId, userId, 'VIEWER')
    this.boards.setFavorite(boardId, userId, favorite)
  }

  listMembers(boardId: string, userId: string): Member[] {
    this.requireRole(boardId, userId, 'VIEWER')
    return this.boards.listMembers(boardId).map((m) => ({
      userId: m.userId,
      username: m.username,
      color: m.color ?? pickUserColor(m.userId),
      role: m.role,
    }))
  }

  updateMemberRole(
    boardId: string,
    actorId: string,
    targetId: string,
    role: 'EDITOR' | 'VIEWER',
  ): void {
    this.requireRole(boardId, actorId, 'OWNER')
    const current = this.boards.getRole(boardId, targetId)
    if (!current) throw notFound()
    if (current === 'OWNER')
      throw new AppError(400, 'Le rôle du propriétaire ne peut pas être modifié')
    this.boards.upsertMember(boardId, targetId, role)
    // Les droits du sync sont fixés à la connexion : on force une reconnexion.
    this.rooms.disconnectUser(boardId, targetId, WS_CLOSE_CODES.REVOKED, 'role changed')
  }

  removeMember(boardId: string, actorId: string, targetId: string): void {
    const actorRole = this.requireRole(boardId, actorId, 'VIEWER')
    const isSelf = actorId === targetId
    if (!isSelf && actorRole !== 'OWNER') throw forbidden()
    const targetRole = this.boards.getRole(boardId, targetId)
    if (!targetRole) throw notFound()
    if (targetRole === 'OWNER')
      throw new AppError(400, 'Le propriétaire ne peut pas quitter son board')
    this.boards.removeMember(boardId, targetId)
    this.rooms.disconnectUser(boardId, targetId, WS_CLOSE_CODES.REVOKED, 'removed')
  }

  /** Ajoute un membre sans jamais rétrograder un rôle existant (acceptation d'invitation). */
  grantAtLeast(boardId: string, userId: string, role: Role): Role {
    const current = this.boards.getRole(boardId, userId)
    if (current && hasAtLeastRole(current, role)) return current
    this.boards.upsertMember(boardId, userId, role)
    if (current) this.rooms.disconnectUser(boardId, userId, WS_CLOSE_CODES.REVOKED, 'role changed')
    return role
  }

  touch(boardId: string): void {
    this.boards.touch(boardId)
  }

  boardName(boardId: string): string {
    const board = this.boards.findById(boardId)
    if (!board) throw notFound()
    return board.name
  }

  setThumbnail(boardId: string, assetId: string): void {
    this.boards.setThumbnail(boardId, assetId)
  }
}
