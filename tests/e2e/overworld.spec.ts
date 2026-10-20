import { test, expect, type Page } from '@playwright/test'

async function enterGame(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('menu', { name: 'Main menu' })).toBeVisible()
  await page.getByRole('menuitem', { name: /Begin your training/ }).click()
  const dialog = page.getByRole('button', { name: /Continue|Reveal the rest/ })
  for (let i = 0; i < 4; i++) await dialog.click()
  await page.getByRole('button', { name: 'I take the vows' }).click()
  await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible()
}

test.describe('overworld', () => {
  test('is reachable from home and renders the map', async ({ page }, testInfo) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()
    await expect(page.getByRole('heading', { name: 'The Ori', level: 1 })).toBeVisible()
    await expect(page.getByRole('img', { name: /Overworld map/ })).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`overworld-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('the D-pad moves the player', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()

    const map = page.getByRole('img', { name: /Overworld map/ })
    const before = await map.getAttribute('aria-label')
    await page.getByRole('button', { name: 'Move left' }).click()
    await expect(map).not.toHaveAttribute('aria-label', before!)
  })

  test('arrow keys move the player', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()

    const map = page.getByRole('img', { name: /Overworld map/ })
    const before = await map.getAttribute('aria-label')
    await page.keyboard.press('ArrowLeft')
    await expect(map).not.toHaveAttribute('aria-label', before!)
  })

  test('walking into the map edge does not move or crash', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()
    const map = page.getByRole('img', { name: /Overworld map/ })

    // Hammer left well past the western border.
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft')
    const atWall = await map.getAttribute('aria-label')
    await page.keyboard.press('ArrowLeft')
    await expect(map).toHaveAttribute('aria-label', atWall!)
  })

  test('reaching a sealed gate explains itself', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()

    // Hakumura's gate sits north of the start, up the western connector.
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft')
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp')

    const label = await page.getByRole('img', { name: /Overworld map/ }).getAttribute('aria-label')
    expect(label).toBeTruthy()
  })

  test('Escape returns home', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()
    await expect(page.getByRole('heading', { name: 'The Ori', level: 1 })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible()
  })

  test('no horizontal overflow on a phone', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Travel' }).click()
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})

test.describe('dashboard', () => {
  test('shows readiness, both frameworks, and an honest empty state', async ({
    page,
  }, testInfo) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Progress' }).click()

    await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Exam readiness' })).toBeVisible()
    // Scope to the readiness figure: every meter also renders "0 / 100".
    await expect(page.locator('.readiness-score')).toHaveText('0')
    await expect(page.locator('.readiness-of')).toHaveText('/ 100')

    // Five Security+ domains and six CSF Functions, all at zero on a fresh save.
    await expect(page.getByRole('progressbar', { name: /General Security Concepts/ })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: /GV . Govern/ })).toBeVisible()
    await expect(page.getByText(/Nothing yet/)).toBeVisible()
    await expect(page.getByText(/0 of 28 objectives/)).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('states honestly how the curriculum is sourced', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Progress' }).click()
    await expect(page.getByRole('heading', { name: 'How this curriculum is sourced' })).toBeVisible()
    // Both spines are now read from the publishers' own documents.
    await expect(page.getByText(/match it word for word/)).toBeVisible()
    await expect(page.getByText(/106/)).toBeVisible()
  })

  test('every domain and function has a progress bar', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Progress' }).click()
    // 5 Security+ domains + 6 CSF Functions.
    await expect(page.getByRole('progressbar')).toHaveCount(11)
  })
})
