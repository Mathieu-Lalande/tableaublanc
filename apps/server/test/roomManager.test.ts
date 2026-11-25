import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCanvasSchema, OBJECT_LANE_RECORD_TYPES } from '@canvas/shared'
import { RoomManager } from '../src/sync/roomManager'

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }

function makeManager(dir: string) {
  return new RoomManager({
    roomsDir: dir,
    schema: createCanvasSchema(),
    objectTypes: OBJECT_LANE_RECORD_TYPES,
    log: silentLog,
  })
}

function fakeSocket() {
  const closed: number[] = []
  return {
    closed,
    socket: {
      send: () => {},
      close: (code?: number) => closed.push(code ?? 1000),
      readyState: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  }
}

describe('RoomManager', () => {
  let manager: RoomManager | undefined
  afterEach(() => manager?.closeAll())

  it('charge une room par board et crée son fichier SQLite', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rooms-'))
    manager = makeManager(dir)
    const { socket } = fakeSocket()
    manager.connect({
      boardId: 'board-12345',
      sessionId: 's1',
      socket,
      meta: { userId: 'u1', role: 'EDITOR' },
    })
    expect(manager.isLoaded('board-12345')).toBe(true)
    expect(existsSync(join(dir, 'board-12345.db'))).toBe(true)
    expect(manager.connectedUserIds('board-12345')).toEqual(['u1'])
  })

  it('déconnecte toutes les sessions d’un utilisateur révoqué', () => {
    manager = makeManager(mkdtempSync(join(tmpdir(), 'rooms-')))
    const a = fakeSocket()
    const b = fakeSocket()
    manager.connect({
      boardId: 'board-12345',
      sessionId: 's1',
      socket: a.socket,
      meta: { userId: 'u1', role: 'EDITOR' },
    })
    manager.connect({
      boardId: 'board-12345',
      sessionId: 's2',
      socket: b.socket,
      meta: { userId: 'u2', role: 'VIEWER' },
    })
    expect(manager.disconnectUser('board-12345', 'u1', 4409, 'revoked')).toBe(1)
    expect(a.closed[0]).toBe(4409)
    expect(b.closed).toEqual([])
  })

  it('refuse un identifiant de board dangereux (path traversal)', () => {
    manager = makeManager(mkdtempSync(join(tmpdir(), 'rooms-')))
    expect(() => manager?.deleteRoom('../../etc/passwd')).toThrow()
  })

  it('supprime les fichiers d’une room', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rooms-'))
    manager = makeManager(dir)
    const { socket } = fakeSocket()
    manager.connect({
      boardId: 'board-abcdef',
      sessionId: 's1',
      socket,
      meta: { userId: 'u1', role: 'OWNER' },
    })
    manager.deleteRoom('board-abcdef')
    expect(existsSync(join(dir, 'board-abcdef.db'))).toBe(false)
    expect(manager.isLoaded('board-abcdef')).toBe(false)
  })
})
