import { and, eq, lt, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { signupCode } from '../db/schema'

export type SignupCodeRow = typeof signupCode.$inferSelect

export class SignupCodeRepository {
  constructor(private readonly db: Db) {}

  create(input: typeof signupCode.$inferInsert): SignupCodeRow {
    return this.db.insert(signupCode).values(input).returning().get()
  }

  findByHash(codeHash: string): SignupCodeRow | undefined {
    return this.db.select().from(signupCode).where(eq(signupCode.codeHash, codeHash)).get()
  }

  list(): SignupCodeRow[] {
    return this.db.select().from(signupCode).all()
  }

  /** Réserve une utilisation de manière atomique (UPDATE conditionnel). */
  reserve(id: string): boolean {
    const res = this.db
      .update(signupCode)
      .set({ uses: sql`${signupCode.uses} + 1` })
      .where(and(eq(signupCode.id, id), lt(signupCode.uses, signupCode.maxUses)))
      .run()
    return res.changes > 0
  }

  release(id: string): void {
    this.db
      .update(signupCode)
      .set({ uses: sql`max(${signupCode.uses} - 1, 0)` })
      .where(eq(signupCode.id, id))
      .run()
  }
}
