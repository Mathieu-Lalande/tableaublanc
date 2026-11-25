import { Link } from 'react-router'
import { ArrowLeft, Eye, LibraryBig, MessageCircle, Share2 } from 'lucide-react'
import { PeopleMenu } from 'tldraw'
import { ChatPanel } from '@/features/collaboration/ChatPanel'
import { ReactionBar } from '@/features/collaboration/ReactionBar'
import { cn } from '@/lib/utils'
import { useBoardUi } from './BoardUiContext'

const chromeButton =
  'pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-muted active:scale-95'

export function BoardTitleBar() {
  const { board } = useBoardUi()
  return (
    <div className="pointer-events-auto mt-2 flex items-center gap-2 rounded-xl border border-border bg-card/95 py-1 pl-1 pr-3 text-foreground shadow-sm backdrop-blur">
      <Link
        to="/"
        aria-label="Retour aux boards"
        className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="max-w-[40vw] truncate text-sm font-semibold" data-testid="board-title">
        {board.name}
      </h1>
      {board.role === 'VIEWER' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" /> Lecture seule
        </span>
      )}
    </div>
  )
}

export function BoardSharePanel() {
  const { board, chatOpen, toggleChat, openShare, openLibrary } = useBoardUi()
  return (
    <div className="pointer-events-auto flex items-center gap-2 p-2">
      <PeopleMenu />
      {board.role !== 'VIEWER' && (
        <button
          type="button"
          className={chromeButton}
          onClick={openLibrary}
          aria-label="Bibliothèque (Ctrl+K)"
          title="Bibliothèque (Ctrl+K)"
        >
          <LibraryBig className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className={cn(chromeButton, chatOpen && 'bg-accent')}
        onClick={toggleChat}
        aria-pressed={chatOpen}
        aria-label="Chat"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(
          chromeButton,
          'bg-primary text-primary-foreground hover:bg-primary hover:brightness-110',
        )}
        onClick={openShare}
      >
        <Share2 className="h-4 w-4" /> Partager
      </button>
    </div>
  )
}

export function BoardOverlay() {
  const { me, chatOpen, toggleChat } = useBoardUi()
  return (
    <div className="pointer-events-none absolute bottom-14 left-2 flex flex-col items-start gap-2">
      {chatOpen && <ChatPanel me={me} onClose={toggleChat} />}
      <ReactionBar />
    </div>
  )
}
