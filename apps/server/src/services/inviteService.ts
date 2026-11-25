import type { CreatedInvite, Invite, InvitePreview } from '@canvas/shared'
import { generateId, generateToken, sha256 } from '../lib/crypto'
import { AppError } from '../lib/errors'
import type { InviteRepository, InviteRow } from '../repositories/inviteRepository'
import type { BoardService } from './boardService'

const invalidInvite = () => new AppError(404, 'Invitation invalide ou expirée')

function toDto(row: InviteRow): Invite {
  return {
    id: row.id,
    role: row.role,
    uses: row.uses,
    maxUses: row.maxUses,
    expiresAt: row.expiresAt.toISOString(),
  }
}

export class InviteService {
  constructor(
    private readonly invites: InviteRepository,
    private readonly boards: BoardService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  create(
    boardId: string,
    actorId: string,
    input: { role: 'EDITOR' | 'VIEWER'; expiresInHours: number; maxUses: number },
  ): CreatedInvite {
    this.boards.requireRole(boardId, actorId, 'OWNER')
    const token = generateToken()
    const row = this.invites.create({
      id: generateId(),
      boardId,
      tokenHash: sha256(token),
      role: input.role,
      maxUses: input.maxUses,
      expiresAt: new Date(this.now().getTime() + input.expiresInHours * 3_600_000),
      createdBy: actorId,
    })
    // Le token en clair n'est renvoyé qu'une seule fois, à la création.
    return { ...toDto(row), token }
  }

  list(boardId: string, actorId: string): Invite[] {
    this.boards.requireRole(boardId, actorId, 'OWNER')
    return this.invites.listActive(boardId, this.now()).map(toDto)
  }

  revoke(boardId: string, actorId: string, inviteId: string): void {
    this.boards.requireRole(boardId, actorId, 'OWNER')
    if (!this.invites.revoke(boardId, inviteId)) throw invalidInvite()
  }

  preview(token: string): InvitePreview {
    const row = this.findUsable(token)
    return { boardId: row.boardId, boardName: this.boards.boardName(row.boardId), role: row.role }
  }

  accept(token: string, userId: string): { boardId: string } {
    const row = this.findUsable(token)
    const existing = this.boards.findRole(row.boardId, userId)
    // Un membre existant ne consomme pas d'utilisation et n'est jamais rétrogradé.
    if (!existing && !this.invites.consume(row.id)) throw invalidInvite()
    this.boards.grantAtLeast(row.boardId, userId, row.role)
    return { boardId: row.boardId }
  }

  private findUsable(token: string): InviteRow {
    const row = this.invites.findByTokenHash(sha256(token))
    if (!row || row.revokedAt || row.expiresAt <= this.now() || row.uses >= row.maxUses) {
      throw invalidInvite()
    }
    return row
  }
}
