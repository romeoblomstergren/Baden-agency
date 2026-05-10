# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.js >> Baden Agency >> health page loads
- Location: tests/main.spec.js:87:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('System Health')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('System Health')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const EMAIL    = process.env.TEST_EMAIL    || 'rb@baden-agency.com'
  4  | const PASSWORD = process.env.TEST_PASSWORD || ''
  5  | 
  6  | // Helper: log in
  7  | async function login(page) {
  8  |   await page.goto('/login')
  9  |   await page.waitForLoadState('networkidle')
  10 |   await page.locator('input[type="email"]').fill(EMAIL)
  11 |   await page.locator('input[type="password"]').fill(PASSWORD)
  12 |   await page.locator('button[type="submit"]').click()
  13 |   await page.waitForURL('/', { timeout: 15000 })
  14 | }
  15 | 
  16 | test.describe('Baden Agency', () => {
  17 | 
  18 |   test('health check — all systems', async ({ request }) => {
  19 |     const res = await request.get('/api/health')
  20 |     expect(res.status()).toBeLessThan(300)
  21 |     const data = await res.json()
  22 |     console.log('\nHealth status:', data.status)
  23 |     Object.entries(data.checks).forEach(([k, v]) => {
  24 |       console.log(`  ${v.status === 'ok' ? '✅' : '❌'} ${k}: ${v.status}${v.ms ? ' (' + v.ms + 'ms)' : ''}${v.detail || v.message ? ' — ' + (v.detail || v.message) : ''}`)
  25 |     })
  26 |     expect(data.checks.supabase.status).toBe('ok')
  27 |     expect(data.checks.active_vessels_view.status).toBe('ok')
  28 |   })
  29 | 
  30 |   test('login page loads correctly', async ({ page }) => {
  31 |     await page.goto('/login')
  32 |     await page.waitForLoadState('networkidle')
  33 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  34 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  35 |     await expect(page.locator('button[type="submit"]')).toBeVisible()
  36 |   })
  37 | 
  38 |   test('can log in and see dashboard', async ({ page }) => {
  39 |     await login(page)
  40 |     await expect(page.getByText('Active Vessels')).toBeVisible({ timeout: 10000 })
  41 |     await expect(page.getByText('Operational')).toBeVisible()
  42 |     console.log('✅ Dashboard loaded')
  43 |   })
  44 | 
  45 |   test('KPI cards visible on dashboard', async ({ page }) => {
  46 |     await login(page)
  47 |     await expect(page.getByText(/operations this month/i)).toBeVisible({ timeout: 10000 })
  48 |     await expect(page.getByText(/active vessels/i).first()).toBeVisible()
  49 |   })
  50 | 
  51 |   test('AI assistant opens', async ({ page }) => {
  52 |     await login(page)
  53 |     await page.locator('button[title="AI Assistant"]').click()
  54 |     await expect(page.getByText('Baden AI Assistant')).toBeVisible()
  55 |     console.log('✅ AI assistant opened')
  56 |   })
  57 | 
  58 |   test('vessel search with IMO', async ({ page }) => {
  59 |     await login(page)
  60 |     await page.goto('/new')
  61 |     await page.waitForLoadState('networkidle')
  62 |     const input = page.getByPlaceholder(/vessel name.*IMO|IMO.*vessel/i)
  63 |     await input.fill('9307580')
  64 |     await page.waitForTimeout(3000)
  65 |     await expect(page.getByText(/SPAR GEMINI/i)).toBeVisible({ timeout: 8000 })
  66 |     console.log('✅ Vessel IMO search works')
  67 |   })
  68 | 
  69 |   test('daily report loads without white screen', async ({ page }) => {
  70 |     await login(page)
  71 |     await page.goto('/daily')
  72 |     await page.waitForLoadState('networkidle')
  73 |     await expect(page.getByRole('heading', { name: 'Daily Report' })).toBeVisible({ timeout: 10000 })
  74 |     // Ensure no white screen / spinner stuck
  75 |     await expect(page.locator('.spinner')).toHaveCount(0, { timeout: 10000 })
  76 |     console.log('✅ Daily report loaded')
  77 |   })
  78 | 
  79 |   test('port overview loads', async ({ page }) => {
  80 |     await login(page)
  81 |     await page.goto('/port-overview')
  82 |     await page.waitForLoadState('networkidle')
  83 |     await expect(page.getByText('Port Lineup')).toBeVisible({ timeout: 10000 })
  84 |     console.log('✅ Port overview loaded')
  85 |   })
  86 | 
  87 |   test('health page loads', async ({ page }) => {
  88 |     await login(page)
  89 |     await page.goto('/health')
  90 |     await page.waitForLoadState('networkidle')
> 91 |     await expect(page.getByText('System Health')).toBeVisible()
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  92 |     await page.waitForTimeout(5000)
  93 |     await expect(page.getByText(/Supabase/i)).toBeVisible()
  94 |     console.log('✅ Health page loaded')
  95 |   })
  96 | 
  97 | })
  98 | 
```