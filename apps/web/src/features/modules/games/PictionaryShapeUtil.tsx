import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { BaseBoxShapeUtil, type TLShape } from 'tldraw'
import { toast } from 'sonner'
import { gameMigrations, PICTIONARY_TYPE, pictionaryProps } from '@canvas/shared'
import { useCurrentUser, useOptionalBoardUi } from '@/features/board/BoardUiContext'
import { api, ApiError } from '@/lib/api'
import { ShapeButton, ShapeCard } from '@/features/modules/shared/ShapeCard'
import { formatDuration } from './TimerShapeUtil'
import { useServerNow } from '@/features/modules/shared/useTick'

type PictionaryShape = TLShape<typeof PICTIONARY_TYPE>

const wordSchema = z.object({ word: z.string() })
const guessSchema = z.object({ correct: z.boolean() })

export class PictionaryShapeUtil extends BaseBoxShapeUtil<PictionaryShape> {
  static override type = PICTIONARY_TYPE
  static override props = pictionaryProps
  static override migrations = gameMigrations

  override getDefaultProps(): PictionaryShape['props'] {
    return {
      w: 340,
      h: 250,
      status: 'idle',
      round: 0,
      drawerId: '',
      drawerName: '',
      hint: '',
      endsAt: 0,
      revealedWord: '',
      winnerName: '',
    }
  }
  override canResize = () => false
  override hideResizeHandles = () => true
  override getIndicatorPath(shape: PictionaryShape) {
    const p = new Path2D()
    p.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return p
  }

  override component(shape: PictionaryShape) {
    return <PictionaryView shape={shape} />
  }
}

function endpoint(boardId: string, shapeId: string, action: string): string {
  return `/api/boards/${encodeURIComponent(boardId)}/pictionary/${encodeURIComponent(shapeId)}/${action}`
}

function PictionaryView({ shape }: { readonly shape: PictionaryShape }) {
  const me = useCurrentUser()
  const ui = useOptionalBoardUi()
  const boardId = ui?.board.id ?? ''
  const isViewer = ui?.board.role !== 'EDITOR' && ui?.board.role !== 'OWNER'
  const p = shape.props
  const drawing = p.status === 'drawing'
  const isDrawer = drawing && me?.id === p.drawerId
  const now = useServerNow(drawing)
  // La proposition en cours est liée à la manche : elle se vide automatiquement à la suivante.
  const [draft, setDraft] = useState({ round: p.round, value: '' })
  const guess = draft.round === p.round ? draft.value : ''
  const setGuess = (value: string) => setDraft({ round: p.round, value })
  const [busy, setBusy] = useState(false)

  // Le mot n'est demandé au serveur que par le dessinateur (l'API refuse les autres).
  const word = useQuery({
    queryKey: ['pictionary-word', boardId, shape.id, p.round],
    queryFn: () => api(endpoint(boardId, shape.id, 'word'), wordSchema),
    enabled: isDrawer && boardId !== '',
    staleTime: Infinity,
    retry: false,
  })

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action impossible')
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(
      async () =>
        void (await api(endpoint(boardId, shape.id, 'start'), wordSchema, { method: 'POST' })),
    )
  const skip = () =>
    run(
      async () =>
        void (await api(endpoint(boardId, shape.id, 'skip'), z.unknown().optional(), {
          method: 'POST',
        }).catch(() => undefined)),
    )
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = guess.trim()
    if (!value) return
    void run(async () => {
      const res = await api(endpoint(boardId, shape.id, 'guess'), guessSchema, {
        method: 'POST',
        body: { guess: value },
      })
      if (!res.correct) toast('Raté… essaie encore !', { icon: '🤔' })
      setGuess('')
    })
  }

  return (
    <ShapeCard className="gap-3 p-4" accent="#ec4899">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">🎨 Pictionary</h3>
        {drawing && (
          <span className="font-mono text-sm tabular-nums">
            {formatDuration(Math.max(0, p.endsAt - now))}
          </span>
        )}
      </div>

      {drawing ? (
        isDrawer ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">Dessine (sans lettres !) :</p>
            <p className="text-2xl font-black text-primary" data-testid="pictionary-word">
              {word.data?.word ?? '…'}
            </p>
            <ShapeButton onClick={skip} disabled={busy} className="text-xs" title="Passer">
              Passer ⏭
            </ShapeButton>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm">
              <strong>{p.drawerName}</strong> dessine…
            </p>
            <p className="text-center font-mono text-xl tracking-widest" aria-label="Indice">
              {p.hint}
            </p>
            <form onSubmit={submit} className="mt-auto flex gap-2">
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={80}
                placeholder="Ta proposition…"
                aria-label="Proposition"
                className="h-9 min-w-0 flex-1 rounded-lg bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={busy}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Deviner
              </button>
            </form>
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          {p.status === 'solved' && (
            <p className="text-sm">
              🎉 <strong>{p.winnerName}</strong> a trouvé <strong>« {p.revealedWord} »</strong>
            </p>
          )}
          {p.status === 'timeout' && (
            <p className="text-sm">
              ⌛ Personne n’a trouvé… c’était <strong>« {p.revealedWord} »</strong>
            </p>
          )}
          {p.status === 'idle' && (
            <p className="text-sm text-muted-foreground">
              Un joueur dessine, les autres devinent !
            </p>
          )}
          <ShapeButton
            onClick={start}
            disabled={busy || isViewer}
            className="bg-primary text-primary-foreground"
            title="Je dessine"
          >
            ✏️ Je dessine !
          </ShapeButton>
        </div>
      )}
    </ShapeCard>
  )
}
