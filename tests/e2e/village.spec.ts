import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, 'content', p), 'utf8'))

type Choice = { id: string; text: string }
type Q = { id: string; prompt: string; answer: string; choices: Choice[] }
const QUESTIONS: Q[] = read('questions/hakumura.json')
const ZONE = read('zones/hakumura.json')[0]

function correctTextFor(prompt: string): string {
  const q = QUESTIONS.find((x) => x.prompt.trim() === prompt.trim())
  if (!q) throw new Error(`No question matches prompt: ${prompt}`)
  return q.choices.find((c) => c.id === q.answer)!.text
}

async function enterGame(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('menu', { name: 'Main menu' })).toBeVisible()
  await page.getByRole('menuitem', { name: /Begin your training/ }).click()
  const dialog = page.getByRole('button', { name: /Continue|Reveal the rest/ })
  for (let i = 0; i < 4; i++) await dialog.click()
  await page.getByRole('button', { name: 'I take the vows' }).click()
  await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible()
}

async function openVillage(page: Page) {
  await enterGame(page)
  await page.getByRole('menuitem', { name: /Hakumura/ }).click()
  await expect(page.getByRole('heading', { name: 'Hakumura', level: 1 })).toBeVisible()
}

/** Play the lesson currently open to its end. */
async function playLesson(page: Page) {
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole('heading', { name: 'You can now' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Continue' }).click()
      return
    }
    const choices = page.locator('.choice')
    if ((await choices.count()) > 0) {
      const prompt = (await page.locator('.question-prompt').textContent())!
      await page.locator('.choice', { hasText: correctTextFor(prompt) }).first().click()
      continue
    }
    const dialog = page.getByRole('button', { name: /Continue|Reveal the rest/ })
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.click()
      continue
    }
    const cont = page.getByRole('button', { name: 'Continue' })
    if (await cont.isVisible().catch(() => false)) await cont.click()
  }
  throw new Error('Lesson did not finish within 60 steps')
}

