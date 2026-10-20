import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Choice = { id: string; text: string; why: string }
type Q = { id: string; prompt: string; answer: string; choices: Choice[] }

const QUESTIONS: Q[] = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'content', 'questions', 'hakumura.json'), 'utf8'),
)

/**
 * Choices are shuffled in the UI, so tests resolve the right answer from the
 * content file by the prompt on screen rather than by position.
 */
function correctTextFor(prompt: string): string {
  const q = QUESTIONS.find((x) => x.prompt.trim() === prompt.trim())
  if (!q) throw new Error(`No question in content matches prompt: ${prompt}`)
  const choice = q.choices.find((c) => c.id === q.answer)
  if (!choice) throw new Error(`Question ${q.id} has no choice matching its answer`)
  return choice.text
}

function wrongTextFor(prompt: string): string {
  const q = QUESTIONS.find((x) => x.prompt.trim() === prompt.trim())
  if (!q) throw new Error(`No question in content matches prompt: ${prompt}`)
  const choice = q.choices.find((c) => c.id !== q.answer)
  if (!choice) throw new Error(`Question ${q.id} has no incorrect choice`)
  return choice.text
}

/** Click the correct choice for whatever question is on screen. */
async function answerCorrectly(page: Page) {
  const prompt = (await page.locator('.question-prompt').textContent())!
  await page.locator('.choice', { hasText: correctTextFor(prompt) }).first().click()
}

