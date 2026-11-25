import { BaseBoxShapeUtil, uniqueId, useEditor, type TLShape } from 'tldraw'
import {
  gameMigrations,
  SCOREBOARD_TYPE,
  scoreboardProps,
  type ScoreboardPlayer,
} from '@canvas/shared'
import { ShapeButton, ShapeCard } from '@/features/modules/shared/ShapeCard'

type ScoreboardShape = TLShape<typeof SCOREBOARD_TYPE>

const PLAYER_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]
const ROW_H = 44
const HEADER_H = 110

export function scoreboardHeight(players: number): number {
  return HEADER_H + Math.max(1, players) * ROW_H + 56
}

export class ScoreboardShapeUtil extends BaseBoxShapeUtil<ScoreboardShape> {
  static override type = SCOREBOARD_TYPE
  static override props = scoreboardProps
  static override migrations = gameMigrations

  override getDefaultProps(): ScoreboardShape['props'] {
    const players: ScoreboardPlayer[] = [
      { id: 'p1', name: 'Joueur 1', score: 0, color: PLAYER_COLORS[0] ?? '#ef4444' },
      { id: 'p2', name: 'Joueur 2', score: 0, color: PLAYER_COLORS[1] ?? '#3b82f6' },
    ]
    return { w: 320, h: scoreboardHeight(players.length), title: 'Scores', players }
  }
  override canResize = () => false
  override hideResizeHandles = () => true

  override getIndicatorPath(shape: ScoreboardShape): Path2D {
    const p = new Path2D()
    p.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return p
  }

  override component(shape: ScoreboardShape) {
    return <ScoreboardView shape={shape} />
  }
}

function ScoreboardView({ shape }: { readonly shape: ScoreboardShape }) {
  const editor = useEditor()
  const { players } = shape.props
  const best = Math.max(...players.map((p) => p.score))

  const setPlayers = (next: ScoreboardPlayer[]) =>
    editor.updateShape<ScoreboardShape>({
      id: shape.id,
      type: SCOREBOARD_TYPE,
      props: { players: next, h: scoreboardHeight(next.length) },
    })
  const patch = (id: string, change: Partial<ScoreboardPlayer>) =>
    setPlayers(players.map((p) => (p.id === id ? { ...p, ...change } : p)))
  const add = () =>
    setPlayers([
      ...players,
      {
        id: uniqueId(),
        name: `Joueur ${players.length + 1}`,
        score: 0,
        color: PLAYER_COLORS[players.length % PLAYER_COLORS.length] ?? '#888',
      },
    ])

  return (
    <ShapeCard className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold">🏆 {shape.props.title}</h3>
        <ShapeButton
          onClick={() => setPlayers(players.map((p) => ({ ...p, score: 0 })))}
          className="text-xs"
          title="Remettre à zéro"
        >
          ↺ 0
        </ShapeButton>
      </div>
      <ul className="flex-1 space-y-1">
        {players.map((p) => (
          <li key={p.id} className="flex h-10 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
            <input
              aria-label="Nom du joueur"
              value={p.name}
              maxLength={24}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => patch(p.id, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-muted"
            />
            {p.score === best && best > 0 && <span aria-label="En tête">👑</span>}
            <ShapeButton
              onClick={() => patch(p.id, { score: p.score - 1 })}
              className="h-8 w-8 px-0"
              title="Moins un"
            >
              −
            </ShapeButton>
            <span className="w-10 text-center font-mono text-lg font-bold tabular-nums">
              {p.score}
            </span>
            <ShapeButton
              onClick={() => patch(p.id, { score: p.score + 1 })}
              className="h-8 w-8 px-0"
              title="Plus un"
            >
              +
            </ShapeButton>
            <ShapeButton
              onClick={() => setPlayers(players.filter((x) => x.id !== p.id))}
              className="h-8 w-8 bg-transparent px-0 text-muted-foreground"
              title="Retirer le joueur"
            >
              ✕
            </ShapeButton>
          </li>
        ))}
      </ul>
      <ShapeButton
        onClick={add}
        disabled={players.length >= 12}
        className="mt-2 w-full"
        title="Ajouter un joueur"
      >
        + Joueur
      </ShapeButton>
    </ShapeCard>
  )
}
