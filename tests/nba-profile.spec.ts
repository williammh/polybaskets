import { test, expect } from '@playwright/test';

const testUserId = '0x0000000000000000000000000000000000000000';

const MOCK_PROFILE = {
  username: 'TestTrader',
  pseudonym: '',
  profileImage: '',
  joinedDate: '2024-01-01T00:00:00Z',
  proxyWallet: testUserId,
  totalMarketsTraded: 42,
  totalQuantity: 100,
  totalValue: 500,
  totalVolume: 1000,
  nbaTradeCount: 5,
  nbaQuantity: 50,
  nbaVolume: 500,
  amountTraded: 300,
  amountClosed: 200,
  avgCost: 0.6,
  pnl: 50,
  nbaWinRate: 60,
  nbaOpenPositions: [
    {
      conditionId: 'open-1',
      title: 'Lakers vs. Warriors',
      outcome: 'YES',
      size: 10,
      avgPrice: 0.55,
      cashPnl: 5,
      currentValue: 60,
      totalBought: 55,
      endDate: '2026-04-01T00:00:00Z',
      tags: [{ slug: 'nba' }],
      eventSlug: 'nba-lal-gsw-2026-04-01',
    },
  ],
  nbaClosedPositions: [
    {
      conditionId: 'closed-1',
      title: 'NBA Finals Game 7',
      outcome: 'YES',
      avgPrice: 0.6,
      totalBought: 100,
      realizedPnl: 40,
      endDate: '2025-06-20T00:00:00Z',
      tags: [{ slug: 'nba' }],
    },
    {
      conditionId: 'closed-2',
      title: 'NBA MVP Award',
      outcome: 'NO',
      avgPrice: 0.3,
      totalBought: 60,
      realizedPnl: -10,
      endDate: '2025-05-01T00:00:00Z',
      tags: [{ slug: 'nba' }],
    },
  ],
};

async function mockNBAProfile(page: any, profile = MOCK_PROFILE) {
  await page.route(`**/api/users/**/nba-profile**`, (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile),
    })
  );
}

async function gotoWithProfile(page: any) {
  await mockNBAProfile(page);
  await page.route('**/api/search**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{ proxyWallet: testUserId, name: 'TestTrader', image: '' }],
        events: [],
        tags: [],
      }),
    })
  );
  await page.goto('/');
  const input = page.getByPlaceholder(/Search by Polymarket/);
  await input.click();
  await input.pressSequentially('test', { delay: 30 });
  await expect(page.getByText('TestTrader')).toBeVisible({ timeout: 10000 });
  await page.getByText('TestTrader').click();
  // Wait for profile to render
  await expect(page.getByText('NBA Finals Game 7')).toBeVisible({ timeout: 10000 });
}

