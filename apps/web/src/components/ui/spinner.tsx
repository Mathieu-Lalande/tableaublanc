import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { readonly className?: string }) {
  return (
    <Loader2
      className={cn('h-5 w-5 animate-spin text-muted-foreground', className)}
      aria-label="Chargement"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="grid h-full place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
