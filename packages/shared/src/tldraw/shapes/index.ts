import type { SchemaPropsInfo } from '@tldraw/tlschema'
import {
  CONNECT4_TYPE,
  connect4Props,
  DICE_TYPE,
  diceProps,
  gameMigrations,
  PICTIONARY_TYPE,
  pictionaryProps,
  SCOREBOARD_TYPE,
  scoreboardProps,
  TICTACTOE_TYPE,
  ticTacToeProps,
  TIMER_TYPE,
  timerProps,
} from './games'
import { MINDMAP_NODE_TYPE, mindmapNodeMigrations, mindmapNodeProps } from './mindmapNode'

export * from './mindmapNode'
export * from './games'

/** Schémas des shapes custom, validés par le serveur sync (props + migrations). */
export const customShapeSchemas: Record<string, SchemaPropsInfo> = {
  [MINDMAP_NODE_TYPE]: { props: mindmapNodeProps, migrations: mindmapNodeMigrations },
  [DICE_TYPE]: { props: diceProps, migrations: gameMigrations },
  [TIMER_TYPE]: { props: timerProps, migrations: gameMigrations },
  [SCOREBOARD_TYPE]: { props: scoreboardProps, migrations: gameMigrations },
  [PICTIONARY_TYPE]: { props: pictionaryProps, migrations: gameMigrations },
  [TICTACTOE_TYPE]: { props: ticTacToeProps, migrations: gameMigrations },
  [CONNECT4_TYPE]: { props: connect4Props, migrations: gameMigrations },
}
