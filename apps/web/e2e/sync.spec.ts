import { expect, test } from '@playwright/test'
import { shapeCount, waitForEditor, type EditorWindow } from './helpers'

test('une forme créée dans un navigateur apparaît dans l’autre, avec le curseur distant', async ({
  browser,
}) => {
  const boardUrl = `/b/e2e-${Date.now()}`
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  await Promise.all([a.goto(boardUrl), b.goto(boardUrl)])
  await Promise.all([waitForEditor(a), waitForEditor(b)])

  await a.evaluate(() => {
    ;(window as unknown as EditorWindow).editor.createShape({
      type: 'geo',
      x: 100,
      y: 100,
      props: { w: 120, h: 80 },
    })
  })
  await expect.poll(() => shapeCount(b)).toBe(1)

  // Curseur distant : A bouge sa souris, B doit afficher un curseur collaborateur.
  await a.getByTestId('board-canvas').hover({ position: { x: 300, y: 300 } })
  await a.mouse.move(320, 320, { steps: 5 })
  await expect(b.locator('.tl-cursor').first()).toBeVisible()

  await ctxA.close()
  await ctxB.close()
})
