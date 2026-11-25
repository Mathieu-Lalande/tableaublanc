import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { user } from '../db/schema'

export interface PublicUser {
  readonly id: string
  readonly username: string
  readonly color: string
}

export class UserRepository {
  constructor(private readonly db: Db) {}

  findById(id: string) {
    return this.db.select().from(user).where(eq(user.id, id)).get()
  }

  setColor(id: string, color: string): void {
    this.db.update(user).set({ color, updatedAt: new Date() }).where(eq(user.id, id)).run()
  }

  setDisplayName(id: string, displayUsername: string): void {
    this.db
      .update(user)
      .set({ displayUsername, name: displayUsername, updatedAt: new Date() })
      .where(eq(user.id, id))
      .run()
  }
}
