import { useCallback } from 'react'

/** Messages custom serveur → client (ex. mot secret du pictionary). Complété en P4. */
export function useGameMessages(): (data: unknown) => void {
  return useCallback((_data: unknown) => {}, [])
}
