import type { Page } from '@playwright/test'
import type { Editor } from 'tldraw'

export type EditorWindow = Window & { editor: Editor }

export async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => 'editor' in window, null, { timeout: 30_000 })
}

export function shapeCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as EditorWindow).editor.getCurrentPageShapes().length,
  )
}
