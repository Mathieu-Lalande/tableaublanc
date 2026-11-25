import { Dialog } from '@/components/ui/dialog'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

export const CANVAS_SHORTCUTS: ReadonlyArray<{ readonly keys: string; readonly label: string }> = [
  { keys: `${mod} + K`, label: 'Bibliothèque : modules, modèles, jeux, export/import' },
  { keys: 'Tab', label: 'Mind map : ajouter un enfant au nœud sélectionné' },
  { keys: 'Entrée', label: 'Mind map : ajouter un frère (ou valider la saisie)' },
  { keys: 'Maj + Entrée', label: 'Mind map : retour à la ligne pendant la saisie' },
  { keys: 'Double-clic', label: 'Éditer le texte d’un nœud ou d’un post-it' },
  { keys: '/', label: 'Chat éphémère au curseur (natif tldraw)' },
  { keys: 'K', label: 'Pointeur laser (natif tldraw)' },
  { keys: `${mod} + Alt + /`, label: 'Tous les raccourcis natifs de tldraw' },
]

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean
  readonly onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Raccourcis clavier"
      description="Ceux propres à Canvas, plus quelques natifs utiles."
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {CANVAS_SHORTCUTS.map((s) => (
          <div key={s.keys} className="contents">
            <dt>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{s.label}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
