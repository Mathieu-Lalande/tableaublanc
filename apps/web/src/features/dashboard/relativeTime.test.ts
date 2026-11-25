import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

describe('relativeTime', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  it('formate en français', () => {
    expect(relativeTime('2026-01-10T11:59:50Z', now)).toBe('à l’instant')
    expect(relativeTime('2026-01-10T09:00:00Z', now)).toBe('il y a 3 heures')
    expect(relativeTime('2026-01-09T12:00:00Z', now)).toBe('hier')
  })
})