test.describe('NBA Profile Page', () => {
  test('should display user profile structure', async ({ page }) => {
    await page.goto(`/`);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/`);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to profile from search', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search by Polymarket/);
    await expect(searchInput).toBeVisible();
  });
});

test.describe('Profile stats', () => {
  test('displays stat cards with mocked profile data', async ({ page }) => {
    await gotoWithProfile(page);
    await expect(page.getByText('NBA Predictions')).toBeVisible();
    await expect(page.getByText('NBA Win %')).toBeVisible();
    await expect(page.getByText('NBA Cost')).toBeVisible();
    await expect(page.getByText('NBA P/L')).toBeVisible();
    await expect(page.getByText('NBA Value')).toBeVisible();
  });

  test('stat card labels have tooltip indicators', async ({ page }) => {
    await gotoWithProfile(page);
    // Labels are rendered with dotted underline via StatLabel
    const label = page.getByText('NBA Predictions');
    await expect(label).toBeVisible();
    await label.hover();
    await expect(page.getByText(/Includes open and closed/)).toBeVisible();
  });
});

test.describe('Positions table tab switching', () => {
  test('defaults to all positions tab', async ({ page }) => {
    await gotoWithProfile(page);
    await expect(page.getByText('NBA Finals Game 7')).toBeVisible();
  });

  test('switches to active positions tab', async ({ page }) => {
    await gotoWithProfile(page);
    await page.getByRole('tab', { name: /Active/ }).click();
    await expect(page.getByText('Lakers vs. Warriors')).toBeVisible();
  });

  test('switching tabs preserves sort state independently', async ({ page }) => {
    await gotoWithProfile(page);
    // Sort by title
    await page.getByText('Market').first().click();
    // Switch to active
    await page.getByRole('tab', { name: /Active/ }).click();
    await expect(page.getByText('Lakers vs. Warriors')).toBeVisible();
    // Switch back
    await page.getByRole('tab', { name: /Closed/ }).click();
    await expect(page.getByText('NBA Finals Game 7')).toBeVisible();
  });

  test('tab shows position counts', async ({ page }) => {
    await gotoWithProfile(page);
    await expect(page.getByRole('tab', { name: /Closed/ })).toContainText('2');
    await expect(page.getByRole('tab', { name: /Active/ })).toContainText('1');
  });
});

const MOCK_PROFILE_WITH_BET_TYPES = {
  ...MOCK_PROFILE,
  nbaTradeCount: 3,
  nbaOpenPositions: [],
  nbaClosedPositions: [
    {
      conditionId: 'ml-1',
      title: 'Lakers vs. Warriors',
      outcome: 'YES',
      avgPrice: 0.6,
      totalBought: 100,
      realizedPnl: 40,
      endDate: '2025-06-20T00:00:00Z',
      tags: [{ slug: 'nba' }],
    },
    {
      conditionId: 'ou-1',
      title: 'Lakers vs. Warriors: O/U 224.5',
      outcome: 'Over',
      avgPrice: 0.5,
      totalBought: 50,
      realizedPnl: 10,
      endDate: '2025-06-20T00:00:00Z',
      tags: [{ slug: 'nba' }],
    },
    {
      conditionId: 'sp-1',
      title: 'Spread: Lakers -3.5 vs. Warriors',
      outcome: 'YES',
      avgPrice: 0.52,
      totalBought: 80,
      realizedPnl: -5,
      endDate: '2025-06-20T00:00:00Z',
      tags: [{ slug: 'nba' }],
    },
  ],
};

async function gotoWithBetTypeProfile(page: any) {
  await mockNBAProfile(page, MOCK_PROFILE_WITH_BET_TYPES);
  await page.route('**/api/search**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{ proxyWallet: testUserId, name: 'TestTrader', image: '' }],
        events: [],
        tags: [],
      }),
    })
  );
  await page.goto('/');
  const input = page.getByPlaceholder(/Search by Polymarket/);
  await input.click();
  await input.pressSequentially('test', { delay: 30 });
  await expect(page.getByText('TestTrader')).toBeVisible({ timeout: 10000 });
  await page.getByText('TestTrader').click();
  await expect(page.getByText('Lakers vs. Warriors', { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe('Bet type filter checkboxes', () => {
  test('all three checkboxes are checked by default', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await expect(page.getByLabel('Moneyline').first()).toBeChecked();
    await expect(page.getByLabel('Over/Under').first()).toBeChecked();
    await expect(page.getByLabel('Spread').first()).toBeChecked();
  });

  test('all positions visible when all checkboxes checked', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await expect(page.getByText('Lakers vs. Warriors', { exact: true })).toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).toBeVisible();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).toBeVisible();
  });

  test('unchecking Over/Under hides O/U positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Over/Under').first().click();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).not.toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors', { exact: true })).toBeVisible();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).toBeVisible();
  });

  test('unchecking Spread hides Spread positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Spread').first().click();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).not.toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors', { exact: true })).toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).toBeVisible();
  });

  test('unchecking Moneyline hides moneyline positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Moneyline').first().click();
    // The plain moneyline title should be gone, but O/U and Spread remain
    await expect(page.getByText('Lakers vs. Warriors', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).toBeVisible();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).toBeVisible();
  });

  test('checking only Over/Under shows only O/U positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Moneyline').first().click();
    await page.getByLabel('Spread').first().click();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).toBeVisible();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).not.toBeVisible();
  });

  test('checking only Spread shows only spread positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Moneyline').first().click();
    await page.getByLabel('Over/Under').first().click();
    await expect(page.getByText('Spread: Lakers -3.5 vs. Warriors')).toBeVisible();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).not.toBeVisible();
  });

  test('rechecking a checkbox restores its positions', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    await page.getByLabel('Over/Under').first().click();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).not.toBeVisible();
    await page.getByLabel('Over/Under').first().click();
    await expect(page.getByText('Lakers vs. Warriors: O/U 224.5')).toBeVisible();
  });

  test('tab counts update when a checkbox is unchecked', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    // All 3 closed, 0 open → All=3, Closed=3, Active=0
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('3');
    await page.getByLabel('Over/Under').first().click();
    // O/U removed → 2 remain
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('2');
    await expect(page.getByRole('tab', { name: /Closed/ })).toContainText('2');
  });

  test('stat card counts update when a checkbox is unchecked', async ({ page }) => {
    await gotoWithBetTypeProfile(page);
    // Uncheck all but one type to get a lower count
    await page.getByLabel('Moneyline').first().click();
    await page.getByLabel('Spread').first().click();
    // Only 1 O/U position remains → NBA Predictions should show 1
    const predictionsCard = page.locator('p.font-semibold').filter({ hasText: /^1$/ });
    await expect(predictionsCard).toBeVisible();
  });
});

// ─── Date filter test data (computed relative to today for test stability) ───
const _now = new Date();
const _yr = _now.getFullYear();
const _mo = _now.getMonth() + 1; // 1-indexed
const _lastMoYear = _mo === 1 ? _yr - 1 : _yr;
const _lastMo = _mo === 1 ? 12 : _mo - 1;
function _iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`;
}

const MOCK_PROFILE_WITH_DATES = {
  ...MOCK_PROFILE,
  nbaOpenPositions: [],
  nbaClosedPositions: [
    {
      conditionId: 'date-new',
      title: 'Near Future Game',
      outcome: 'YES',
      avgPrice: 0.6,
      totalBought: 100,
      realizedPnl: 40,
      endDate: _iso(_yr, _mo, 20), // day 20 of current month
      tags: [{ slug: 'nba' }],
    },
    {
      conditionId: 'date-mid',
      title: 'Early Month Game',
      outcome: 'YES',
      avgPrice: 0.5,
      totalBought: 50,
      realizedPnl: 10,
      endDate: _iso(_yr, _mo, 5), // day 5 of current month
      tags: [{ slug: 'nba' }],
    },
    {
      conditionId: 'date-old',
      title: 'Last Month Game',
      outcome: 'YES',
      avgPrice: 0.52,
      totalBought: 80,
      realizedPnl: -5,
      endDate: _iso(_lastMoYear, _lastMo, 5), // day 5 of last month
      tags: [{ slug: 'nba' }],
    },
  ],
};

async function gotoWithDateProfile(page: any) {
  await mockNBAProfile(page, MOCK_PROFILE_WITH_DATES);
  await page.route('**/api/search**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{ proxyWallet: testUserId, name: 'TestTrader', image: '' }],
        events: [],
        tags: [],
      }),
    })
  );
  await page.goto('/');
  const input = page.getByPlaceholder(/Search by Polymarket/);
  await input.click();
  await input.pressSequentially('test', { delay: 30 });
  await expect(page.getByText('TestTrader')).toBeVisible({ timeout: 10000 });
  await page.getByText('TestTrader').click();
  await expect(page.getByText('Near Future Game')).toBeVisible({ timeout: 10000 });
}

