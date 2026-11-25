import { and, desc, eq, sql } from 'drizzle-orm'
import type { Role } from '@canvas/shared'
import type { Db } from '../db/client'
import { board, boardMember, user } from '../db/schema'

export interface BoardRow {
  readonly id: string
  readonly name: string
  readonly ownerId: string
  readonly thumbnailAssetId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface BoardListRow extends BoardRow {
  readonly role: Role
  readonly favorite: boolean
  readonly lastOpenedAt: Date | null
  readonly memberCount: number
}

export interface MemberRow {
  readonly userId: string
  readonly username: string
  readonly color: string | null
  readonly role: Role
  readonly createdAt: Date
}

export interface BoardListFilter {
  readonly query?: string | undefined
  readonly favoritesOnly?: boolean | undefined
}

/** Accès aux tables `board` et `board_member` (aucune règle métier ici). */
export class BoardRepository {
  constructor(private readonly db: Db) {}

  create(input: { id: string; name: string; ownerId: string }): BoardRow {
    return this.db.transaction((tx) => {
      const created = tx.insert(board).values(input).returning().get()
      tx.insert(boardMember)
        .values({ boardId: input.id, userId: input.ownerId, role: 'OWNER' })
        .run()
      return created
    })
  }

  findById(id: string): BoardRow | undefined {
    return this.db.select().from(board).where(eq(board.id, id)).get()
  }

  rename(id: string, name: string): void {
    this.db.update(board).set({ name, updatedAt: new Date() }).where(eq(board.id, id)).run()
  }

  touch(id: string): void {
    this.db.update(board).set({ updatedAt: new Date() }).where(eq(board.id, id)).run()
  }

  setThumbnail(id: string, assetId: string): void {
    this.db.update(board).set({ thumbnailAssetId: assetId }).where(eq(board.id, id)).run()
  }

  delete(id: string): void {
    this.db.delete(board).where(eq(board.id, id)).run()
  }

  listForUser(userId: string, filter: BoardListFilter): BoardListRow[] {
    const memberCount = sql<number>`(select count(*) from board_member bm where bm.board_id = ${board.id})`
    const conditions = [eq(boardMember.userId, userId)]
    if (filter.favoritesOnly) conditions.push(eq(boardMember.favorite, true))
    // Requête paramétrée : les jokers saisis par l'utilisateur sont échappés.
    if (filter.query) {
      const escaped = filter.query.replace(/[\\%_]/g, (c) => `\\${c}`)
      conditions.push(sql`${board.name} like ${`%${escaped}%`} escape '\\'`)
    }
    return this.db
      .select({
        id: board.id,
        name: board.name,
        ownerId: board.ownerId,
        thumbnailAssetId: board.thumbnailAssetId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        role: boardMember.role,
        favorite: boardMember.favorite,
        lastOpenedAt: boardMember.lastOpenedAt,
        memberCount,
      })
      .from(boardMember)
      .innerJoin(board, eq(board.id, boardMember.boardId))
      .where(and(...conditions))
      .orderBy(desc(sql`coalesce(${boardMember.lastOpenedAt}, ${board.updatedAt})`))
      .all()
  }

  getRole(boardId: string, userId: string): Role | undefined {
    return this.db
      .select({ role: boardMember.role })
      .from(boardMember)
      .where(and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)))
      .get()?.role
  }

  getMembership(boardId: string, userId: string) {
    return this.db
      .select()
      .from(boardMember)
      .where(and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)))
      .get()
  }

  upsertMember(boardId: string, userId: string, role: Role): void {
    this.db
      .insert(boardMember)
      .values({ boardId, userId, role })
      .onConflictDoUpdate({ target: [boardMember.boardId, boardMember.userId], set: { role } })
      .run()
  }

  removeMember(boardId: string, userId: string): void {
    this.db
      .delete(boardMember)
      .where(and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)))
      .run()
  }

  setFavorite(boardId: string, userId: string, favorite: boolean): void {
    this.db
      .update(boardMember)
      .set({ favorite })
      .where(and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)))
      .run()
  }

  markOpened(boardId: string, userId: string): void {
    this.db
      .update(boardMember)
      .set({ lastOpenedAt: new Date() })
      .where(and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)))
      .run()
  }

  listMembers(boardId: string): MemberRow[] {
    return this.db
      .select({
        userId: boardMember.userId,
        username: sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
        color: user.color,
        role: boardMember.role,
        createdAt: boardMember.createdAt,
      })
      .from(boardMember)
      .innerJoin(user, eq(user.id, boardMember.userId))
      .where(eq(boardMember.boardId, boardId))
      .orderBy(boardMember.createdAt)
      .all()
  }
}
