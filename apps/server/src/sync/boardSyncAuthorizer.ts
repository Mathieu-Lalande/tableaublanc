import type { FastifyRequest } from 'fastify'
import type { Auth } from '../auth/auth'
import { readSessionUser } from '../http/session'
import type { AccountService } from '../services/accountService'
import type { BoardService } from '../services/boardService'
import type { SyncAccess, SyncAuthorizer } from './syncRoutes'

/** Autorise la connexion au sync : session valide ET appartenance au board. */
export class BoardSyncAuthorizer implements SyncAuthorizer {
  constructor(
    private readonly auth: Auth,
    private readonly boards: BoardService,
    private readonly accounts: AccountService,
  ) {}

  async authorize(
    req: FastifyRequest,
    boardId: string,
  ): Promise<SyncAccess | 'UNAUTHORIZED' | 'FORBIDDEN'> {
    const user = await readSessionUser(this.auth, req)
    if (!user) return 'UNAUTHORIZED'
    const role = this.boards.findRole(boardId, user.id)
    if (!role) return 'FORBIDDEN'
    const me = this.accounts.getMe(user.id)
    return { userId: user.id, username: me.username, color: me.color, role }
  }
}
