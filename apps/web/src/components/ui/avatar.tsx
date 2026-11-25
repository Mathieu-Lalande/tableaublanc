import { cn, initials } from '@/lib/utils'

export interface AvatarProps {
  readonly name: string
  readonly color: string
  readonly size?: 'sm' | 'md'
  readonly className?: string
}

export function Avatar({ name, color, size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-card',
        size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}
