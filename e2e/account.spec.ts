import { test, expect, type Extension } from './fixtures';
import type { Page } from '@playwright/test';

const ACCOUNT_STATES = ['signed-out', 'signed-in', 'unavailable'];

const openAccountTab = async (
  page: Page,
  extension: Extension
): Promise<void> => {
  await page.goto(`chrome-extension://${extension.id}/options.html`);
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('heading', { name: 'Account', exact: true }).waitFor();
};

test.describe('Account tab', () => {
  test.skip(
    ({ engine }) => !engine.opensExtensionPages,
    "Playwright can't open the options page as a page on this engine"
  );

  test('the background answers the extension with the account state', async ({
    context,
    extension,
  }) => {
    const page = await context.newPage();
    await openAccountTab(page, extension);

    const state = await page.evaluate(async () => {
      const response = await chrome.runtime.sendMessage({
        name: 'GetNoBadFontsAccount',
      });

      return response as { status?: string } | undefined;
    });

    expect(ACCOUNT_STATES).toContain(state?.status);

    await expect(
      page.getByRole('button', { name: 'Manage connected apps' })
    ).toBeVisible();
  });
});
