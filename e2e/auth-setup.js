/**
 * Auth Setup - Run this once with --headed to save your Supabase session
 *
 * Usage:
 *   npx playwright test e2e/auth-setup.js --headed
 *
 * This will open a browser, navigate to the app, and wait for you to sign in.
 * After you sign in, it saves the browser state to e2e/.auth/state.json.
 * Subsequent tests will use this saved state.
 */

import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(import.meta.dirname, '.auth', 'state.json');

setup('authenticate', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  console.log('\n=== PLEASE SIGN IN ===');
  console.log('Click "Sign In" and complete Google OAuth in the browser window.');
  console.log('The test will continue automatically once you\'re logged in.\n');

  // Wait for the user to sign in - look for the "Plan My Summer" button which appears when authenticated
  await page.waitForSelector('button:has-text("Plan My Summer")', { timeout: 120000 });
  console.log('Authentication detected! Saving browser state...');

  // Save the auth state
  await page.context().storageState({ path: authFile });
  console.log(`Auth state saved to: ${authFile}`);
});