test.describe('Hakumura', () => {
  test('the village lists the whole path in order', async ({ page }, testInfo) => {
    await openVillage(page)
    await expect(page.getByRole('menuitem')).toHaveCount(ZONE.nodes.length)
    await page.screenshot({
      path: testInfo.outputPath(`village-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('only the first node is unlocked at the start', async ({ page }) => {
    await openVillage(page)
    const items = page.getByRole('menuitem')
    await expect(items.nth(0)).toBeEnabled()
    await expect(items.nth(1)).toBeDisabled()
    await expect(items.nth(ZONE.nodes.length - 1)).toBeDisabled()
  })

  test('a lesson plays through and unlocks the next node', async ({ page }, testInfo) => {
    await openVillage(page)
    await page.getByRole('menuitem').nth(0).click()
    await expect(page.locator('.lesson-progress')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`lesson-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await playLesson(page)
    await expect(page.getByRole('heading', { name: 'Hakumura', level: 1 })).toBeVisible()
    await expect(page.getByRole('menuitem').nth(0)).toContainText('Complete')
    await expect(page.getByRole('menuitem').nth(1)).toBeEnabled()
  })

  test('the terminal lab runs real commands and gates completion on its goals', async ({
    page,
  }, testInfo) => {
    await openVillage(page)
    // Clear the two lessons ahead of the first lab.
    for (const i of [0, 1]) {
      await page.getByRole('menuitem').nth(i).click()
      await playLesson(page)
    }

    await page.getByRole('menuitem').nth(2).click()
    await expect(page.getByRole('heading', { name: 'The Gatehouse Ledger' })).toBeVisible()

    const finish = page.getByRole('button', { name: 'Report the finding' })
    await expect(finish).toBeDisabled()

    const type = async (cmd: string) => {
      await page.getByLabel('Terminal command').fill(cmd)
      await page.getByRole('button', { name: 'Run' }).click()
    }

    await type('ls -l /srv/gatehouse')
    await expect(page.locator('.terminal')).toContainText('shared')

    await type('cat /etc/shadow')
    await expect(page.locator('.terminal')).toContainText('Permission denied')

    await type('find /srv -perm')
    await type('cat /srv/gatehouse/shared/gate-svc.conf')
    await expect(page.locator('.terminal')).toContainText('REDACTED-IN-SIMULATION')

    await page.screenshot({
      path: testInfo.outputPath(`terminal-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await expect(finish).toBeEnabled()
    await finish.click()
    await expect(page.getByRole('heading', { name: 'Debrief' })).toBeVisible()
  })

  test('the simulated scanner refuses targets outside the simulation', async ({ page }) => {
    await openVillage(page)
    for (const i of [0, 1]) {
      await page.getByRole('menuitem').nth(i).click()
      await playLesson(page)
    }
    await page.getByRole('menuitem').nth(2).click()

    await page.getByLabel('Terminal command').fill('nmap 8.8.8.8')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.locator('.terminal')).toContainText('not part of the simulation')
  })

  test('the whole village can be completed end to end', async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    await openVillage(page)

    for (let node = 0; node < ZONE.nodes.length; node++) {
      const item = page.getByRole('menuitem').nth(node)
      await expect(item).toBeEnabled()
      await item.click()

      const kind = ZONE.nodes[node].type
      if (kind === 'lesson') {
        await playLesson(page)
      } else if (kind === 'lab') {
        const ref = ZONE.nodes[node].ref
        if (ref === 'lab-gatehouse-ledger') {
          for (const cmd of [
            'ls -l /srv/gatehouse',
            'find /srv -perm',
            'cat /srv/gatehouse/shared/gate-svc.conf',
          ]) {
            await page.getByLabel('Terminal command').fill(cmd)
            await page.getByRole('button', { name: 'Run' }).click()
          }
          await page.getByRole('button', { name: 'Report the finding' }).click()
        } else if (ref === 'lab-gatehouse-post') {
          const emails = read('labs/hakumura-phishing.json')[0].emails
          for (const email of emails) {
            const label = email.verdict === 'phish' ? 'Report as phishing' : 'Mark legitimate'
            await page.getByRole('button', { name: label }).click()
            const next = page.getByRole('button', { name: 'Next message' })
            if (await next.isVisible().catch(() => false)) await next.click()
          }
          await page.getByRole('button', { name: 'File the triage report' }).click()
        } else {
          const rows = read('labs/hakumura-logs.json')[0].rows.filter((r: { malicious: boolean }) => r.malicious)
          for (const row of rows) {
            await page.locator(`input[type="checkbox"]`).nth(
              read('labs/hakumura-logs.json')[0].rows.findIndex((r: { id: string }) => r.id === row.id),
            ).check()
          }
          await page.getByRole('button', { name: 'Submit findings' }).click()
        }
        await expect(page.getByRole('heading', { name: 'Debrief' })).toBeVisible()
        await page.getByRole('button', { name: 'Continue' }).click()
      } else {
        // Boss fight.
        for (let i = 0; i < 60; i++) {
          if (await page.locator('.screen-centred').count()) break
          if ((await page.locator('.choice').count()) > 0) {
            const prompt = (await page.locator('.question-prompt').textContent())!
            await page.locator('.choice', { hasText: correctTextFor(prompt) }).first().click()
          }
          const cont = page.getByRole('button', { name: 'Continue' })
          if (await cont.isVisible().catch(() => false)) await cont.click()
        }
        await expect(page.getByRole('heading', { name: /Sakeme closes/ })).toBeVisible()
        await page.getByRole('button', { name: 'Continue' }).click()
      }

      await expect(page.getByRole('heading', { name: 'Hakumura', level: 1 })).toBeVisible()
    }

    await expect(page.getByRole('heading', { name: 'Hakumura stands' })).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`village-complete-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('completing the village moves the dashboard off zero', async ({ page }) => {
    await openVillage(page)
    await page.getByRole('menuitem').nth(0).click()
    await playLesson(page)
    await page.waitForTimeout(600)

    await page.getByRole('button', { name: 'Leave' }).click()
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('button', { name: 'Progress' }).click()
    await expect(page.getByText(/0 of 28 objectives/)).toHaveCount(0)
  })
})
