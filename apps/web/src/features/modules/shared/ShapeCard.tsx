import type { ReactNode } from 'react'
import { HTMLContainer } from 'tldraw'
import { cn } from '@/lib/utils'

/** Conteneur visuel commun aux shapes interactives (jeux, minuteur…). */
export function ShapeCard({
  children,
  className,
  accent,
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly accent?: string
}) {
  return (
    <HTMLContainer style={{ pointerEvents: 'all' }}>
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-lg',
          className,
        )}
        style={accent ? { borderTop: `4px solid ${accent}` } : undefined}
      >
        {children}
      </div>
    </HTMLContainer>
  )
}

/** Bouton utilisable dans une shape : ne déclenche pas la sélection/le déplacement du canvas. */
export function ShapeButton({
  children,
  onClick,
  className,
  disabled,
  title,
}: {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly className?: string
  readonly disabled?: boolean
  readonly title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium transition hover:brightness-95 active:scale-95 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}
