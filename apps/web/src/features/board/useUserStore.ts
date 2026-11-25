import { useEffect, useMemo, useState } from 'react'
import { atom, computed, createUserId, UserRecordType, type TLUserStore } from 'tldraw'
import type { Me } from '@canvas/shared'

/**
 * Identité tldraw (nom + couleur du curseur) alimentée par notre compte, et non par les
 * préférences locales du navigateur.
 */
export function useUserStore(me: Me): TLUserStore {
  // L'atom est créé une seule fois ; ses mises à jour propagent nom/couleur sans recréer le store.
  const [meAtom] = useState(() => atom('canvas-me', me))
  useEffect(() => {
    meAtom.set(me)
  }, [me, meAtom])

  return useMemo<TLUserStore>(
    () => ({
      currentUser: computed('canvas-current-user', () => {
        const u = meAtom.get()
        return UserRecordType.create({ id: createUserId(u.id), name: u.username, color: u.color })
      }),
    }),
    [meAtom],
  )
}
