import { useState } from 'react'
import { Check, Copy, Link2, Trash2, UserMinus } from 'lucide-react'
import type { CreatedInvite, Role } from '@canvas/shared'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  useCreateInvite,
  useInvites,
  useMembers,
  useRemoveMember,
  useRevokeInvite,
  useUpdateMember,
} from '@/features/boards/useBoards'

const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Propriétaire',
  EDITOR: 'Éditeur',
  VIEWER: 'Lecteur',
}
const EXPIRY_OPTIONS = [
  { hours: 24, label: '24 h' },
  { hours: 72, label: '3 jours' },
  { hours: 24 * 7, label: '7 jours' },
  { hours: 24 * 30, label: '30 jours' },
] as const

const selectClass =
  'h-9 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20'

export interface ShareDialogProps {
  readonly boardId: string
  readonly myId: string
  readonly myRole: Role
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ShareDialog({ boardId, myId, myRole, open, onOpenChange }: ShareDialogProps) {
  const isOwner = myRole === 'OWNER'
  const members = useMembers(boardId, open)
  const updateMember = useUpdateMember(boardId)
  const removeMember = useRemoveMember(boardId)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Partager le board"
      description="Invite tes potes et choisis leurs droits."
    >
      {isOwner && <InviteSection boardId={boardId} open={open} />}
      <h3 className="mb-2 mt-5 text-sm font-medium text-muted-foreground">Membres</h3>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {members.data?.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
          >
            <Avatar name={m.username} color={m.color} size="sm" />
            <span className="flex-1 truncate text-sm">
              {m.username}
              {m.userId === myId && <span className="text-muted-foreground"> (toi)</span>}
            </span>
            {isOwner && m.role !== 'OWNER' ? (
              <>
                <select
                  aria-label={`Rôle de ${m.username}`}
                  className={selectClass}
                  value={m.role}
                  onChange={(e) =>
                    updateMember.mutate({
                      userId: m.userId,
                      role: e.target.value as 'EDITOR' | 'VIEWER',
                    })
                  }
                >
                  <option value="EDITOR">Éditeur</option>
                  <option value="VIEWER">Lecteur</option>
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer ${m.username}`}
                  onClick={() => removeMember.mutate(m.userId)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

function InviteSection({ boardId, open }: { readonly boardId: string; readonly open: boolean }) {
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [hours, setHours] = useState<number>(72)
  const [maxUses, setMaxUses] = useState(5)
  const [created, setCreated] = useState<CreatedInvite>()
  const [copied, setCopied] = useState(false)
  const invites = useInvites(boardId, open)
  const create = useCreateInvite(boardId)
  const revoke = useRevokeInvite(boardId)

  const link = created ? `${window.location.origin}/invite/${created.token}` : ''

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Rôle invité"
          className={selectClass}
          value={role}
          onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
        >
          <option value="EDITOR">Peut éditer</option>
          <option value="VIEWER">Lecture seule</option>
        </select>
        <select
          aria-label="Expiration"
          className={selectClass}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          {EXPIRY_OPTIONS.map((o) => (
            <option key={o.hours} value={o.hours}>
              Expire : {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Utilisations"
          className={selectClass}
          value={maxUses}
          onChange={(e) => setMaxUses(Number(e.target.value))}
        >
          {[1, 5, 10, 50].map((n) => (
            <option key={n} value={n}>
              {n} utilisation{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="ml-auto"
          disabled={create.isPending}
          onClick={() =>
            create.mutate({ role, expiresInHours: hours, maxUses }, { onSuccess: setCreated })
          }
        >
          <Link2 className="h-4 w-4" /> Créer un lien
        </Button>
      </div>

      {created && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-accent p-2 animate-pop">
          <code className="flex-1 truncate text-xs" data-testid="invite-link">
            {link}
          </code>
          <Button size="sm" variant="secondary" onClick={copy} aria-label="Copier le lien">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
      {created && (
        <p className="mt-1 text-xs text-muted-foreground">
          Ce lien ne sera plus affiché : copie-le maintenant.
        </p>
      )}

      {invites.data && invites.data.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 text-sm font-medium text-muted-foreground">Liens actifs</h3>
          <ul className="space-y-1">
            {invites.data.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex-1">
                  {ROLE_LABEL[i.role]} · {i.uses}/{i.maxUses} · expire le{' '}
                  {new Date(i.expiresAt).toLocaleString('fr-FR')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Révoquer le lien"
                  onClick={() => revoke.mutate(i.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
