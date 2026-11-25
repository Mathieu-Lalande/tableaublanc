import { expect, type Browser, type Page } from '@playwright/test'
import { waitForEditor } from './helpers'

export const SIGNUP_CODE = 'E2E-CODE'
export const PASSWORD = 'correct-horse-battery'

export function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
}

/** Crée un compte via l'UI (code d'invitation de test) et renvoie la page connectée. */
export async function registerViaUi(browser: Browser, username: string): Promise<Page> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`/register?code=${SIGNUP_CODE}`)
  await page.getByLabel('Pseudo').fill(username)
  await page.getByLabel('Mot de passe (10 caractères min.)').fill(PASSWORD)
  await page.getByLabel('Confirmation').fill(PASSWORD)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('heading', { name: 'Mes boards' })).toBeVisible()
  return page
}

export async function createBoardViaUi(page: Page, name: string): Promise<string> {
  await page.getByRole('button', { name: /Nouveau board/ }).click()
  await page.getByLabel('Nom du board').fill(name)
  await page.getByRole('button', { name: 'Créer', exact: true }).click()
  await page.waitForURL(/\/b\//)
  await waitForEditor(page)
  return page.url()
}

/** Le propriétaire crée un lien d'invitation, l'invité l'accepte. */
export async function inviteViaUi(
  owner: Page,
  guest: Page,
  role: 'EDITOR' | 'VIEWER',
): Promise<void> {
  await owner.getByRole('button', { name: 'Partager' }).click()
  await owner.getByLabel('Rôle invité').selectOption(role)
  await owner.getByRole('button', { name: 'Créer un lien' }).click()
  const link = (await owner.getByTestId('invite-link').textContent()) ?? ''
  await owner.keyboard.press('Escape')
  await guest.goto(new URL(link).pathname)
  await guest.getByRole('button', { name: 'Rejoindre le board' }).click()
  await guest.waitForURL(/\/b\//)
  await waitForEditor(guest)
}
