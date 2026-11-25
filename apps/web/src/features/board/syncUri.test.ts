import { describe, expect, it } from 'vitest'
import { buildSyncUri } from './syncUri'

describe('buildSyncUri', () => {
  it('utilise wss en https', () => {
    expect(buildSyncUri('abc12345', { protocol: 'https:', host: 'canvas.example' })).toBe(
      'wss://canvas.example/api/sync/abc12345',
    )
  })
  it('utilise ws en http', () => {
    expect(buildSyncUri('abc12345', { protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/api/sync/abc12345',
    )
  })
})
