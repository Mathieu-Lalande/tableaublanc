import {
  atom,
  getDefaultUserPresence,
  type TLStore,
  type TLUser,
  type TLPresenceStateInfo,
} from 'tldraw'

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '🤔', '💡'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export interface Reaction {
  readonly emoji: ReactionEmoji
  /** Horodatage local : permet de rejouer la même réaction deux fois de suite. */
  readonly at: number
}

export const REACTION_TTL_MS = 2200

/** Réaction courante de l'utilisateur, diffusée via la présence (éphémère, non persistée). */
export const myReaction = atom<Reaction | null>('canvas-my-reaction', null)

export function sendReaction(emoji: ReactionEmoji): void {
  myReaction.set({ emoji, at: Date.now() })
}

export function isReaction(value: unknown): value is Reaction {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.at === 'number' &&
    typeof v.emoji === 'string' &&
    (REACTION_EMOJIS as readonly string[]).includes(v.emoji)
  )
}

/** Présence par défaut de tldraw, enrichie de la réaction en cours dans `meta`. */
export function getUserPresence(store: TLStore, user: TLUser): TLPresenceStateInfo | null {
  const base = getDefaultUserPresence(store, user)
  if (!base) return null
  const reaction = myReaction.get()
  return { ...base, meta: reaction ? { reaction: { emoji: reaction.emoji, at: reaction.at } } : {} }
}
