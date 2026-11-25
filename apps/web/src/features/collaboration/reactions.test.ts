import { describe, expect, it } from 'vitest'
import { isReaction } from './reactions'

describe('isReaction', () => {
  it('accepte une réaction valide', () => expect(isReaction({ emoji: '🎉', at: 1 })).toBe(true))
  it('rejette une donnée de présence non fiable', () => {
    expect(isReaction({ emoji: '<img src=x>', at: 1 })).toBe(false)
    expect(isReaction({ emoji: '🎉' })).toBe(false)
    expect(isReaction(null)).toBe(false)
  })
})
