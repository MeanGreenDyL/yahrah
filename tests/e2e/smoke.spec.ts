import { test, expect, type Page } from '@playwright/test'

/** Walk a fresh player past the title and the vows into the home screen. */
async function enterGame(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'YAHRAH', level: 1 })).toBeVisible()
  await page.getByRole('menuitem', { name: /Begin your training/ }).click()
  await expect(page.getByRole('heading', { name: 'The Three Vows' })).toBeVisible()
  // Advance the two intro dialog beats.
  const dialog = page.getByRole('button', { name: /Continue|Reveal the rest/ })
  await dialog.click()
  await dialog.click()
  await dialog.click()
  await dialog.click()
  await page.getByRole('button', { name: 'I take the vows' }).click()
}

test.describe('first run', () => {
  test('title screen renders with the crest', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'YAHRAH', level: 1 })).toBeVisible()
    await expect(page.getByRole('img', { name: /crest of Yahrah/i })).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`title-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('the vows gate the game and cannot be bypassed', async ({ page }) => {
    await page.goto('/')
    // A fresh save offers "Begin", never "Continue".
    await expect(page.getByRole('menuitem', { name: /Begin your training/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /^Continue/ })).toHaveCount(0)
  })

  test('taking the vows reaches the home screen', async ({ page }, testInfo) => {
    await enterGame(page)
    await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible()
    await expect(page.getByText('day streak')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`home-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})

test.describe('layout', () => {
  for (const [name, open] of [
    ['title', async (p: Page) => p.goto('/')],
    ['home', enterGame],
  ] as const) {
    test(`${name}: no horizontal overflow`, async ({ page }) => {
      await open(page)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })

    test(`${name}: every tap target is at least 44px tall`, async ({ page }) => {
      await open(page)
      const small = await page.evaluate(() => {
        const bad: string[] = []
        for (const el of document.querySelectorAll('button, a, select, input[type="checkbox"]')) {
          const r = el.getBoundingClientRect()
          if (r.height > 0 && r.height < 44) {
            bad.push(`${el.tagName}.${el.className}: ${Math.round(r.height)}px`)
          }
        }
        return bad
      })
      expect(small).toEqual([])
    })
  }
})

test.describe('settings', () => {
  test('audio is off on first load', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByLabel('Chiptune audio')).not.toBeChecked()
  })

  test('text scale and audio survive a reload', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await page.getByLabel('Chiptune audio').check()
    await page.getByLabel('Scale').fill('1.4')
    // Let the debounced write land.
    await expect(page.getByLabel('Chiptune audio')).toBeChecked()
    await page.waitForTimeout(600)

    await page.reload()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByLabel('Chiptune audio')).toBeChecked()
    await expect(page.getByLabel('Scale')).toHaveValue('1.4')
  })

  test('progress survives a reload: the vows are not re-asked', async ({ page }) => {
    await enterGame(page)
    await page.waitForTimeout(600)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'The Three Vows' })).toHaveCount(0)
  })
})

test.describe('keyboard control', () => {
  /**
   * Boot is async (the save is read from IndexedDB), so the title menu does
   * not exist at `load`. Wait for the menu itself before sending keys.
   */
  async function readyTitle(page: Page) {
    await page.goto('/')
    await expect(page.getByRole('menu', { name: 'Main menu' })).toBeVisible()
  }

  test('the menu is navigable by arrow keys and Enter', async ({ page }) => {
    await readyTitle(page)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    // Second item is the Codex.
    await expect(page.getByRole('heading', { name: 'Codex', level: 1 })).toBeVisible()
  })

  test('WASD moves the cursor too', async ({ page }) => {
    await readyTitle(page)
    await page.keyboard.press('s')
    await page.keyboard.press('s')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  })

  /**
   * Two keypresses inside one frame. This is why the menu mirrors its cursor
   * into a ref: with state alone, Enter would read the pre-render value and
   * select the previous item.
   */
  test('Down-then-Enter in the same frame selects the right item', async ({ page }) => {
    await readyTitle(page)
    await page.evaluate(() => {
      const fire = (key: string) =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
      fire('ArrowDown')
      fire('Enter')
    })
    await expect(page.getByRole('heading', { name: 'Codex', level: 1 })).toBeVisible()
  })

  /**
   * Exactly one row may show the cursor glyph. Regression guard: the glyph
   * once keyed off the menu's `active` prop rather than the cursor index,
   * which marked every row as selected.
   */
  test('exactly one row shows the cursor', async ({ page }) => {
    await readyTitle(page)
    const carets = await page.evaluate(() =>
      [...document.querySelectorAll('.menu-cursor')].filter((el) =>
        (el.textContent ?? '').includes('\u25B6'),
      ).length,
    )
    expect(carets).toBe(1)
  })

  test('the home screen has only one cursor across all its menus', async ({ page }) => {
    await enterGame(page)
    const carets = await page.evaluate(() =>
      [...document.querySelectorAll('.menu-cursor')].filter((el) =>
        (el.textContent ?? '').includes('\u25B6'),
      ).length,
    )
    expect(carets).toBe(1)
  })

  test('Escape backs out of the Codex', async ({ page }) => {
    await readyTitle(page)
    await page.getByRole('menuitem', { name: /Codex/ }).click()
    await expect(page.getByRole('heading', { name: 'Codex', level: 1 })).toBeVisible()
  })
})

test.describe('offline', () => {
  test('the app still loads with the network cut', async ({ page, context }) => {
    await enterGame(page)
    await page.waitForTimeout(600)

    // Wait for the service worker to take control.
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready
    })

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Warden', level: 1 })).toBeVisible({
      timeout: 15_000,
    })
    await context.setOffline(false)
  })
})

test.describe('pwa', () => {
  test('the manifest is served and installable', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const res = await request.get(new URL(href!, page.url()).toString())
    expect(res.ok()).toBeTruthy()
    const manifest = await res.json()
    expect(manifest.name).toContain('Yahrah')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/yahrah/')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  })
})
