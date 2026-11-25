import { useEffect, useRef } from 'react'
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  stopEventPropagation,
  useEditor,
  useIsEditing,
  useValue,
} from 'tldraw'
import { MINDMAP_NODE_TYPE, mindmapNodeMigrations, mindmapNodeProps } from '@canvas/shared'
import { useThemeColor } from '@/features/modules/shared/useThemeColor'
import {
  isRoot,
  NODE_FONT,
  NODE_BORDER,
  NODE_FONT_FAMILY,
  NODE_LINE_HEIGHT,
  NODE_PADDING,
  ROOT_FONT,
  type MindmapShape,
} from './mindmapModel'
import { relayout, setNodeText, toggleCollapse } from './mindmapOps'

/** Nœud de mind map : pastille de texte éditable, couleur de branche, repli/dépli. */
export class MindmapNodeShapeUtil extends BaseBoxShapeUtil<MindmapShape> {
  static override type = MINDMAP_NODE_TYPE
  static override props = mindmapNodeProps
  static override migrations = mindmapNodeMigrations

  override getDefaultProps(): MindmapShape['props'] {
    return {
      w: 140,
      h: 44,
      text: '',
      color: 'blue',
      mapId: '',
      parentNodeId: '',
      side: 'right',
      order: 0,
      collapsed: false,
      layout: 'tree',
    }
  }

  override canEdit = () => true
  override canResize = () => false
  override hideResizeHandles = () => true
  override hideRotateHandle = () => true
  override isAspectRatioLocked = () => true

  override getIndicatorPath(shape: MindmapShape): Path2D {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, isRoot(shape) ? 16 : shape.props.h / 2)
    return path
  }

  override component(shape: MindmapShape) {
    return <MindmapNodeView shape={shape} />
  }

  /** Après un déplacement manuel : la racine entraîne la carte, un enfant reprend sa place. */
  override onTranslateEnd(_initial: MindmapShape, current: MindmapShape): undefined {
    const mapId = current.props.mapId
    queueMicrotask(() => relayout(this.editor, mapId))
  }

  override onDoubleClick(shape: MindmapShape): void {
    this.editor.setEditingShape(shape.id)
  }
}

function MindmapNodeView({ shape }: { readonly shape: MindmapShape }) {
  const editor = useEditor()
  const isEditing = useIsEditing(shape.id)
  const root = isRoot(shape)
  const color = useThemeColor(shape.props.color)
  const font = root ? ROOT_FONT : NODE_FONT
  const childCount = useValue(
    'mindmap-child-count',
    () =>
      editor
        .getCurrentPageShapes()
        .filter(
          (s) =>
            s.type === MINDMAP_NODE_TYPE && (s as MindmapShape).props.parentNodeId === shape.id,
        ).length,
    [editor, shape.id],
  )
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isEditing) return
    const el = inputRef.current
    el?.focus()
    el?.select()
  }, [isEditing])

  return (
    <HTMLContainer
      style={{ pointerEvents: isEditing ? 'all' : undefined }}
      className="canvas-mindmap-node"
    >
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          borderRadius: root ? 16 : shape.props.h / 2,
          background: root ? color.solid : color.background,
          color: root ? color.background : color.text,
          border: `${NODE_BORDER}px solid ${color.solid}`,
          boxShadow: root ? `0 6px 20px -6px ${color.solid}` : '0 2px 8px -4px rgba(0,0,0,.25)',
          padding: `${NODE_PADDING.y}px ${NODE_PADDING.x}px`,
          fontFamily: NODE_FONT_FAMILY,
          fontSize: font.size,
          fontWeight: font.weight,
          lineHeight: NODE_LINE_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          boxSizing: 'border-box',
        }}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            aria-label="Texte du nœud"
            value={shape.props.text}
            onChange={(e) => setNodeText(editor, shape.id, e.target.value)}
            onBlur={() => relayout(editor, shape.props.mapId)}
            onPointerDown={stopEventPropagation}
            rows={1}
            maxLength={500}
            style={{
              all: 'unset',
              width: '100%',
              height: '100%',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              resize: 'none',
            }}
          />
        ) : (
          <span style={{ opacity: shape.props.text ? 1 : 0.45 }}>
            {shape.props.text || 'Nouvelle idée'}
          </span>
        )}
      </div>
      {childCount > 0 && (
        <button
          type="button"
          aria-label={shape.props.collapsed ? `Déplier (${childCount})` : 'Replier'}
          title={shape.props.collapsed ? `Déplier (${childCount})` : 'Replier'}
          onPointerDown={stopEventPropagation}
          onClick={(e) => {
            stopEventPropagation(e)
            toggleCollapse(editor, shape.id)
          }}
          style={{
            position: 'absolute',
            top: shape.props.h / 2 - 11,
            [shape.props.side === 'left' && !root ? 'left' : 'right']: -12,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: color.background,
            border: `2px solid ${color.solid}`,
            color: color.solid,
            fontSize: 11,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'all',
            cursor: 'pointer',
          }}
        >
          {shape.props.collapsed ? childCount : '−'}
        </button>
      )}
    </HTMLContainer>
  )
}
