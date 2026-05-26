import { test, expect } from '@playwright/test';

// scénario
test.describe('Connexion à JPetStore', () => {
  test('Se connecter avec des identifiants valides', async ({ page }) => {
    await page.goto('https://jpetstore.octoperf.com/actions/Account.action?signonForm=');
    await page.fill('input[name="username"]', 'j2ee');
    await page.fill('input[name="password"]', 'j2ee');
    await page.click('input[type="submit"]');
    await expect(page.getByText('Welcome, j2ee!')).toBeVisible();
    await expect(page.getByText('Sign Off')).toBeVisible();
  });
});
