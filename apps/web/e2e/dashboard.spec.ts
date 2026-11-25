import { expect, test } from '@playwright/test'
import { registerViaUi, uniqueName } from './fixtures'

test('dashboard : création, recherche, favoris, thème sombre', async ({ browser }) => {
  const page = await registerViaUi(browser, uniqueName('dash'))
  for (const name of ['Vacances Lisbonne', 'Soirée jeux']) {
    await page.getByRole('button', { name: /Nouveau board/ }).click()
    await page.getByLabel('Nom du board').fill(name)
    await page.getByRole('button', { name: 'Créer', exact: true }).click()
    await page.waitForURL(/\/b\//)
    await page.getByRole('link', { name: 'Retour aux boards' }).click()
    await expect(page.getByRole('heading', { name: 'Mes boards' })).toBeVisible()
  }
  await expect(page.getByRole('article')).toHaveCount(2)

  await page.getByLabel('Rechercher un board').fill('lisb')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByLabel('Rechercher un board').fill('')

  await page
    .getByRole('article')
    .filter({ hasText: 'Soirée jeux' })
    .getByRole('button', { name: 'Ajouter aux favoris' })
    .click()
  await page.getByRole('tab', { name: 'Favoris' }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Soirée jeux')

  await page.getByRole('button', { name: /^Thème/ }).click() // clair
  await page.getByRole('button', { name: /^Thème/ }).click() // sombre
  await expect(page.locator('html')).toHaveClass(/dark/)
})
