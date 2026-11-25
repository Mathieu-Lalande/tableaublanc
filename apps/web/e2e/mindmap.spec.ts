import { expect, test, type Page } from '@playwright/test'
import { createBoardViaUi, inviteViaUi, registerViaUi, uniqueName } from './fixtures'
import type { EditorWindow } from './helpers'

interface NodeInfo {
  id: string
  text: string
  parent: string
  hidden: boolean
}

function mindmapNodes(page: Page): Promise<NodeInfo[]> {
  return page.evaluate(() => {
    const ed = (window as unknown as EditorWindow).editor
    return ed
      .getCurrentPageShapes()
      .filter((s) => s.type === 'mindmap-node')
      .map((s) => {
        const props = s.props as unknown as { text: string; parentNodeId: string }
        return {
          id: s.id,
          text: props.text,
          parent: props.parentNodeId,
          hidden: ed.isShapeHidden(s),
        }
      })
  })
}

function edgeCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as EditorWindow).editor
        .getCurrentPageShapes()
        .filter((s) => s.type === 'arrow' && s.meta['mindmapEdge'] === true).length,
  )
}

test('mind map : insertion, Tab/Entrée, repli et synchronisation', async ({ browser }) => {
  const a = await registerViaUi(browser, uniqueName('mm'))
  const b = await registerViaUi(browser, uniqueName('mmb'))
  await createBoardViaUi(a, 'Idées')
  await inviteViaUi(a, b, 'EDITOR')

  await a.getByTestId('board-canvas').click({ position: { x: 600, y: 600 } })
  await a.keyboard.press('Control+k')
  await a.getByPlaceholder('Insérer un module').fill('mind map arbre')
  await a.keyboard.press('Enter')

  await expect.poll(async () => (await mindmapNodes(a)).length).toBe(4)
  await expect.poll(() => edgeCount(a)).toBe(3)

  // Racine sélectionnée → Tab crée un enfant en mode édition.
  await a.keyboard.press('Tab')
  await a.keyboard.type('Budget')
  await a.keyboard.press('Enter') // valide la saisie
  await a.keyboard.press('Tab') // enfant de « Budget »
  await a.keyboard.type('Hôtel')
  await a.keyboard.press('Enter')
  await a.keyboard.press('Enter') // frère de « Hôtel »
  await a.keyboard.type('Avion')
  await a.keyboard.press('Escape')

  await expect.poll(async () => (await mindmapNodes(a)).length).toBe(7)
  const nodes = await mindmapNodes(a)
  const budget = nodes.find((n) => n.text === 'Budget')
  expect(budget).toBeDefined()
  expect(
    nodes
      .filter((n) => n.parent === budget?.id)
      .map((n) => n.text)
      .sort(),
  ).toEqual(['Avion', 'Hôtel'])
  await expect.poll(() => edgeCount(a)).toBe(6)

  // Synchronisé chez B.
  await expect.poll(async () => (await mindmapNodes(b)).length).toBe(7)

  // Repli de « Budget » : ses enfants sont masqués (chez A et chez B).
  await a.evaluate((id) => {
    const ed = (window as unknown as EditorWindow).editor
    const shape = ed.getShape(id as never)
    if (shape)
      ed.updateShape({ id: shape.id, type: 'mindmap-node', props: { collapsed: true } } as never)
  }, budget?.id)
  await expect.poll(async () => (await mindmapNodes(b)).filter((n) => n.hidden).length).toBe(2)

  // Suppression en cascade.
  await a.evaluate((id) => {
    const ed = (window as unknown as EditorWindow).editor
    ed.deleteShapes([id as never])
  }, budget?.id)
  await expect.poll(async () => (await mindmapNodes(a)).length).toBe(4)
  await expect.poll(() => edgeCount(a)).toBe(3)
})