/** Click a deliberately incorrect choice. */
async function answerWrongly(page: Page) {
  const prompt = (await page.locator('.question-prompt').textContent())!
  await page.locator('.choice', { hasText: wrongTextFor(prompt) }).first().click()
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

async function startSession(page: Page) {
  await enterGame(page)
  await page.getByRole('button', { name: "Today's training" }).click()
  await expect(page.locator('.question-prompt')).toBeVisible()
}

test.describe('battle', () => {
  test('starts a session and asks a real question', async ({ page }, testInfo) => {
    await startSession(page)
    await expect(page.locator('.question-prompt')).not.toBeEmpty()
    await expect(page.locator('.choice')).not.toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath(`battle-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('always explains the answer, right or wrong', async ({ page }, testInfo) => {
    await startSession(page)
    await answerCorrectly(page)

    // The explanation dialog is shown regardless of the verdict.
    await expect(page.locator('.dialog-speaker')).toHaveText('Why')
    await expect(page.locator('.visually-hidden').first()).not.toBeEmpty()

    // Every choice is reviewed, including the ones not picked.
    await expect(page.locator('.choice-review')).not.toHaveCount(0)
    await expect(page.locator('.choice-right')).toHaveCount(1)

    await page.screenshot({
      path: testInfo.outputPath(`battle-feedback-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('a correct answer damages the foe', async ({ page }) => {
    await startSession(page)
    const foeMeter = page.getByRole('progressbar', { name: 'Foe' })
    const before = Number(await foeMeter.getAttribute('aria-valuenow'))

    await answerCorrectly(page)
    await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

    const after = Number(await foeMeter.getAttribute('aria-valuenow'))
    expect(after).toBeLessThan(before)
  })

  test('a wrong answer costs the player health', async ({ page }) => {
    await startSession(page)
    const playerMeter = page.getByRole('progressbar', { name: 'Warden' })
    const before = Number(await playerMeter.getAttribute('aria-valuenow'))

    await answerWrongly(page)
    await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible()

    const after = Number(await playerMeter.getAttribute('aria-valuenow'))
    expect(after).toBeLessThan(before)
  })

  test('a session can be played to a result', async ({ page }, testInfo) => {
    await startSession(page)

    for (let i = 0; i < 40; i++) {
      const finished = await page.locator('.screen-centred').count()
      if (finished > 0) break
      if ((await page.locator('.choice').count()) > 0) await answerCorrectly(page)
      const cont = page.getByRole('button', { name: 'Continue' })
      if (await cont.isVisible().catch(() => false)) await cont.click()
    }

    await expect(page.getByRole('heading', { name: /Sakeme closes|You withdraw/ })).toBeVisible()
    await expect(page.getByText(/XP/)).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`battle-result-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('progress from a battle is persisted and shows on the dashboard', async ({ page }) => {
    await startSession(page)
    await answerCorrectly(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(600)

    await page.reload()
    await page.getByRole('button', { name: 'Progress' }).click()

    // At least one objective has now been touched.
    await expect(page.getByText(/0 of 28 objectives/)).toHaveCount(0)
  })

  /**
   * The brief: "missed concepts return as flashcards / wild encounters".
   *
   * The battle's own re-queue only fires when the question queue runs out
   * before the encounter resolves, which is not the common case. The
   * mechanism that actually delivers the promise is the scheduler: a missed
   * card is due the same day, so it leads the next session. That is what
   * this test exercises, end to end and through a reload.
   */
  test('a missed question leads the next session', async ({ page }) => {
    await startSession(page)
    const missed = (await page.locator('.question-prompt').textContent())!.trim()
    expect(missed.length).toBeGreaterThan(0)

    // Get it wrong deliberately.
    await answerWrongly(page)
    await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Play the encounter out, answering correctly from here.
    for (let i = 0; i < 40; i++) {
      if ((await page.locator('.screen-centred').count()) > 0) break
      if ((await page.locator('.choice').count()) > 0) await answerCorrectly(page)
      const cont = page.getByRole('button', { name: 'Continue' })
      if (await cont.isVisible().catch(() => false)) await cont.click()
    }
    await expect(page.getByRole('heading', { name: /Sakeme closes|You withdraw/ })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(600)

    // A fresh session, after a reload, must lead with the missed concept.
    await page.reload()
    await page.getByRole('button', { name: "Today's training" }).click()
    await expect(page.locator('.question-prompt')).toBeVisible()
    expect((await page.locator('.question-prompt').textContent())!.trim()).toBe(missed)
  })

  test('a question answered correctly does not lead the next session', async ({ page }) => {
    await startSession(page)
    const firstPrompt = (await page.locator('.question-prompt').textContent())!.trim()

    await answerCorrectly(page)
    await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    for (let i = 0; i < 40; i++) {
      if ((await page.locator('.screen-centred').count()) > 0) break
      if ((await page.locator('.choice').count()) > 0) await answerCorrectly(page)
      const cont = page.getByRole('button', { name: 'Continue' })
      if (await cont.isVisible().catch(() => false)) await cont.click()
    }
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(600)

    await page.reload()
    await page.getByRole('button', { name: "Today's training" }).click()
    const next = await page.locator('.question-prompt').textContent().catch(() => null)
    if (next) expect(next.trim()).not.toBe(firstPrompt)
  })

  test('the correct answer is not always the first choice on screen', async ({ page }) => {
    await startSession(page)

    const positions: number[] = []
    for (let i = 0; i < 12; i++) {
      if ((await page.locator('.screen-centred').count()) > 0) break
      const prompt = await page.locator('.question-prompt').textContent().catch(() => null)
      if (prompt) {
        const texts = await page.locator('.choice').allTextContents()
        positions.push(texts.findIndex((t) => t.trim() === correctTextFor(prompt).trim()))
      }
      if ((await page.locator('.choice').count()) > 0) await answerCorrectly(page)
      const cont = page.getByRole('button', { name: 'Continue' })
      if (await cont.isVisible().catch(() => false)) await cont.click()
    }

    expect(positions.length).toBeGreaterThan(1)
    expect(positions.every((p) => p >= 0)).toBe(true)
    // Authored content puts the answer first; the UI must not.
    expect(positions.every((p) => p === 0)).toBe(false)
  })

  test('no horizontal overflow during a battle', async ({ page }) => {
    await startSession(page)
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
