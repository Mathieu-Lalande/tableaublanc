import { z } from 'zod'

let offsetMs = 0
let synced: Promise<void> | null = null

/**
 * Estime le décalage entre l'horloge locale et celle du serveur (une requête, milieu de l'aller-retour).
 * Les minuteurs et fins de manche sont exprimés en heure serveur.
 */
export function syncServerClock(): Promise<void> {
  synced ??= (async () => {
    try {
      const t0 = Date.now()
      const res = await fetch('/api/time', { credentials: 'same-origin' })
      const { now } = z.object({ now: z.number() }).parse(await res.json())
      offsetMs = now - (t0 + Date.now()) / 2
    } catch {
      offsetMs = 0
    }
  })()
  return synced
}

export function serverNow(): number {
  return Date.now() + offsetMs
}
