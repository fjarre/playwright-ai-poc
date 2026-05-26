import { test, expect } from '@playwright/test';

// scénario
test.describe('JPetStore - Ajouter un produit au panier', () => {
  test('Naviguer et ajouter un produit', async ({ page }) => {
    await page.goto('https://jpetstore.octoperf.com/actions/Catalog.action');
    
    await page.getByLabel('Username').fill('j2ee');
    await page.getByLabel('Password').fill('j2ee');
    await page.getByText('Login').click();
    
    await page.getByText('Fish').click();
    await page.getByText('Angelfish').click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    
    const cartLink = page.getByRole('link', { name: ' cart' });
    await expect(cartLink).toBeVisible();
    await cartLink.click();

    const itemCount = page.getByText('1 item(s)');
    await expect(itemCount).toBeVisible();
    const subtotal = page.getByText('Subtotal:');
    await expect(subtotal).toBeVisible();
  });
});
