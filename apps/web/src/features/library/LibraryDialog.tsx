import { Command } from 'cmdk'
import { Dialog as RadixDialog } from 'radix-ui'
import type { Editor } from 'tldraw'
import { toast } from 'sonner'
import { libraryItems } from './items'
import type { LibraryCategory, LibraryItem } from './types'

const CATEGORIES: readonly LibraryCategory[] = ['Modules', 'Modèles', 'Jeux', 'Fichier']

export interface LibraryDialogProps {
  readonly editor: Editor
  readonly boardId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

/** Command palette (Ctrl/Cmd+K) : insertion de modules, modèles, jeux et actions fichier. */
export function LibraryDialog({ editor, boardId, open, onOpenChange }: LibraryDialogProps) {
  const run = async (item: LibraryItem) => {
    onOpenChange(false)
    try {
      await item.run({ editor, boardId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible')
    }
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[400] bg-black/30 backdrop-blur-[2px]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-[401] w-[min(92vw,560px)] -translate-x-1/2 animate-pop overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <RadixDialog.Title className="sr-only">Bibliothèque</RadixDialog.Title>
          <Command label="Bibliothèque" loop>
            <Command.Input
              autoFocus
              placeholder="Insérer un module, un modèle, un jeu…"
              className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="max-h-[56vh] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                Rien trouvé 🤷
              </Command.Empty>
              {CATEGORIES.map((cat) => {
                const items = libraryItems.filter((i) => i.category === cat)
                if (items.length === 0) return null
                return (
                  <Command.Group
                    key={cat}
                    heading={cat}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                        onSelect={() => void run(item)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 data-[selected=true]:bg-accent"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-lg">
                          {item.emoji}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )
              })}
            </Command.List>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
