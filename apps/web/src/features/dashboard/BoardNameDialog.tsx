import { useState, type FormEvent } from 'react'
import { boardNameSchema } from '@canvas/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export interface BoardNameDialogProps {
  readonly open: boolean
  readonly title: string
  readonly submitLabel: string
  readonly initialName?: string
  readonly pending?: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (name: string) => void
}

export function BoardNameDialog({
  open,
  title,
  submitLabel,
  initialName = '',
  pending,
  onOpenChange,
  onSubmit,
}: BoardNameDialogProps) {
  const [name, setName] = useState(initialName)
  const parsed = boardNameSchema.safeParse(name)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (parsed.success) onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Week-end à Lisbonne"
          maxLength={80}
          aria-label="Nom du board"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={!parsed.success || pending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
