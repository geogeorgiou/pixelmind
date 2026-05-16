import { test, expect } from '@playwright/test';

test.describe('Shop', () => {
  test('should display the header', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('h1').first();
    await expect(header).toContainText('Pixelmind');
  });
});
