import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
}

/* ------------------------------------------------------------------ */
/* Tables Better Auth (modèles user / session / account / verification) */
/* ------------------------------------------------------------------ */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Email technique non routable (Better Auth l'exige), jamais affiché. */
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  /** Couleur du curseur / avatar. */
  color: text('color'),
  ...timestamps,
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('session_user_idx').on(t.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [index('account_user_idx').on(t.userId)],
)

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ...timestamps,
})

/* ------------------------------------------------------------------ */
/* Tables applicatives                                                */
/* ------------------------------------------------------------------ */

/** Codes d'inscription générés par l'administrateur (CLI). Seul le hash est stocké. */
export const signupCode = sqliteTable('signup_code', {
  id: text('id').primaryKey(),
  codeHash: text('code_hash').notNull().unique(),
  note: text('note'),
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: timestamps.createdAt,
})

export const board = sqliteTable('board', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  thumbnailAssetId: text('thumbnail_asset_id'),
  ...timestamps,
})

export const boardMember = sqliteTable(
  'board_member',
  {
    boardId: text('board_id')
      .notNull()
      .references(() => board.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['OWNER', 'EDITOR', 'VIEWER'] }).notNull(),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    lastOpenedAt: integer('last_opened_at', { mode: 'timestamp_ms' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.boardId, t.userId] }), index('member_user_idx').on(t.userId)],
)

export const boardInvite = sqliteTable(
  'board_invite',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => board.id, { onDelete: 'cascade' }),
    /** SHA-256 du token : une fuite de la base ne donne pas de liens valides. */
    tokenHash: text('token_hash').notNull(),
    role: text('role', { enum: ['EDITOR', 'VIEWER'] }).notNull(),
    maxUses: integer('max_uses').notNull(),
    uses: integer('uses').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex('invite_token_idx').on(t.tokenHash), index('invite_board_idx').on(t.boardId)],
)

export const asset = sqliteTable(
  'asset',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => board.id, { onDelete: 'cascade' }),
    uploaderId: text('uploader_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['image', 'thumbnail'] }).notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    fileName: text('file_name').notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('asset_board_idx').on(t.boardId)],
)

export const authSchema = { user, session, account, verification }
