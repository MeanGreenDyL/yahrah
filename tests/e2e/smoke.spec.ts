import { test, expect } from '@playwright/test'

/**
 * M0 shell smoke test. Checks the app renders, has no horizontal overflow at
 * phone width, and that interactive/landmark structure is sane. Screenshots
 * are captured for manual review of layout problems.
 */

test('renders the shell', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'YAHRAH', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The Three Vows' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The Seven Villages' })).toBeVisible()

  // All seven villages listed, exactly one of them open.
  await expect(page.locator('.village')).toHaveCount(7)
  await expect(page.locator('.badge-open')).toHaveCount(1)

  await page.screenshot({
    path: testInfo.outputPath(`shell-${testInfo.project.name}.png`),
    fullPage: true,
  })
  await testInfo.attach('shell', {
    path: testInfo.outputPath(`shell-${testInfo.project.name}.png`),
    contentType: 'image/png',
  })
})

test('no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(() => {
    const d = document.documentElement
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }
  })
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})

test('no text is clipped out of its container', async ({ page }) => {
  await page.goto('/')
  const clipped = await page.evaluate(() => {
    const bad: string[] = []
    for (const el of document.querySelectorAll('.panel, .village, .badge, .title, .subtitle')) {
      if (el.scrollWidth > el.clientWidth + 1) {
        bad.push(`${el.className}: ${el.scrollWidth} > ${el.clientWidth}`)
      }
    }
    return bad
  })
  expect(clipped).toEqual([])
})

test('the PWA manifest is served and well formed', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const res = await request.get(new URL(href!, page.url()).toString())
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.name).toContain('Yahrah')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
})
