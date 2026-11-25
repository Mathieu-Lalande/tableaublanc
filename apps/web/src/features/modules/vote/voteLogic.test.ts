import { describe, expect, it } from 'vitest'
import { readVotes, toggleVote, usedVotes, voteCount } from './voteLogic'

describe('vote par points', () => {
  it('ajoute puis retire un vote', () => {
    const v1 = toggleVote({}, 'a', 0)
    expect(v1).toEqual({ a: 1 })
    expect(v1 && toggleVote(v1, 'a', 1)).toEqual({})
  })
  it('respecte le quota par personne', () => {
    expect(toggleVote({}, 'a', 3)).toBeNull()
  })
  it('compte les votes utilisés et ignore les données invalides', () => {
    expect(usedVotes([{ a: 1 }, { a: 1, b: 1 }, {}], 'a')).toBe(2)
    expect(readVotes({ votes: { a: 1, b: 5, c: 'x' } })).toEqual({ a: 1 })
    expect(readVotes({ votes: [1] })).toEqual({})
    expect(voteCount({ a: 1, b: 1 })).toBe(2)
  })
})
