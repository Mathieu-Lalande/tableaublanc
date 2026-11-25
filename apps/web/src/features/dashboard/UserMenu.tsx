import { DropdownMenu } from 'radix-ui'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { useLogout, useMe, useUpdateMe } from '@/features/auth/useAuth'

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
]

export function UserMenu() {
  const { data: me } = useMe()
  const logout = useLogout()
  const updateMe = useUpdateMe()
  const navigate = useNavigate()
  if (!me) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Mon compte"
        className="rounded-full transition hover:scale-105"
      >
        <Avatar name={me.username} color={me.color} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 animate-pop rounded-xl border border-border bg-card p-2 text-sm text-foreground shadow-xl"
        >
          <div className="px-2 py-1.5 font-medium">{me.username}</div>
          <div className="px-2 pb-2 text-xs text-muted-foreground">Couleur de ton curseur</div>
          <div className="grid grid-cols-5 gap-1.5 px-2 pb-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Couleur ${c}`}
                aria-pressed={me.color === c}
                onClick={() => updateMe.mutate({ color: c })}
                className="h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-foreground"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none data-[highlighted]:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
