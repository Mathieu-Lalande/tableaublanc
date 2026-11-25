import type { ReactNode } from 'react'
import { useEditor, type TLShape } from 'tldraw'
import {
  applyMove,
  claimSeat,
  gameStateToProps,
  initialState,
  propsToGameState,
  type BoardGameRules,
  type MoveTarget,
} from '@canvas/shared'
import { useCurrentUser } from '@/features/board/BoardUiContext'
import { ShapeButton, ShapeCard } from '@/features/modules/shared/ShapeCard'
import { cn } from '@/lib/utils'

type GridShape = TLShape<'tictactoe'> | TLShape<'connect4'>

export interface SymbolStyle {
  readonly label: string
  readonly render: (size: 'sm' | 'lg') => ReactNode
}

export interface BoardGameViewProps<S extends string> {
  readonly shape: GridShape
  readonly rules: BoardGameRules<S>
  readonly title: string
  readonly symbols: Readonly<Record<S, SymbolStyle>>
  readonly cellClass: string
  readonly gridClass: string
  readonly targetFor: (index: number) => MoveTarget
}

/** Vue commune morpion / puissance 4 : places, tour, grille, résultat, rejouer. */
export function BoardGameView<S extends string>({
  shape,
  rules,
  title,
  symbols,
  cellClass,
  gridClass,
  targetFor,
}: BoardGameViewProps<S>) {
  const editor = useEditor()
  const me = useCurrentUser()
  const props = shape.props as unknown as Parameters<typeof propsToGameState<S>>[1]
  const state = propsToGameState(rules, props)
  const winLine = new Set(state.winLine ? state.winLine.split(',').map(Number) : [])
  const mySeat = rules.game.symbols.find((s) => me && state.players[s].id === me.id)
  const readonly = editor.getIsReadonly()

  const write = (next: ReturnType<typeof initialState<S>> | null) => {
    if (!next) return
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      props: gameStateToProps(rules, next),
    } as never)
  }

  const status = (() => {
    if (state.winner === 'draw') return '🤝 Match nul'
    if (state.winner)
      return `🎉 ${state.players[state.winner as S].name || symbols[state.winner as S].label} gagne !`
    const turn = state.players[state.next]
    if (!turn.id) return 'En attente des joueurs…'
    return turn.id === me?.id ? '👉 À toi de jouer !' : `Au tour de ${turn.name}`
  })()

  return (
    <ShapeCard className="items-center gap-2 p-3">
      <div className="flex w-full items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {status}
        </span>
      </div>
      <div className="flex w-full gap-2">
        {rules.game.symbols.map((s) => {
          const p = state.players[s]
          return (
            <div
              key={s}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm',
                state.next === s && !state.winner && 'border-primary bg-accent',
              )}
            >
              <span className="grid h-5 w-5 place-items-center">{symbols[s].render('sm')}</span>
              {p.id ? (
                <span className="truncate">{p.name}</span>
              ) : (
                <ShapeButton
                  disabled={!me || readonly || mySeat !== undefined}
                  onClick={() => me && write(claimSeat(state, s, me))}
                  className="px-2 py-0.5 text-xs"
                  title={`Jouer ${symbols[s].label}`}
                >
                  Rejoindre
                </ShapeButton>
              )}
            </div>
          )
        })}
      </div>
      <div className={gridClass} role="grid" aria-label={title}>
        {[...state.cells].map((cell, i) => {
          const canPlay =
            !!me && !readonly && !state.winner && state.players[state.next].id === me.id
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={`Case ${i + 1}${cell === '.' ? '' : ` : ${symbols[cell as S].label}`}`}
              disabled={!canPlay}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                if (me) write(applyMove(rules, state, me.id, targetFor(i)))
              }}
              className={cn(
                cellClass,
                canPlay && 'cursor-pointer hover:brightness-95',
                winLine.has(i) && 'canvas-win-cell',
              )}
            >
              {cell !== '.' && symbols[cell as S].render('lg')}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <ShapeButton
          disabled={readonly}
          onClick={() => write(initialState(rules, state.players))}
          className="text-xs"
          title="Rejouer"
        >
          ↺ Rejouer
        </ShapeButton>
        <ShapeButton
          disabled={readonly}
          onClick={() => write(initialState(rules))}
          className="text-xs"
          title="Libérer les places"
        >
          Libérer les places
        </ShapeButton>
      </div>
    </ShapeCard>
  )
}
