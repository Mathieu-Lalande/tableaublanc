import { useCallback } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

const pictionaryEnd = z.object({
  type: z.literal('pictionary:end'),
  status: z.enum(['solved', 'timeout']),
  winnerName: z.string(),
  word: z.string(),
})

/** Messages custom envoyés par le serveur (fin de manche de pictionary…). */
export function useGameMessages(): (data: unknown) => void {
  return useCallback((data: unknown) => {
    const msg = pictionaryEnd.safeParse(data)
    if (!msg.success) return
    if (msg.data.status === 'solved')
      toast.success(`${msg.data.winnerName} a trouvé « ${msg.data.word} » !`, { icon: '🎉' })
    else toast(`Temps écoulé : c’était « ${msg.data.word} »`, { icon: '⌛' })
  }, [])
}
