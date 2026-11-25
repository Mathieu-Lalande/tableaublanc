import { Link } from 'react-router'
import { DropdownMenu } from 'radix-ui'
import { MoreHorizontal, Pencil, Star, Trash2, Users } from 'lucide-react'
import type { BoardSummary } from '@canvas/shared'
import { cn } from '@/lib/utils'
import { relativeTime } from './relativeTime'

const ROLE_LABEL = { OWNER: 'Propriétaire', EDITOR: 'Éditeur', VIEWER: 'Lecteur' } as const

export interface BoardCardProps {
  readonly board: BoardSummary
  readonly onToggleFavorite: (board: BoardSummary) => void
  readonly onRename: (board: BoardSummary) => void
  readonly onDelete: (board: BoardSummary) => void
}

export function BoardCard({ board, onToggleFavorite, onRename, onDelete }: BoardCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/b/${board.id}`} className="block" aria-label={`Ouvrir ${board.name}`}>
        <div className="aspect-[16/10] overflow-hidden bg-muted [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
          {board.thumbnailUrl ? (
            <img
              src={board.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-4xl opacity-40">🎨</div>
          )}
        </div>
      </Link>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{board.name}</h3>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {relativeTime(board.lastOpenedAt ?? board.updatedAt)}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {board.memberCount}
            </span>
            <span aria-hidden>·</span>
            <span>{ROLE_LABEL[board.role]}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(board)}
          aria-label={board.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={board.favorite}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Star
            className={cn(
              'h-4 w-4 transition',
              board.favorite && 'fill-yellow-400 text-yellow-400',
            )}
          />
        </button>
        {board.role !== 'VIEWER' && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label="Actions"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-40 animate-pop rounded-xl border border-border bg-card p-1 text-sm text-foreground shadow-xl"
              >
                <DropdownMenu.Item
                  onSelect={() => onRename(board)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none data-[highlighted]:bg-muted"
                >
                  <Pencil className="h-4 w-4" /> Renommer
                </DropdownMenu.Item>
                {board.role === 'OWNER' && (
                  <DropdownMenu.Item
                    onSelect={() => onDelete(board)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-destructive outline-none data-[highlighted]:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </article>
  )
}
