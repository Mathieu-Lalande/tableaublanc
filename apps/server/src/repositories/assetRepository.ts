import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { asset } from '../db/schema'

export type AssetRow = typeof asset.$inferSelect

export class AssetRepository {
  constructor(private readonly db: Db) {}

  create(input: typeof asset.$inferInsert): AssetRow {
    return this.db.insert(asset).values(input).returning().get()
  }

  findById(id: string): AssetRow | undefined {
    return this.db.select().from(asset).where(eq(asset.id, id)).get()
  }

  listByBoard(boardId: string): AssetRow[] {
    return this.db.select().from(asset).where(eq(asset.boardId, boardId)).all()
  }

  delete(id: string): void {
    this.db.delete(asset).where(eq(asset.id, id)).run()
  }
}
