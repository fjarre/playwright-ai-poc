import { test, expect } from '@playwright/test';

// scénario
test.describe('Recherche de produits', () => {
  test('Recherche d\'un produit par nom', async ({ page }) => {
    await page.goto('https://automationexercise.com/products');
    await page.getByPlaceholder('Search Product').fill('dress');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Searched Products')).toBeVisible();
    const products = await page.locator('.productimage').count();
    expect(products).toBeGreaterThan(0);
    const results = await page.locator('.productinfo > h2').allTextContents();
    expect(results.some(title => title.includes('dress'))).toBeTruthy();
  });
});
