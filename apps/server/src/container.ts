import { join, resolve } from 'node:path'
import { createCanvasSchema, OBJECT_LANE_RECORD_TYPES } from '@canvas/shared'
import { createAuth, type Auth } from './auth/auth'
import type { Env } from './config/env'
import { openDatabase, type DbHandle } from './db/client'
import { AssetRepository } from './repositories/assetRepository'
import { BoardRepository } from './repositories/boardRepository'
import { InviteRepository } from './repositories/inviteRepository'
import { SignupCodeRepository } from './repositories/signupCodeRepository'
import { UserRepository } from './repositories/userRepository'
import { AccountService } from './services/accountService'
import { AssetService } from './services/assetService'
import { AssetStorage } from './services/assetStorage'
import { BoardService } from './services/boardService'
import { InviteService } from './services/inviteService'
import { SignupCodeService } from './services/signupCodeService'
import { RoomManager, type RoomLogger } from './sync/roomManager'
import { BoardSyncAuthorizer } from './sync/boardSyncAuthorizer'
import type { SyncAuthorizer } from './sync/syncRoutes'

/** Graphe d'objets de l'application (injection par constructeur, sans framework DI). */
export interface Container {
  readonly env: Env
  readonly dbHandle: DbHandle
  readonly auth: Auth
  readonly rooms: RoomManager
  readonly accounts: AccountService
  readonly boards: BoardService
  readonly invites: InviteService
  readonly assets: AssetService
  readonly signupCodes: SignupCodeService
  readonly syncAuthorizer: SyncAuthorizer
}

export function createContainer(env: Env, log: RoomLogger): Container {
  const dataDir = resolve(env.DATA_DIR)
  const dbHandle = openDatabase(join(dataDir, 'app.db'))
  const { db } = dbHandle
  const auth = createAuth(db, env)

  const boardRepo = new BoardRepository(db)
  const assetRepo = new AssetRepository(db)
  const rooms = new RoomManager({
    roomsDir: join(dataDir, 'rooms'),
    schema: createCanvasSchema(),
    objectTypes: OBJECT_LANE_RECORD_TYPES,
    log,
  })
  const storage = new AssetStorage(assetRepo, join(dataDir, 'assets'))
  const boards = new BoardService(boardRepo, rooms, storage)
  const signupCodeRepo = new SignupCodeRepository(db)
  const accounts = new AccountService(auth, signupCodeRepo, new UserRepository(db))

  return {
    env,
    dbHandle,
    auth,
    rooms,
    boards,
    accounts,
    invites: new InviteService(new InviteRepository(db), boards),
    assets: new AssetService(assetRepo, boards, storage, env.MAX_UPLOAD_BYTES),
    signupCodes: new SignupCodeService(signupCodeRepo),
    syncAuthorizer: new BoardSyncAuthorizer(auth, boards, accounts),
  }
}
