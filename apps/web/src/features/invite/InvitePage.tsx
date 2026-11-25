import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/ui/spinner'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { boardsApi } from '@/features/boards/boardsApi'

const ROLE_TEXT = { EDITOR: 'modifier', VIEWER: 'consulter' } as const

export function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const preview = useQuery({
    queryKey: ['invite', token],
    queryFn: () => boardsApi.previewInvite(token),
    retry: false,
  })
  const accept = useMutation({
    mutationFn: () => boardsApi.acceptInvite(token),
    onSuccess: ({ boardId }) => navigate(`/b/${boardId}`, { replace: true }),
  })

  if (preview.isPending) return <FullPageSpinner />
  if (preview.isError || !preview.data) {
    return (
      <AuthLayout title="Invitation" subtitle="Lien invalide">
        <p className="text-sm text-muted-foreground">
          Ce lien d’invitation est invalide, expiré ou déjà utilisé.
        </p>
        <Link to="/">
          <Button className="mt-4 w-full">Retour à mes boards</Button>
        </Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Tu es invité·e !" subtitle="Rejoins le board de tes potes">
      <p className="text-sm">
        Tu pourras <strong>{ROLE_TEXT[preview.data.role]}</strong> le board{' '}
        <strong>« {preview.data.boardName} »</strong>.
      </p>
      <Button className="mt-5 w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
        Rejoindre le board
      </Button>
    </AuthLayout>
  )
}
