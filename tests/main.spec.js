import { test, expect } from '@playwright/test'

const EMAIL    = process.env.TEST_EMAIL    || 'rb@baden-agency.com'
const PASSWORD = process.env.TEST_PASSWORD || ''

// Helper: log in
async function login(page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('/', { timeout: 15000 })
}

test.describe('Baden Agency', () => {

  test('health check — all systems', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBeLessThan(300)
    const data = await res.json()
    console.log('\nHealth status:', data.status)
    Object.entries(data.checks).forEach(([k, v]) => {
      console.log(`  ${v.status === 'ok' ? '✅' : '❌'} ${k}: ${v.status}${v.ms ? ' (' + v.ms + 'ms)' : ''}${v.detail || v.message ? ' — ' + (v.detail || v.message) : ''}`)
    })
    expect(data.checks.supabase.status).toBe('ok')
    expect(data.checks.active_vessels_view.status).toBe('ok')
  })

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('can log in and see dashboard', async ({ page }) => {
    await login(page)
    await expect(page.getByText('Active Vessels')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Operational')).toBeVisible()
    console.log('✅ Dashboard loaded')
  })

  test('KPI cards visible on dashboard', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/operations this month/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/active vessels/i).first()).toBeVisible()
  })

  test('AI assistant opens', async ({ page }) => {
    await login(page)
    await page.locator('button[title="AI Assistant"]').click()
    await expect(page.getByText('Baden AI Assistant')).toBeVisible()
    console.log('✅ AI assistant opened')
  })

  test('vessel search with IMO', async ({ page }) => {
    await login(page)
    await page.goto('/new')
    await page.waitForLoadState('networkidle')
    const input = page.getByPlaceholder(/vessel name.*IMO|IMO.*vessel/i)
    await input.fill('9307580')
    await page.waitForTimeout(3000)
    await expect(page.getByText(/SPAR GEMINI/i)).toBeVisible({ timeout: 8000 })
    console.log('✅ Vessel IMO search works')
  })

  test('daily report loads without white screen', async ({ page }) => {
    await login(page)
    await page.goto('/daily')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Daily Report' })).toBeVisible({ timeout: 10000 })
    // Ensure no white screen / spinner stuck
    await expect(page.locator('.spinner')).toHaveCount(0, { timeout: 10000 })
    console.log('✅ Daily report loaded')
  })

  test('port overview loads', async ({ page }) => {
    await login(page)
    await page.goto('/port-overview')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Port Lineup')).toBeVisible({ timeout: 10000 })
    console.log('✅ Port overview loaded')
  })

  test('health page loads', async ({ page }) => {
    await login(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('System Health')).toBeVisible()
    await page.waitForTimeout(5000)
    await expect(page.getByText(/Supabase/i)).toBeVisible()
    console.log('✅ Health page loaded')
  })

})
