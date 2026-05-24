import { test, expect } from '@playwright/test'

test.describe('rPPG SPA smoke tests', () => {
  test('Monitor page loads with Start button visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Heart Rate Monitor' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Start monitoring session' })
    ).toBeVisible()
    // BPM display is in placeholder state
    await expect(page.getByText('--', { exact: true })).toBeVisible()
  })

  test('Navigation between all four pages works', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'History' }).click()
    await expect(page).toHaveURL('/history')
    await expect(page.getByRole('heading', { name: 'Session History' })).toBeVisible()

    await page.getByRole('link', { name: 'Breathe' }).click()
    await expect(page).toHaveURL('/breathing')
    await expect(page.getByRole('heading', { name: 'Breathing Exercise' })).toBeVisible()

    await page.getByRole('link', { name: 'Mood' }).click()
    await expect(page).toHaveURL('/mood')
    await expect(page.getByRole('heading', { name: 'Mood Tracker' })).toBeVisible()

    await page.getByRole('link', { name: 'Monitor' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Heart Rate Monitor' })).toBeVisible()
  })

  test('History page shows empty state on first load', async ({ page }) => {
    // Make sure storage is clean — the SPA uses localStorage
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible()
  })

  test('Mood page shows entry form on first load', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/mood')
    await expect(page.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible()
  })

  test('Page has no console errors on initial load', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Filter out known noise (e.g., CDN-related warnings if the model fails offline)
    const real = errors.filter(
      (e) =>
        !/Failed to load resource/.test(e) &&
        !/mediapipe/i.test(e) &&
        !/face_landmarker/i.test(e)
    )
    expect(real).toEqual([])
  })
})
