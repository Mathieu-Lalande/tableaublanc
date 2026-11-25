import { describe, expect, it } from 'vitest'
import { rollDie } from './DiceShapeUtil'

describe('rollDie', () => {
  it('renvoie une valeur entre 1 et 6 et rejette les octets biaisés', () => {
    const bytes = [255, 253, 0]
    expect(rollDie(() => bytes.shift() ?? 0)).toBe(1)
    for (let i = 0; i < 200; i++) {
      const v = rollDie()
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })
})
