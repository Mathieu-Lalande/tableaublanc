import WebSocket from 'ws'
import { atom } from '@tldraw/state'
import { Store } from '@tldraw/store'
import {
  JsonChunkAssembler,
  TLSyncClient,
  type TLPersistentClientSocket,
  type TLSocketStatusChangeEvent,
} from '@tldraw/sync-core'
import type { TLRecord, TLStoreProps } from '@tldraw/tlschema'
import { createCanvasSchema } from '@canvas/shared'
import { ORIGIN } from './testApp'

/** Socket client minimal (Node) avec cookie, pour piloter TLSyncClient dans les tests. */
class NodeClientSocket implements TLPersistentClientSocket<object, object> {
  connectionStatus: 'error' | 'offline' | 'online' = 'offline'
  private readonly messageListeners = new Set<(msg: object) => void>()
  private readonly statusListeners = new Set<(e: TLSocketStatusChangeEvent) => void>()
  private readonly assembler = new JsonChunkAssembler()
  private ws: WebSocket

  constructor(
    private readonly url: string,
    private readonly cookie: string,
  ) {
    this.ws = this.open()
  }

  private open(): WebSocket {
    const ws = new WebSocket(this.url, { headers: { origin: ORIGIN, cookie: this.cookie } })
    ws.on('open', () => this.setStatus({ status: 'online' }))
    ws.on('close', () => this.setStatus({ status: 'offline' }))
    ws.on('error', () => this.setStatus({ status: 'error', reason: 'socket error' }))
    ws.on('message', (data) => {
      const result = this.assembler.handleMessage(data.toString())
      if (result && 'data' in result && result.data) {
        for (const l of this.messageListeners) l(result.data as object)
      }
    })
    return ws
  }

  private setStatus(e: TLSocketStatusChangeEvent) {
    this.connectionStatus = e.status
    for (const l of this.statusListeners) l(e)
  }

  sendMessage(msg: object): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }
  onReceiveMessage = (cb: (msg: object) => void) => {
    this.messageListeners.add(cb)
    return () => this.messageListeners.delete(cb)
  }
  onStatusChange = (cb: (e: TLSocketStatusChangeEvent) => void) => {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }
  restart(): void {
    this.ws.close()
    this.ws = this.open()
  }
  close(): void {
    this.ws.close()
  }
}

export interface ConnectedClient {
  readonly store: Store<TLRecord, TLStoreProps>
  readonly isReadonly: boolean
  close(): void
}

export function connectSyncClient(url: string, cookie: string): Promise<ConnectedClient> {
  const store = new Store<TLRecord, TLStoreProps>({
    schema: createCanvasSchema(),
    props: {
      defaultName: '',
      assets: { upload: async () => ({ src: '' }), resolve: () => null, remove: async () => {} },
      onMount: () => {},
      users: { currentUser: atom('test-user', null), resolve: () => atom('resolved-user', null) },
    },
  })
  const socket = new NodeClientSocket(url, cookie)
  return new Promise((resolve, reject) => {
    let isReadonly = false
    const timer = setTimeout(() => reject(new Error('sync timeout')), 5000)
    const client = new TLSyncClient<TLRecord, Store<TLRecord, TLStoreProps>>({
      store,
      socket,
      presence: atom('presence', null),
      onAfterConnect: (_self, details) => {
        isReadonly = details.isReadonly
      },
      onLoad: () => {
        clearTimeout(timer)
        resolve({ store, isReadonly, close: () => client.close() })
      },
      onSyncError: (reason) => {
        clearTimeout(timer)
        reject(new Error(reason))
      },
    })
  })
}

/** Tente l'upgrade WebSocket et renvoie le code HTTP de refus (ou 101 si accepté). */
export function upgradeStatus(url: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers })
    ws.on('unexpected-response', (_req, res) => {
      resolve(res.statusCode ?? 0)
      ws.terminate()
    })
    ws.on('open', () => {
      resolve(101)
      ws.close()
    })
    ws.on('error', () => {})
  })
}
