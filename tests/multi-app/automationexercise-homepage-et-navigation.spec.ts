import { test, expect } from '@playwright/test';

// Scénario
test.describe('Vérification de la homepage et des produits', () => {
  test('Navigation et vérification des éléments', async ({ page }) => {
    await page.goto('https://automationexercise.com');

    const logo = page.getByText('Automation Exercise');
    await expect(logo).toBeVisible();

    const navLinks = [
      'Home',
      'Products',
      'Cart',
      'Signup / Login'
    ];

    for (const linkText of navLinks) {
      const link = page.getByRole('link', { name: linkText });
      await expect(link).toBeVisible();
    }

    await page.getByRole('link', { name: 'Products' }).click();
    const productList = page.locator('.product-widget');
    await expect(productList).toBeVisible();
    const productCount = await productList.count();
    expect(productCount).toBeGreaterThanOrEqual(5);
  });
});
