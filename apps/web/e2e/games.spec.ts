import { expect, test, type Page } from '@playwright/test'
import { createBoardViaUi, inviteViaUi, registerViaUi, uniqueName } from './fixtures'

async function insert(page: Page, label: string): Promise<void> {
  await page.getByTestId('board-canvas').click({ position: { x: 640, y: 680 } })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Insérer un module').fill(label)
  await page.keyboard.press('Enter')
}

test('morpion : deux joueurs, tours respectés, victoire', async ({ browser }) => {
  const a = await registerViaUi(browser, uniqueName('tx'))
  const b = await registerViaUi(browser, uniqueName('to'))
  await createBoardViaUi(a, 'Morpion')
  await inviteViaUi(a, b, 'EDITOR')
  await insert(a, 'Morpion')

  await a.getByRole('button', { name: 'Jouer X' }).click()
  await b.getByRole('button', { name: 'Jouer O' }).click()
  await expect(a.getByText('👉 À toi de jouer !')).toBeVisible()

  const cell = (p: Page, n: number) =>
    p.getByRole('gridcell', { name: new RegExp(`^Case ${n}( |$)`) })
  // B ne peut pas jouer pendant le tour de A.
  await expect(cell(b, 1)).toBeDisabled()
  for (const [p, n] of [
    [a, 1],
    [b, 4],
    [a, 2],
    [b, 5],
    [a, 3],
  ] as const) {
    await cell(p, n).click()
    await expect(cell(p === a ? b : a, n)).toHaveAccessibleName(/: [XO]$/)
  }
  await expect(b.getByText(/gagne/)).toBeVisible()
})

test('pictionary : seul le dessinateur voit le mot, un autre le devine', async ({ browser }) => {
  const a = await registerViaUi(browser, uniqueName('pd'))
  const b = await registerViaUi(browser, uniqueName('pg'))
  await createBoardViaUi(a, 'Pictionary')
  await inviteViaUi(a, b, 'EDITOR')
  await insert(a, 'Pictionary')

  await a.getByRole('button', { name: 'Je dessine' }).click()
  const wordEl = a.getByTestId('pictionary-word')
  await expect(wordEl).not.toHaveText('…')
  const word = (await wordEl.textContent()) ?? ''

  await expect(b.getByLabel('Indice')).toBeVisible()
  await expect(b.getByTestId('pictionary-word')).toHaveCount(0)
  expect(await b.content()).not.toContain(`>${word}<`)

  await b.getByLabel('Proposition').fill(word)
  await b.getByRole('button', { name: 'Deviner' }).click()
  await expect(a.getByText(/a trouvé/).first()).toBeVisible()
  await expect(b.getByText(/a trouvé/).first()).toBeVisible()
})
