import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { boardInvite } from '../db/schema'

export type InviteRow = typeof boardInvite.$inferSelect

export class InviteRepository {
  constructor(private readonly db: Db) {}

  create(input: typeof boardInvite.$inferInsert): InviteRow {
    return this.db.insert(boardInvite).values(input).returning().get()
  }

  findByTokenHash(tokenHash: string): InviteRow | undefined {
    return this.db.select().from(boardInvite).where(eq(boardInvite.tokenHash, tokenHash)).get()
  }

  listActive(boardId: string, now: Date): InviteRow[] {
    return this.db
      .select()
      .from(boardInvite)
      .where(and(eq(boardInvite.boardId, boardId), isNull(boardInvite.revokedAt)))
      .orderBy(desc(boardInvite.createdAt))
      .all()
      .filter((i) => i.expiresAt > now && i.uses < i.maxUses)
  }

  revoke(boardId: string, inviteId: string): boolean {
    const res = this.db
      .update(boardInvite)
      .set({ revokedAt: new Date() })
      .where(and(eq(boardInvite.id, inviteId), eq(boardInvite.boardId, boardId)))
      .run()
    return res.changes > 0
  }

  /** Consommation atomique : échoue si l'invitation a été épuisée entre-temps. */
  consume(inviteId: string): boolean {
    const res = this.db
      .update(boardInvite)
      .set({ uses: sql`${boardInvite.uses} + 1` })
      .where(and(eq(boardInvite.id, inviteId), lt(boardInvite.uses, boardInvite.maxUses)))
      .run()
    return res.changes > 0
  }
}
