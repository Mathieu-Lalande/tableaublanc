import { BaseBoxShapeUtil, type TLShape } from 'tldraw'
import {
  CONNECT4_COLS,
  CONNECT4_TYPE,
  connect4Props,
  connect4Rules,
  gameMigrations,
  gameStateToProps,
  initialState,
  TICTACTOE_TYPE,
  ticTacToeProps,
  ticTacToeRules,
  type Connect4Symbol,
  type TicTacToeSymbol,
} from '@canvas/shared'
import { BoardGameView, type SymbolStyle } from './BoardGameView'

type TicTacToeShape = TLShape<typeof TICTACTOE_TYPE>
type Connect4Shape = TLShape<typeof CONNECT4_TYPE>

function roundedRect(w: number, h: number): Path2D {
  const p = new Path2D()
  p.roundRect(0, 0, w, h, 16)
  return p
}

const TTT_SYMBOLS: Record<TicTacToeSymbol, SymbolStyle> = {
  X: {
    label: 'X',
    render: (size) => (
      <span
        className={`font-black leading-none text-rose-500 ${size === 'sm' ? 'text-base' : 'text-5xl'}`}
      >
        ✕
      </span>
    ),
  },
  O: {
    label: 'O',
    render: (size) => (
      <span
        className={`font-black leading-none text-sky-500 ${size === 'sm' ? 'text-base' : 'text-5xl'}`}
      >
        ◯
      </span>
    ),
  },
}

const C4_SYMBOLS: Record<Connect4Symbol, SymbolStyle> = {
  R: {
    label: 'Rouge',
    render: () => <span className="block h-full w-full rounded-full bg-red-500 shadow-inner" />,
  },
  Y: {
    label: 'Jaune',
    render: () => <span className="block h-full w-full rounded-full bg-yellow-400 shadow-inner" />,
  },
}

export class TicTacToeShapeUtil extends BaseBoxShapeUtil<TicTacToeShape> {
  static override type = TICTACTOE_TYPE
  static override props = ticTacToeProps
  static override migrations = gameMigrations

  override getDefaultProps(): TicTacToeShape['props'] {
    return { w: 300, h: 400, ...gameStateToProps(ticTacToeRules, initialState(ticTacToeRules)) }
  }
  override canResize = () => false
  override hideResizeHandles = () => true
  override getIndicatorPath(shape: TicTacToeShape) {
    return roundedRect(shape.props.w, shape.props.h)
  }

  override component(shape: TicTacToeShape) {
    return (
      <BoardGameView
        shape={shape}
        rules={ticTacToeRules}
        title="⭕ Morpion"
        symbols={TTT_SYMBOLS}
        gridClass="grid flex-1 w-full grid-cols-3 gap-1.5"
        cellClass="grid place-items-center rounded-xl bg-muted aspect-square disabled:cursor-default"
        targetFor={(index) => ({ kind: 'cell', index })}
      />
    )
  }
}

export class Connect4ShapeUtil extends BaseBoxShapeUtil<Connect4Shape> {
  static override type = CONNECT4_TYPE
  static override props = connect4Props
  static override migrations = gameMigrations

  override getDefaultProps(): Connect4Shape['props'] {
    return { w: 440, h: 470, ...gameStateToProps(connect4Rules, initialState(connect4Rules)) }
  }
  override canResize = () => false
  override hideResizeHandles = () => true
  override getIndicatorPath(shape: Connect4Shape) {
    return roundedRect(shape.props.w, shape.props.h)
  }

  override component(shape: Connect4Shape) {
    return (
      <BoardGameView
        shape={shape}
        rules={connect4Rules}
        title="🔴 Puissance 4"
        symbols={C4_SYMBOLS}
        gridClass="grid w-full grid-cols-7 gap-1 rounded-xl bg-blue-600 p-2"
        cellClass="aspect-square rounded-full bg-white/90 p-0.5 dark:bg-zinc-900"
        // Un clic n'importe où dans la colonne y fait tomber le pion.
        targetFor={(index) => ({ kind: 'column', column: index % CONNECT4_COLS })}
      />
    )
  }
}
