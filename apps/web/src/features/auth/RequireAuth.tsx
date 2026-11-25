import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useMe } from './useAuth'

/** Redirige vers /login (en mémorisant la destination) si l'utilisateur n'est pas connecté. */
export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { data: me, isPending } = useMe()
  const location = useLocation()
  if (isPending) return <FullPageSpinner />
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}
