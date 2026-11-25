import { describe, expect, it } from 'vitest'
import { formatDuration, remainingMs } from './TimerShapeUtil'

const base = {
  w: 1,
  h: 1,
  label: '',
  durationMs: 60_000,
  endsAt: 0,
  remainingMs: 60_000,
  running: false,
}

describe('minuteur', () => {
  it('formate mm:ss en arrondissant à la seconde supérieure', () => {
    expect(formatDuration(61_000)).toBe('01:01')
    expect(formatDuration(500)).toBe('00:01')
    expect(formatDuration(0)).toBe('00:00')
  })
  it('calcule le temps restant en marche et en pause', () => {
    expect(remainingMs({ ...base, running: true, endsAt: 10_000 }, 4_000)).toBe(6_000)
    expect(remainingMs({ ...base, running: true, endsAt: 10_000 }, 20_000)).toBe(0)
    expect(remainingMs({ ...base, remainingMs: 42 }, 99)).toBe(42)
  })
})
