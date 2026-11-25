import { createShapeId, type Editor, type TLShape } from 'tldraw'
import {
  CONNECT4_TYPE,
  DICE_TYPE,
  PICTIONARY_TYPE,
  SCOREBOARD_TYPE,
  TICTACTOE_TYPE,
  TIMER_TYPE,
} from '@canvas/shared'
import type { LibraryItem } from '@/features/library/types'

type GameType =
  | typeof DICE_TYPE
  | typeof TIMER_TYPE
  | typeof SCOREBOARD_TYPE
  | typeof PICTIONARY_TYPE
  | typeof TICTACTOE_TYPE
  | typeof CONNECT4_TYPE

/** Insère une shape de jeu (props par défaut de sa ShapeUtil) au centre de la vue. */
function insertGame(editor: Editor, type: GameType): void {
  const id = createShapeId()
  const util = editor.getShapeUtil(type)
  const { w, h } = util.getDefaultProps() as { w: number; h: number }
  const c = editor.getViewportPageBounds().center
  editor.markHistoryStoppingPoint('insert game')
  editor.createShape({ id, type, x: c.x - w / 2, y: c.y - h / 2 } as Partial<TLShape> & {
    type: GameType
  })
  editor.select(id)
}

export const gameItems: readonly LibraryItem[] = [
  {
    id: 'game-dice',
    label: 'Dé',
    description: 'Un lancer animé, visible par tous',
    emoji: '🎲',
    category: 'Jeux',
    keywords: ['dés', 'hasard'],
    run: ({ editor }) => insertGame(editor, DICE_TYPE),
  },
  {
    id: 'game-timer',
    label: 'Minuteur partagé',
    description: 'Synchronisé sur l’horloge du serveur',
    emoji: '⏱️',
    category: 'Jeux',
    keywords: ['chrono', 'timer', 'pomodoro'],
    run: ({ editor }) => insertGame(editor, TIMER_TYPE),
  },
  {
    id: 'game-scoreboard',
    label: 'Tableau de score',
    description: 'Joueurs, points, couronne du leader',
    emoji: '🏆',
    category: 'Jeux',
    keywords: ['points', 'score'],
    run: ({ editor }) => insertGame(editor, SCOREBOARD_TYPE),
  },
  {
    id: 'game-pictionary',
    label: 'Pictionary',
    description: 'Mot secret visible seulement par le dessinateur',
    emoji: '🎨',
    category: 'Jeux',
    keywords: ['dessin', 'deviner'],
    run: ({ editor }) => insertGame(editor, PICTIONARY_TYPE),
  },
  {
    id: 'game-tictactoe',
    label: 'Morpion',
    description: 'Règles vérifiées par le serveur',
    emoji: '⭕',
    category: 'Jeux',
    keywords: ['tic tac toe', 'xo'],
    run: ({ editor }) => insertGame(editor, TICTACTOE_TYPE),
  },
  {
    id: 'game-connect4',
    label: 'Puissance 4',
    description: 'Aligne 4 pions, règles vérifiées par le serveur',
    emoji: '🔴',
    category: 'Jeux',
    keywords: ['connect four', 'pions'],
    run: ({ editor }) => insertGame(editor, CONNECT4_TYPE),
  },
]
