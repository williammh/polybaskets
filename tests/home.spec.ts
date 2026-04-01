import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display Polybaskets dashboard heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Polybaskets')).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/Search by Polymarket/)).toBeVisible();
  });

  test('should display ad banner placeholder', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Advertisement').first()).toBeVisible();
  });

  test('should display header with NBA nav link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Polybaskets')).toBeVisible();
  });
});
