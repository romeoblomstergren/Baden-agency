import { test, expect } from '@playwright/test'

const EMAIL    = process.env.TEST_EMAIL    || 'test@baden-agency.com'
const PASSWORD = process.env.TEST_PASSWORD || 'testpassword'

test.describe('Baden Agency', () => {

  test('health check passes', async ({ request }) => {
    const res = await request.get('/api/health')
    const data = await res.json()
    expect(data.checks.supabase.status).toBe('ok')
    expect(data.checks.active_vessels_view.status).toBe('ok')
    console.log('Health:', data.status, data.total_ms + 'ms')
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/password/i)).toBeVisible()
  })

  test('can log in and see dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(EMAIL)
    await page.getByPlaceholder(/password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Active Vessels')).toBeVisible()
  })

  test('AI assistant opens and responds', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(EMAIL)
    await page.getByPlaceholder(/password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/')
    // Open AI assistant
    await page.locator('button[title="AI Assistant"]').click()
    await expect(page.getByText('Baden AI Assistant')).toBeVisible()
    // Send a message
    await page.locator('textarea[placeholder*="Ask"]').fill('Hello')
    await page.keyboard.press('Enter')
    // Wait for response
    await page.waitForTimeout(5000)
    const bubbles = page.locator('[style*="var(--blue)"]')
    await expect(bubbles.first()).toBeVisible()
  })

  test('vessel search works', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(EMAIL)
    await page.getByPlaceholder(/password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/')
    await page.goto('/new')
    const vesselInput = page.getByPlaceholder(/vessel name.*IMO/i)
    await vesselInput.fill('9307580')
    await page.waitForTimeout(2000)
    await expect(page.getByText('SPAR GEMINI')).toBeVisible()
  })

  test('daily report loads', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(EMAIL)
    await page.getByPlaceholder(/password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/')
    await page.goto('/daily')
    await expect(page.getByText('Daily Report')).toBeVisible()
    await expect(page.locator('.spinner')).toHaveCount(0, { timeout: 10000 })
  })

})
