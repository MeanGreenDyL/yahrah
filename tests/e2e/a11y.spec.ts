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

/** Every screen reachable without playing content through. */
const SCREENS: [string, (p: Page) => Promise<void>][] = [
  ['title', async (p) => { await p.goto('/'); await expect(p.getByRole('menu', { name: 'Main menu' })).toBeVisible() }],
  ['codex', async (p) => { await p.goto('/'); await p.getByRole('menuitem', { name: /Codex/ }).click() }],
  ['home', enterGame],
  ['village', async (p) => { await enterGame(p); await p.getByRole('menuitem', { name: /Hakumura/ }).click() }],
  ['overworld', async (p) => { await enterGame(p); await p.getByRole('button', { name: 'Travel' }).click() }],
  ['dashboard', async (p) => { await enterGame(p); await p.getByRole('button', { name: 'Progress' }).click() }],
  ['settings', async (p) => { await enterGame(p); await p.getByRole('button', { name: 'Settings' }).click() }],
]

for (const [name, open] of SCREENS) {
  test.describe(name, () => {
    test('has exactly one level-1 heading', async ({ page }) => {
      await open(page)
      await expect(page.locator('h1')).toHaveCount(1)
    })

    test('every control has an accessible name', async ({ page }) => {
      await open(page)
      const unnamed = await page.evaluate(() => {
        const bad: string[] = []
        const controls = document.querySelectorAll('button, a[href], input, select, textarea')
        for (const el of controls) {
          const aria = el.getAttribute('aria-label')
          const labelled = el.getAttribute('aria-labelledby')
          const text = (el.textContent ?? '').trim()
          const id = el.getAttribute('id')
          const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false
          const title = el.getAttribute('title')
          if (!aria && !labelled && !text && !hasLabel && !title) {
            bad.push(`${el.tagName}.${el.className || '(no class)'}`)
          }
        }
        return bad
      })
      expect(unnamed).toEqual([])
    })

    test('every tap target is at least 44px tall', async ({ page }) => {
      await open(page)
      const small = await page.evaluate(() => {
        const bad: string[] = []
        const controls = document.querySelectorAll(
          'button, a[href], select, input:not([type="range"])',
        )
        for (const el of controls) {
          // A visually-hidden input driven by a visible button is not itself
          // a tap target; the button it proxies for is the one that counts.
          if (el.classList.contains('visually-hidden')) continue
          const r = el.getBoundingClientRect()
          if (r.height > 0 && r.height < 44) {
            bad.push(`${el.tagName}.${el.className}: ${Math.round(r.height)}px`)
          }
        }
        return bad
      })
      expect(small).toEqual([])
    })

    test('no horizontal overflow', async ({ page }) => {
      await open(page)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })

    test('no text overflows its container', async ({ page }) => {
      await open(page)
      const clipped = await page.evaluate(() => {
        const bad: string[] = []
        for (const el of document.querySelectorAll('.panel, .village, .badge, .title, .subtitle, .btn, .menu-item, .choice')) {
          if (el.scrollWidth > el.clientWidth + 1) {
            bad.push(`${el.className}: ${el.scrollWidth} > ${el.clientWidth}`)
          }
        }
        return bad
      })
      expect(clipped).toEqual([])
    })

    test('is reachable by keyboard alone', async ({ page }) => {
      await open(page)
      // Tab through and confirm focus actually lands on something interactive.
      const reached: string[] = []
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab')
        const tag = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE')
        if (tag !== 'BODY' && tag !== 'NONE') reached.push(tag)
      }
      expect(reached.length).toBeGreaterThan(0)
    })
  })
}

test.describe('text scaling', () => {
  test('the layout survives the largest text size', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Scale').fill('1.6')
    await page.waitForTimeout(400)

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('the largest text size persists and applies on the village screen', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Scale').fill('1.6')
    await page.waitForTimeout(600)
    await page.reload()
    await page.getByRole('menuitem', { name: /Hakumura/ }).click()

    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim(),
    )
    expect(scale).toBe('1.6')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})

test.describe('reduced motion', () => {
  test('the explicit setting reaches the document', async ({ page }) => {
    await enterGame(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Animation').selectOption('reduced')
    await page.waitForTimeout(300)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
  })

  test('typewriter text appears instantly under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('menuitem', { name: /Begin your training/ }).click()
    // With motion reduced the full line is on screen immediately.
    const visible = await page.locator('.dialog-text').textContent()
    expect((visible ?? '').length).toBeGreaterThan(40)
  })
})
