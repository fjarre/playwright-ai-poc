import { test, expect } from '@playwright/test';

// scénario
test.describe('Recherche de produits dans JPetStore', () => {
    test('Recherche "fish" et vérification des résultats', async ({ page }) => {
        await page.goto('https://jpetstore.octoperf.com/actions/Catalog.action');
        await page.fill('input[name="keyword"]', 'fish');
        await page.click('input[name="searchProducts"]');
        
        const results = page.getByRole('heading', { name: /fish/i });
        await expect(results).toBeVisible();
        
        const productLink = results.locator('xpath=../..//a'); // assuming the product link is a sibling of the heading
        await expect(productLink).toBeVisible();
        await productLink.click();
        
        const price = page.getByText(/^\$\d+\.\d{2}$/); // regex to match price format
        await expect(price).toBeVisible();
    });
});
