/** Vote par points : un point par personne et par post-it, `max` points par personne. */
export const MAX_VOTES_PER_USER = 3

export type Votes = Readonly<Record<string, number>>

export function readVotes(meta: Readonly<Record<string, unknown>>): Votes {
  const raw = meta['votes']
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) if (v === 1) out[k] = 1
  return out
}

export function voteCount(votes: Votes): number {
  return Object.keys(votes).length
}

export function usedVotes(allVotes: readonly Votes[], userId: string): number {
  return allVotes.filter((v) => v[userId] === 1).length
}

/** Bascule le vote de l'utilisateur ; null si le quota est atteint. */
export function toggleVote(
  votes: Votes,
  userId: string,
  used: number,
  max = MAX_VOTES_PER_USER,
): Votes | null {
  if (votes[userId] === 1) {
    const { [userId]: _removed, ...rest } = votes
    return rest
  }
  if (used >= max) return null
  return { ...votes, [userId]: 1 }
}
