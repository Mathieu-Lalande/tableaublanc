import { useEffect, useState } from 'react'
import { serverNow } from './serverClock'

/** Heure serveur rafraîchie périodiquement tant que `active` est vrai. */
export function useServerNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(serverNow()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return now
}
