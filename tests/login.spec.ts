import { test, expect } from '@playwright/test';

// scénario : login standard_user / secret_sauce
test.describe('Login saucedemo — standard_user', () => {
  test('connecte standard_user et atterrit sur /inventory.html', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(page.locator('[data-test="inventory-container"]')).toBeVisible();
  });
});
