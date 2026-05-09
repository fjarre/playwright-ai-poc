import { test, expect } from '@playwright/test';

// scénario : ajout d'un produit au panier et vérification du total
test.describe('Panier saucedemo — ajout produit', () => {
  test('ajoute Sauce Labs Backpack au panier et affiche le bon prix au checkout', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/inventory\.html$/);

    const itemPrice = await page
      .locator('[data-test="inventory-item"]', {
        has: page.locator('[data-test="inventory-item-name"]', { hasText: 'Sauce Labs Backpack' }),
      })
      .locator('[data-test="inventory-item-price"]')
      .innerText();

    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();

    await expect(page.locator('[data-test="shopping-cart-badge"]')).toHaveText('1');

    await page.locator('[data-test="shopping-cart-link"]').click();
    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(page.locator('[data-test="inventory-item"]')).toHaveCount(1);

    await page.locator('[data-test="checkout"]').click();
    await page.locator('[data-test="firstName"]').fill('Itecor');
    await page.locator('[data-test="lastName"]').fill('PoC');
    await page.locator('[data-test="postalCode"]').fill('1003');
    await page.locator('[data-test="continue"]').click();

    await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
    await expect(page.locator('[data-test="subtotal-label"]')).toContainText(itemPrice.replace('$', ''));
    await expect(page.locator('[data-test="total-label"]')).toBeVisible();
  });
});
