import { BaseBoxShapeUtil, uniqueId, useEditor, type TLShape } from 'tldraw'
import { DICE_TYPE, diceProps, gameMigrations } from '@canvas/shared'
import { ShapeButton, ShapeCard } from '@/features/modules/shared/ShapeCard'
import { useThemeColor } from '@/features/modules/shared/useThemeColor'

type DiceShape = TLShape<typeof DICE_TYPE>

/** Positions des points (grille 3x3) pour chaque face. */
const PIPS: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/** Tirage uniforme 1..6 (rejet pour éviter le biais du modulo). */
export function rollDie(random: () => number = secureRandomByte): number {
  for (;;) {
    const b = random()
    if (b < 252) return (b % 6) + 1
  }
}

function secureRandomByte(): number {
  return crypto.getRandomValues(new Uint8Array(1))[0] ?? 0
}

export class DiceShapeUtil extends BaseBoxShapeUtil<DiceShape> {
  static override type = DICE_TYPE
  static override props = diceProps
  static override migrations = gameMigrations

  override getDefaultProps(): DiceShape['props'] {
    return { w: 180, h: 220, value: 6, rollId: '', color: 'violet' }
  }
  override canResize = () => false
  override hideResizeHandles = () => true

  override getIndicatorPath(shape: DiceShape): Path2D {
    const p = new Path2D()
    p.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return p
  }

  override component(shape: DiceShape) {
    return <DiceView shape={shape} />
  }
}

function DiceView({ shape }: { readonly shape: DiceShape }) {
  const editor = useEditor()
  const color = useThemeColor(shape.props.color)
  const pips = PIPS[shape.props.value] ?? []
  const roll = () =>
    editor.updateShape<DiceShape>({
      id: shape.id,
      type: DICE_TYPE,
      props: { value: rollDie(), rollId: uniqueId() },
    })

  return (
    <ShapeCard className="items-center justify-center gap-4 p-4">
      <div
        // La clé change à chaque lancer : l'animation se rejoue chez tout le monde.
        key={shape.props.rollId}
        className="canvas-dice grid h-24 w-24 grid-cols-3 grid-rows-3 gap-1 rounded-2xl p-3 shadow-inner"
        style={{ background: color.solid }}
        aria-label={`Dé : ${shape.props.value}`}
        role="img"
      >
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="m-auto h-4 w-4 rounded-full"
            style={{ background: pips.includes(i) ? '#fff' : 'transparent' }}
          />
        ))}
      </div>
      <ShapeButton
        onClick={roll}
        title="Lancer le dé"
        className="bg-primary text-primary-foreground"
      >
        🎲 Lancer
      </ShapeButton>
    </ShapeCard>
  )
}
