import { expect, test } from '@playwright/test'
import { createBoardViaUi, inviteViaUi, registerViaUi, uniqueName } from './fixtures'
import { shapeCount, type EditorWindow } from './helpers'

test('deux potes sur un board : forme synchronisée et curseur distant visible', async ({
  browser,
}) => {
  const a = await registerViaUi(browser, uniqueName('alice'))
  const b = await registerViaUi(browser, uniqueName('bob'))
  await createBoardViaUi(a, 'Board e2e')
  await inviteViaUi(a, b, 'EDITOR')

  await a.evaluate(() => {
    ;(window as unknown as EditorWindow).editor.createShape({
      type: 'geo',
      x: 100,
      y: 100,
      props: { w: 120, h: 80 },
    })
  })
  await expect.poll(() => shapeCount(b)).toBe(1)

  await a.getByTestId('board-canvas').hover({ position: { x: 400, y: 300 } })
  await a.mouse.move(420, 320, { steps: 5 })
  await expect(b.locator('.tl-cursor').first()).toBeVisible()
})

test('un lecteur voit le board mais ne peut pas le modifier, et peut chatter', async ({
  browser,
}) => {
  const owner = await registerViaUi(browser, uniqueName('owner'))
  const viewer = await registerViaUi(browser, uniqueName('viewer'))
  await createBoardViaUi(owner, 'Board lecture')
  await inviteViaUi(owner, viewer, 'VIEWER')
  await expect(viewer.getByText('Lecture seule')).toBeVisible()

  // Contournement volontaire de l'UI : le serveur doit refuser l'écriture.
  await viewer.evaluate(() => {
    const ed = (window as unknown as EditorWindow).editor
    ed.updateInstanceState({ isReadonly: false })
    ed.createShape({ type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
  })
  await owner.waitForTimeout(800)
  expect(await shapeCount(owner)).toBe(0)

  await viewer.getByRole('button', { name: 'Chat' }).click()
  await viewer.getByLabel('Message').fill('coucou du lecteur')
  await viewer.getByLabel('Message').press('Enter')
  await owner.getByRole('button', { name: 'Chat' }).click()
  await expect(owner.getByTestId('chat-messages')).toContainText('coucou du lecteur')
})
