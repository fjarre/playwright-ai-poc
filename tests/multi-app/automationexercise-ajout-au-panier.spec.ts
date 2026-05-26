import { test, expect } from '@playwright/test';

// scénario
test.describe('Ajouter un produit au panier et vérifier le contenu', () => {
  test('Ajouter un produit et vérifier dans le panier', async ({ page }) => {
    await page.goto('https://automationexercise.com/products');
    const firstProduct = page.getByRole('img').first();
    await firstProduct.hover();
    await page.getByText('Add to cart').click();
    await page.getByText('Continue Shopping').click();
    await page.goto('https://automationexercise.com/view_cart');
    const productName = await page.locator('.product-name').first();
    const productPrice = await page.locator('.product-price').first();
    const productQuantity = await page.locator('.qty').first();

    await expect(productName).toBeVisible();
    await expect(productName).toHaveText('Product Name Here'); // Remplacer par le nom du produit
    await expect(productPrice).toBeVisible();
    await expect(productPrice).toHaveText('Product Price Here'); // Remplacer par le prix du produit
    await expect(productQuantity).toBeVisible();
    await expect(productQuantity).toHaveText('1');
  });
});
