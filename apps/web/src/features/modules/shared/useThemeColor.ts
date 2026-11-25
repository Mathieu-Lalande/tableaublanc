import { getColorValue, useEditor, useValue, type TLDefaultColorStyle } from 'tldraw'

export interface ThemeColor {
  readonly solid: string
  readonly semi: string
  readonly text: string
  readonly background: string
}

/** Couleurs résolues du thème tldraw courant (clair/sombre) pour une couleur nommée. */
export function useThemeColor(color: TLDefaultColorStyle): ThemeColor {
  const editor = useEditor()
  return useValue(
    'canvas-theme-color',
    () => {
      const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
      return {
        solid: getColorValue(colors, color, 'solid'),
        semi: getColorValue(colors, color, 'semi'),
        text: getColorValue(colors, 'black', 'solid'),
        background: getColorValue(colors, 'white', 'solid'),
      }
    },
    [editor, color],
  )
}