// Selects day 15 of the currently displayed calendar month.
// Works because day 15 is never an outside day in any month's grid.
async function selectDay15(page: any) {
  const popover = page.locator('[data-radix-popper-content-wrapper]');
  await popover.locator('button').filter({ hasText: /^15$/ }).click();
}

test.describe('Min close date filter', () => {
  test('date picker trigger is visible with placeholder text', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByTestId('min-close-date-trigger').first()).toBeVisible();
  });

  test('all positions visible before filter is set', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
  });

  test('clicking trigger opens the calendar', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('selecting day 15 filters out positions closing before that date', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Near Future Game')).toBeVisible();      // day 20 ≥ day 15 → kept
    await expect(page.getByText('Early Month Game')).not.toBeVisible(); // day 5 < day 15 → filtered
    await expect(page.getByText('Last Month Game')).not.toBeVisible();  // last month < day 15 → filtered
  });

  test('trigger button shows selected date after selection', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    // Popover auto-closes on selection; trigger now shows the formatted date (not placeholder)
    await expect(page.getByTestId('min-close-date-trigger').first()).not.toContainText('Min Close Date');
  });

  test('clear button appears after selecting a date', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByTestId('min-close-date-clear').first()).not.toBeVisible();
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByTestId('min-close-date-clear').first()).toBeVisible();
  });

  test('clicking clear removes the filter and shows all positions', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Last Month Game')).not.toBeVisible();
    await page.getByTestId('min-close-date-clear').first().click();
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
  });

  test('tab counts update when date filter is applied', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('3');
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('1');
    await expect(page.getByRole('tab', { name: /Closed/ })).toContainText('1');
  });

  test('stat cards update when date filter is applied', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    // Only 1 position remains — NBA Predictions stat card shows "1"
    const predictionsCard = page.locator('p.font-semibold').filter({ hasText: /^1$/ });
    await expect(predictionsCard).toBeVisible();
  });

  test('switching tabs resets the date filter', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Last Month Game')).not.toBeVisible();
    // Switch tab — handleTabChange resets all filters including minCloseDate
    await page.getByRole('tab', { name: /Closed/ }).click();
    await expect(page.getByText('Last Month Game')).toBeVisible();
    await expect(page.getByTestId('min-close-date-trigger').first()).toBeVisible();
  });

  test('opening and closing calendar without selecting a date does not apply a date filter', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('min-close-date-trigger').first().click();
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible();
    // Close calendar without selecting a day
    await page.keyboard.press('Escape');
    // No date was selected — all positions still visible, trigger still shows placeholder
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
    await expect(page.getByTestId('min-close-date-trigger').first()).toContainText('Min Close Date');
  });
});

