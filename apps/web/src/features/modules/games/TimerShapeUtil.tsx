import { useEffect, useRef } from 'react'
import { BaseBoxShapeUtil, useEditor, type TLShape } from 'tldraw'
import { gameMigrations, TIMER_TYPE, timerProps } from '@canvas/shared'
import { serverNow } from '@/features/modules/shared/serverClock'
import { ShapeButton, ShapeCard } from '@/features/modules/shared/ShapeCard'
import { useServerNow } from '@/features/modules/shared/useTick'
import { cn } from '@/lib/utils'

type TimerShape = TLShape<typeof TIMER_TYPE>

const PRESETS_MIN = [1, 3, 5, 10, 25] as const

export function remainingMs(props: TimerShape['props'], now: number): number {
  return props.running ? Math.max(0, props.endsAt - now) : props.remainingMs
}

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function beep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // audio indisponible : alerte visuelle uniquement
  }
}

/** Minuteur partagé : l'heure de fin est en heure serveur, identique pour tous. */
export class TimerShapeUtil extends BaseBoxShapeUtil<TimerShape> {
  static override type = TIMER_TYPE
  static override props = timerProps
  static override migrations = gameMigrations

  override getDefaultProps(): TimerShape['props'] {
    return {
      w: 280,
      h: 230,
      label: 'Minuteur',
      durationMs: 5 * 60_000,
      endsAt: 0,
      remainingMs: 5 * 60_000,
      running: false,
    }
  }
  override canResize = () => false
  override hideResizeHandles = () => true

  override getIndicatorPath(shape: TimerShape): Path2D {
    const p = new Path2D()
    p.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return p
  }

  override component(shape: TimerShape) {
    return <TimerView shape={shape} />
  }
}

function TimerView({ shape }: { readonly shape: TimerShape }) {
  const editor = useEditor()
  const now = useServerNow(shape.props.running)
  const left = remainingMs(shape.props, now)
  const done = shape.props.running && left === 0
  const progress = 1 - left / shape.props.durationMs
  const rang = useRef(false)

  useEffect(() => {
    if (done && !rang.current) {
      rang.current = true
      beep()
    }
    if (!done) rang.current = false
  }, [done])

  const update = (props: Partial<TimerShape['props']>) =>
    editor.updateShape<TimerShape>({ id: shape.id, type: TIMER_TYPE, props })
  const start = () =>
    update({ running: true, endsAt: serverNow() + (left > 0 ? left : shape.props.durationMs) })
  const pause = () => update({ running: false, remainingMs: left })
  const reset = (durationMs = shape.props.durationMs) =>
    update({ running: false, durationMs, remainingMs: durationMs, endsAt: 0 })

  return (
    <ShapeCard className={cn('items-center gap-3 p-4', done && 'canvas-timer-done')}>
      <div className="text-sm font-medium text-muted-foreground">⏱️ {shape.props.label}</div>
      <div className="relative w-full">
        <div className="text-center font-mono text-5xl font-bold tabular-nums" aria-live="polite">
          {done ? '⏰' : formatDuration(left)}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {shape.props.running && !done ? (
          <ShapeButton onClick={pause} title="Pause">
            ⏸ Pause
          </ShapeButton>
        ) : (
          <ShapeButton
            onClick={done ? () => reset() : start}
            title="Démarrer"
            className="bg-primary text-primary-foreground"
          >
            {done ? '↺ Recommencer' : '▶ Go'}
          </ShapeButton>
        )}
        <ShapeButton onClick={() => reset()} title="Réinitialiser">
          ↺
        </ShapeButton>
      </div>
      <div className="flex gap-1">
        {PRESETS_MIN.map((m) => (
          <ShapeButton
            key={m}
            onClick={() => reset(m * 60_000)}
            className="px-2 py-1 text-xs"
            title={`${m} minutes`}
          >
            {m}′
          </ShapeButton>
        ))}
      </div>
    </ShapeCard>
  )
}
