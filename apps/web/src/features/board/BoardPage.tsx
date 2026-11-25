import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Editor } from 'tldraw'
import type { BoardDetail, Me } from '@canvas/shared'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useMe } from '@/features/auth/useAuth'
import { useBoard } from '@/features/boards/useBoards'
import { LibraryDialog } from '@/features/library/LibraryDialog'
import { useLibraryOverrides } from '@/features/library/useLibraryOverrides'
import { useGameMessages } from '@/features/modules/games/useGameMessages'
import { useTheme } from '@/features/theme/ThemeProvider'
import { boardComponents } from './boardComponents'
import { BoardCanvas } from './BoardCanvas'
import { BoardUiContext, type BoardUi } from './BoardUiContext'
import { ShareDialog } from './ShareDialog'
import { useBoardThumbnail } from './useBoardThumbnail'
import { useUserStore } from './useUserStore'

export function BoardPage() {
  const { boardId = '' } = useParams()
  const { data: me } = useMe()
  const board = useBoard(boardId)

  if (board.isPending || !me) return <FullPageSpinner />
  if (board.isError || !board.data) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <div className="text-5xl">🧭</div>
          <p className="mt-3 text-muted-foreground">
            Ce board n’existe pas ou tu n’y as pas accès.
          </p>
          <Link to="/">
            <Button className="mt-4">Retour à mes boards</Button>
          </Link>
        </div>
      </div>
    )
  }
  return <BoardWorkspace me={me} board={board.data} />
}

function BoardWorkspace({ me, board }: { readonly me: Me; readonly board: BoardDetail }) {
  const { resolved } = useTheme()
  const users = useUserStore(me)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const canEdit = board.role !== 'VIEWER'
  const onGameMessage = useGameMessages()

  // Lecture seule côté UI (le serveur l'impose de toute façon) — suit les changements de rôle.
  useEffect(() => {
    editor?.updateInstanceState({ isReadonly: !canEdit })
  }, [editor, canEdit])

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme: resolved })
  }, [editor, resolved])

  useBoardThumbnail(editor, board.id, canEdit)

  const openLibrary = useCallback(() => setLibraryOpen(true), [])
  const overrides = useLibraryOverrides(openLibrary, canEdit)

  const ui = useMemo<BoardUi>(
    () => ({
      me,
      board,
      chatOpen,
      toggleChat: () => setChatOpen((o) => !o),
      openShare: () => setShareOpen(true),
      openLibrary,
    }),
    [me, board, chatOpen, openLibrary],
  )

  return (
    <BoardUiContext.Provider value={ui}>
      <BoardCanvas
        boardId={board.id}
        users={users}
        components={boardComponents}
        overrides={overrides}
        colorScheme={resolved}
        onEditor={setEditor}
        onCustomMessage={onGameMessage}
      />
      <ShareDialog
        boardId={board.id}
        myId={me.id}
        myRole={board.role}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      {editor && canEdit && (
        <LibraryDialog
          editor={editor}
          boardId={board.id}
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
        />
      )}
    </BoardUiContext.Provider>
  )
}
