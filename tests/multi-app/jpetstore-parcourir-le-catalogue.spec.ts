import { test, expect } from '@playwright/test';

// scénario
test.describe('Navigation vers la catégorie FISH', () => {
  test('Vérifier la page d\'accueil et accéder à la catégorie FISH', async ({ page }) => {
    await page.goto('https://jpetstore.octoperf.com/actions/Catalog.action');
    await expect(page).toHaveTitle(/JPetStore Demo|JPetStore/);
    
    await page.getByRole('link', { name: /FISH/i }).click();
    await expect(page.getByText(/Angelfish|Tiger Shark/i)).toBeVisible();
  });
});
