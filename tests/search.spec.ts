import { test, expect } from '@playwright/test';

const MOCK_PROFILES = [
  {
    proxyWallet: '0xabc123',
    name: 'TestTrader',
    image: '',
  },
  {
    proxyWallet: '0xdef456',
    name: 'AnotherUser',
    image: '',
  },
]

async function mockSearchAPI(page: any, profiles = MOCK_PROFILES) {
  await page.route('**/api/search**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profiles, events: [], tags: [] }),
    })
  )
}

async function typeInSearch(page: any, text: string) {
  const input = page.getByPlaceholder(/Search by Polymarket/)
  await input.click()
  await input.fill('')
  await input.pressSequentially(text, { delay: 30 })
}

test.describe('Search bar and results container', () => {
  test('shows no results dropdown on initial load', async ({ page }) => {
    await mockSearchAPI(page)
    await page.goto('/')
    await expect(page.getByText('TestTrader')).not.toBeVisible()
  })

  test('shows results dropdown when user types a query', async ({ page }) => {
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    await expect(page.getByText('AnotherUser')).toBeVisible()
  })

  test('shows no results dropdown when query is cleared', async ({ page }) => {
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    const input = page.getByPlaceholder(/Search by Polymarket/)
    await input.fill('')
    await input.dispatchEvent('input')
    await expect(page.getByText('TestTrader')).not.toBeVisible()
  })

  test('dismisses results when clicking outside the search component', async ({ page }) => {
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    await page.click('body', { position: { x: 10, y: 400 } })
    await expect(page.getByText('TestTrader')).not.toBeVisible()
  })

  test('dismisses results when a user is selected', async ({ page }) => {
    await page.route('**/api/users/**/nba-profile**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    )
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    await page.getByText('TestTrader').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('TestTrader').first()).not.toBeVisible()
  })

  test('does not reopen results after a selection is made', async ({ page }) => {
    await page.route('**/api/users/**/nba-profile**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    )
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    await page.getByText('TestTrader').click()

    // Wait for any async profile load to settle
    await page.waitForTimeout(500)

    // Results should remain hidden without further user input
    await expect(page.getByText('AnotherUser')).not.toBeVisible()
  })

  test('reopens results when the user types again after a selection', async ({ page }) => {
    await page.route('**/api/users/**/nba-profile**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    )
    await mockSearchAPI(page)
    await page.goto('/')
    await typeInSearch(page, 'test')
    await expect(page.getByText('TestTrader')).toBeVisible()
    await page.getByText('TestTrader').click()

    // Selection navigates to the profile page; wait for it then return home
    await page.waitForURL('**/0xabc123**')
    await page.goto('/')
    await typeInSearch(page, 'another')
    await expect(page.getByText('AnotherUser')).toBeVisible()
  })

  test('shows empty state when API returns no profiles', async ({ page }) => {
    await mockSearchAPI(page, [])
    await page.goto('/')
    await typeInSearch(page, 'zzznomatch')
    // Results container should not appear with zero profiles
    const resultsContainer = page.locator('[class*="shadow-lg"]')
    await expect(resultsContainer).not.toBeVisible()
  })
})
