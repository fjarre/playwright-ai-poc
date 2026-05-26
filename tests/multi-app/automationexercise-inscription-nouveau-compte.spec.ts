import { test, expect } from '@playwright/test';

// scénario
test.describe('Inscription nouvel utilisateur', () => {
  test('Naviguer vers le formulaire d\'inscription', async ({ page }) => {
    await page.goto('https://automationexercise.com/login');

    const signupForm = page.getByText('New User Signup!');
    await expect(signupForm).toBeVisible();

    const nameField = page.getByPlaceholder('Name');
    const emailField = page.getByPlaceholder('Email Address');
    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();

    await nameField.fill('Test User');
    await emailField.fill('testuser_ite281@example.com');

    const signupButton = page.getByText('Signup');
    await signupButton.click();

    const accountInfoTitle = page.getByText('Enter Account Information');
    await expect(accountInfoTitle).toBeVisible();
  });
});
