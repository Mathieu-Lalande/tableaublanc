import {
  createShapeId,
  toRichText,
  type Editor,
  type TLArrowShape,
  type TLDefaultColorStyle,
  type TLFrameShape,
  type TLGeoShape,
  type TLGeoShapeGeoStyle,
  type TLNoteShape,
  type TLShapeId,
  type TLTextShape,
  type VecLike,
} from 'tldraw'

/** Petite API de construction de modèles à partir des shapes natives de tldraw. */
export class TemplateBuilder {
  readonly ids: TLShapeId[] = []

  constructor(
    private readonly editor: Editor,
    private readonly origin: VecLike,
  ) {}

  frame(
    x: number,
    y: number,
    w: number,
    h: number,
    name: string,
    color: TLDefaultColorStyle = 'black',
  ): TLShapeId {
    const id = createShapeId()
    this.editor.createShape<TLFrameShape>({
      id,
      type: 'frame',
      x: this.origin.x + x,
      y: this.origin.y + y,
      props: { w, h, name, color },
    })
    this.ids.push(id)
    return id
  }

  note(
    x: number,
    y: number,
    text: string,
    color: TLDefaultColorStyle = 'yellow',
    parent?: TLShapeId,
  ): TLShapeId {
    const id = createShapeId()
    this.editor.createShape<TLNoteShape>({
      id,
      type: 'note',
      ...this.at(x, y, parent),
      props: { richText: toRichText(text), color, size: 's' },
    })
    if (!parent) this.ids.push(id)
    return id
  }

  geo(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    opts: {
      geo?: TLGeoShapeGeoStyle
      color?: TLDefaultColorStyle
      fill?: TLGeoShape['props']['fill']
    } = {},
    parent?: TLShapeId,
  ): TLShapeId {
    const id = createShapeId()
    this.editor.createShape<TLGeoShape>({
      id,
      type: 'geo',
      ...this.at(x, y, parent),
      props: {
        geo: opts.geo ?? 'rectangle',
        w,
        h,
        richText: toRichText(text),
        color: opts.color ?? 'black',
        fill: opts.fill ?? 'semi',
        size: 's',
      },
    })
    if (!parent) this.ids.push(id)
    return id
  }

  text(
    x: number,
    y: number,
    text: string,
    size: TLTextShape['props']['size'] = 'm',
    parent?: TLShapeId,
  ): TLShapeId {
    const id = createShapeId()
    this.editor.createShape<TLTextShape>({
      id,
      type: 'text',
      ...this.at(x, y, parent),
      props: { richText: toRichText(text), size },
    })
    if (!parent) this.ids.push(id)
    return id
  }

  /** Flèche liée à deux shapes (elle suit leurs déplacements). */
  connect(
    from: TLShapeId,
    to: TLShapeId,
    label = '',
    color: TLDefaultColorStyle = 'black',
  ): TLShapeId {
    const id = createShapeId()
    const a = this.editor.getShapePageBounds(from)
    const b = this.editor.getShapePageBounds(to)
    if (!a || !b) return id
    this.editor.createShape<TLArrowShape>({
      id,
      type: 'arrow',
      x: a.midX,
      y: a.midY,
      props: {
        start: { x: 0, y: 0 },
        end: { x: b.midX - a.midX, y: b.midY - a.midY },
        color,
        richText: toRichText(label),
        size: 's',
      },
    })
    const props = {
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: false,
      snap: 'none' as const,
    }
    this.editor.createBindings([
      { type: 'arrow', fromId: id, toId: from, props: { terminal: 'start', ...props } },
      { type: 'arrow', fromId: id, toId: to, props: { terminal: 'end', ...props } },
    ])
    this.ids.push(id)
    return id
  }

  private at(x: number, y: number, parent?: TLShapeId) {
    // Un enfant de frame est positionné relativement à la frame.
    return parent ? { x, y, parentId: parent } : { x: this.origin.x + x, y: this.origin.y + y }
  }
}

/** Construit un modèle centré dans la vue, en une seule entrée d'historique, puis le sélectionne. */
export function insertTemplate(
  editor: Editor,
  size: { w: number; h: number },
  build: (b: TemplateBuilder) => void,
): void {
  const c = editor.getViewportPageBounds().center
  const builder = new TemplateBuilder(editor, { x: c.x - size.w / 2, y: c.y - size.h / 2 })
  editor.markHistoryStoppingPoint('insert template')
  editor.run(() => build(builder))
  editor.select(...builder.ids)
  editor.zoomToSelection({ animation: { duration: 400 } })
}