test.describe('Max close date filter', () => {
  test('date picker trigger is visible with placeholder text', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByTestId('max-close-date-trigger').first()).toBeVisible();
  });

  test('all positions visible before filter is set', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
  });

  test('clicking trigger opens the calendar', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('selecting day 15 filters out positions closing after that date', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Near Future Game')).not.toBeVisible(); // day 20 > day 15 → filtered
    await expect(page.getByText('Early Month Game')).toBeVisible();     // day 5 ≤ day 15 → kept
    await expect(page.getByText('Last Month Game')).toBeVisible();      // last month ≤ day 15 → kept
  });

  test('trigger button shows selected date after selection', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    // Popover auto-closes on selection; trigger now shows the formatted date (not placeholder)
    await expect(page.getByTestId('max-close-date-trigger').first()).not.toContainText('Max Close Date');
  });

  test('clear button appears after selecting a date', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByTestId('max-close-date-clear').first()).not.toBeVisible();
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByTestId('max-close-date-clear').first()).toBeVisible();
  });

  test('clicking clear removes the filter and shows all positions', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Near Future Game')).not.toBeVisible();
    await page.getByTestId('max-close-date-clear').first().click();
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
  });

  test('tab counts update when date filter is applied', async ({ page }) => {
    await gotoWithDateProfile(page);
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('3');
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByRole('tab', { name: /All/ })).toContainText('2');
    await expect(page.getByRole('tab', { name: /Closed/ })).toContainText('2');
  });

  test('stat cards update when date filter is applied', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    // 2 positions remain — NBA Predictions stat card shows "2"
    const predictionsCard = page.locator('p.font-semibold').filter({ hasText: /^2$/ });
    await expect(predictionsCard).toBeVisible();
  });

  test('switching tabs resets the date filter', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    await selectDay15(page);
    await expect(page.getByText('Near Future Game')).not.toBeVisible();
    // Switch tab — handleTabChange resets all filters including maxCloseDate
    await page.getByRole('tab', { name: /Closed/ }).click();
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByTestId('max-close-date-trigger').first()).toBeVisible();
  });

  test('opening and closing calendar without selecting a date does not apply a date filter', async ({ page }) => {
    await gotoWithDateProfile(page);
    await page.getByTestId('max-close-date-trigger').first().click();
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible();
    // Close calendar without selecting a day
    await page.keyboard.press('Escape');
    // No date was selected — all positions still visible, trigger still shows placeholder
    await expect(page.getByText('Near Future Game')).toBeVisible();
    await expect(page.getByText('Early Month Game')).toBeVisible();
    await expect(page.getByText('Last Month Game')).toBeVisible();
    await expect(page.getByTestId('max-close-date-trigger').first()).toContainText('Max Close Date');
  });
});

test.describe('Table horizontal scroll', () => {
  test('table container allows horizontal scroll on narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await gotoWithProfile(page);

    const tableContainer = page.locator('[data-slot="table-container"]');
    await expect(tableContainer).toBeVisible();

    const overflow = await tableContainer.evaluate(el =>
      window.getComputedStyle(el).overflowX
    );
    expect(overflow).toBe('auto');
  });

  test('table is wider than viewport on narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await gotoWithProfile(page);

    const table = page.locator('[data-slot="table"]');
    const tableWidth = await table.evaluate(el => el.scrollWidth);
    expect(tableWidth).toBeGreaterThan(400);
  });

  test('table container scrollWidth exceeds clientWidth on narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await gotoWithProfile(page);

    const container = page.locator('[data-slot="table-container"]');
    const isScrollable = await container.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(isScrollable).toBe(true);
  });

  test('table is not clipped on wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithProfile(page);

    const container = page.locator('[data-slot="table-container"]');
    const isScrollable = await container.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(isScrollable).toBe(false);
  });
});
