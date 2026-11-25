import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import type { BoardSummary } from '@canvas/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import {
  useBoardList,
  useCreateBoard,
  useDeleteBoard,
  useRenameBoard,
  useToggleFavorite,
} from '@/features/boards/useBoards'
import { cn } from '@/lib/utils'
import { BoardCard } from './BoardCard'
import { BoardNameDialog } from './BoardNameDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { UserMenu } from './UserMenu'
import { useDebouncedValue } from './useDebouncedValue'

type Tab = 'recent' | 'favorites'

export function DashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('recent')
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim())
  const boards = useBoardList(q, tab === 'favorites')
  const create = useCreateBoard()
  const rename = useRenameBoard()
  const remove = useDeleteBoard()
  const favorite = useToggleFavorite()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<BoardSummary>()
  const [deleting, setDeleting] = useState<BoardSummary>()

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">Canvas</span>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un board…"
              className="pl-9"
              aria-label="Rechercher un board"
              maxLength={80}
            />
          </div>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Mes boards</h1>
          <div role="tablist" className="ml-2 flex rounded-lg bg-muted p-1 text-sm">
            {(['recent', 'favorites'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-md px-3 py-1 transition',
                  tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'recent' ? 'Récents' : 'Favoris'}
              </button>
            ))}
          </div>
          <Button className="ml-auto" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouveau board
          </Button>
        </div>

        {boards.isPending ? (
          <div className="grid place-items-center py-24">
            <Spinner className="h-8 w-8" />
          </div>
        ) : boards.data && boards.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.data.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                onToggleFavorite={(board) =>
                  favorite.mutate({ id: board.id, favorite: !board.favorite })
                }
                onRename={setRenaming}
                onDelete={setDeleting}
              />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="text-5xl">{tab === 'favorites' ? '⭐' : '🖌️'}</div>
            <p className="mt-3 text-muted-foreground">
              {q
                ? 'Aucun board ne correspond.'
                : tab === 'favorites'
                  ? 'Pas encore de favoris.'
                  : 'Ta toile blanche t’attend.'}
            </p>
            {!q && tab === 'recent' && (
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Créer mon premier board
              </Button>
            )}
          </div>
        )}
      </main>

      {creating && (
        <BoardNameDialog
          open
          title="Nouveau board"
          submitLabel="Créer"
          pending={create.isPending}
          onOpenChange={setCreating}
          onSubmit={(name) =>
            create.mutate(name, {
              onSuccess: (b) => {
                setCreating(false)
                navigate(`/b/${b.id}`)
              },
            })
          }
        />
      )}
      {renaming && (
        <BoardNameDialog
          open
          title="Renommer le board"
          submitLabel="Renommer"
          initialName={renaming.name}
          pending={rename.isPending}
          onOpenChange={(o) => !o && setRenaming(undefined)}
          onSubmit={(name) =>
            rename.mutate({ id: renaming.id, name }, { onSuccess: () => setRenaming(undefined) })
          }
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          title={`Supprimer « ${deleting.name} » ?`}
          description="Le board, son contenu et ses images seront définitivement supprimés pour tous les membres."
          confirmLabel="Supprimer"
          onOpenChange={(o) => !o && setDeleting(undefined)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) })}
        />
      )}
    </div>
  )
}
