import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import {
  NodeSqliteWrapper,
  SQLiteSyncStorage,
  TLSocketRoom,
  type WebSocketMinimal,
} from '@tldraw/sync-core'
import type { TLRecord, TLSchema } from '@tldraw/tlschema'
import { boardIdSchema, type Role } from '@canvas/shared'
import { createRecordAuthorizers } from './recordAuthorizers'

export interface SessionMeta {
  readonly userId: string
  readonly username: string
  readonly color: string
  readonly role: Role
}

export interface RoomLogger {
  info(obj: object, msg: string): void
  warn(obj: object, msg: string): void
  error(obj: object, msg: string): void
}

interface ConnectedSocket {
  readonly userId: string
  readonly socket: WebSocketMinimal
}

interface ManagedRoom {
  readonly room: TLSocketRoom<TLRecord, SessionMeta>
  readonly db: Database.Database
  readonly sockets: Map<string, ConnectedSocket>
}

export interface RoomManagerOptions {
  readonly roomsDir: string
  readonly schema: TLSchema
  readonly objectTypes: readonly string[]
  readonly log: RoomLogger
}

export interface ConnectParams {
  readonly boardId: string
  readonly sessionId: string
  readonly socket: WebSocketMinimal
  readonly meta: SessionMeta
}

/**
 * Gère le cycle de vie des rooms tldraw sync : une room (et un fichier SQLite) par board,
 * chargée à la première connexion, fermée quand la dernière session part.
 * Inspiré du template officiel `templates/simple-server-example` de tldraw.
 */
export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>()

  constructor(private readonly opts: RoomManagerOptions) {
    mkdirSync(opts.roomsDir, { recursive: true })
  }

  connect({ boardId, sessionId, socket, meta }: ConnectParams): void {
    const managed = this.getOrLoad(boardId)
    managed.sockets.set(sessionId, { userId: meta.userId, socket })
    managed.room.handleSocketConnect({
      sessionId,
      socket,
      meta,
      // Mécanisme officiel : le serveur rejette toute écriture de document d'une session readonly.
      isReadonly: meta.role === 'VIEWER',
      // Les records de la "object lane" (chat) restent inscriptibles pour tous les membres.
      objectAccess: 'write',
    })
  }

  /** Ferme les sockets d'un utilisateur (rôle modifié ou révoqué) : il devra se reconnecter. */
  disconnectUser(boardId: string, userId: string, code: number, reason: string): number {
    const managed = this.rooms.get(boardId)
    if (!managed) return 0
    let count = 0
    for (const [sessionId, entry] of managed.sockets) {
      if (entry.userId !== userId) continue
      entry.socket.close(code, reason)
      managed.room.handleSocketClose(sessionId, entry.socket)
      managed.sockets.delete(sessionId)
      count++
    }
    return count
  }

  /** Envoie un message custom à toutes les sessions d'un utilisateur dans une room. */
  sendToUser(boardId: string, userId: string, data: unknown): void {
    const managed = this.rooms.get(boardId)
    if (!managed) return
    for (const [sessionId, entry] of managed.sockets) {
      if (entry.userId === userId) managed.room.sendCustomMessage(sessionId, data)
    }
  }

  /** Envoie un message custom à toutes les sessions d'une room. */
  broadcast(boardId: string, data: unknown): void {
    const managed = this.rooms.get(boardId)
    if (!managed) return
    for (const sessionId of managed.sockets.keys()) {
      managed.room.sendCustomMessage(sessionId, data)
    }
  }

  /** Lit un record d'une room chargée (undefined si la room n'est pas active). */
  getRecord(boardId: string, id: string): TLRecord | undefined {
    const managed = this.rooms.get(boardId)
    if (!managed) return undefined
    return managed.room.getRecord(id) ?? undefined
  }

  /**
   * Écriture serveur dans une room active (non soumise aux authorizers clients).
   * Retourne false si la room n'est pas chargée ou si le record n'existe pas.
   */
  async updateRecord(
    boardId: string,
    id: string,
    updater: (record: TLRecord) => TLRecord,
  ): Promise<boolean> {
    const managed = this.rooms.get(boardId)
    if (!managed) return false
    let found = false
    await managed.room.updateStore((store) => {
      const record = store.get(id)
      if (!record) return
      found = true
      store.put(updater(record))
    })
    return found
  }

  connectedUserIds(boardId: string): string[] {
    const managed = this.rooms.get(boardId)
    if (!managed) return []
    return [...new Set([...managed.sockets.values()].map((s) => s.userId))]
  }

  /** Supprime définitivement les données d'une room (suppression de board). */
  deleteRoom(boardId: string): void {
    const managed = this.rooms.get(boardId)
    if (managed) this.unload(boardId, managed)
    const file = this.roomFile(boardId)
    for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true })
  }

  closeAll(): void {
    for (const [boardId, managed] of this.rooms) this.unload(boardId, managed)
  }

  isLoaded(boardId: string): boolean {
    return this.rooms.has(boardId)
  }

  private getOrLoad(boardId: string): ManagedRoom {
    const existing = this.rooms.get(boardId)
    if (existing && !existing.room.isClosed()) return existing

    const db = new Database(this.roomFile(boardId))
    db.pragma('journal_mode = WAL')
    const storage = new SQLiteSyncStorage<TLRecord>({
      sql: new NodeSqliteWrapper(db),
      objectTypes: this.opts.objectTypes,
    })
    const sockets = new Map<string, ConnectedSocket>()
    const room = new TLSocketRoom<TLRecord, SessionMeta>({
      storage,
      schema: this.opts.schema,
      objectTypes: this.opts.objectTypes,
      authorizeRecord: createRecordAuthorizers(),
      log: {
        warn: (...args: unknown[]) => this.opts.log.warn({ boardId, args }, 'tldraw room warning'),
        error: (...args: unknown[]) => this.opts.log.error({ boardId, args }, 'tldraw room error'),
      },
      onSessionRemoved: (_room, { sessionId, numSessionsRemaining }) => {
        sockets.delete(sessionId)
        if (numSessionsRemaining === 0) {
          const current = this.rooms.get(boardId)
          if (current) this.unload(boardId, current)
        }
      },
    })
    const managed: ManagedRoom = { room, db, sockets }
    this.rooms.set(boardId, managed)
    this.opts.log.info({ boardId }, 'room loaded')
    return managed
  }

  private unload(boardId: string, managed: ManagedRoom): void {
    this.rooms.delete(boardId)
    if (!managed.room.isClosed()) managed.room.close()
    managed.db.close()
    this.opts.log.info({ boardId }, 'room closed')
  }

  private roomFile(boardId: string): string {
    // Double garde contre le path traversal : l'id est déjà validé en amont.
    const id = boardIdSchema.parse(boardId)
    return join(this.opts.roomsDir, `${id}.db`)
  }
}
