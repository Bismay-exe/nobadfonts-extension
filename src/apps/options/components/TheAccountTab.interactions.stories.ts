import type { Meta, StoryObj } from '@storybook/vue';
import { expect, waitFor, within } from '@storybook/test';
import type { AccountState } from '@stylebot/account';

import TheAccountTab from './TheAccountTab.vue';
import { optionsPage } from '@stylebot/storybook/fixtures/options';
import { user } from '@stylebot/storybook/story-helpers';

const meta: Meta = {
  title: 'Tests/Options/Account',
  tags: ['test'],
  component: TheAccountTab,
  parameters: { padded: false },
};

export default meta;

const signedIn: AccountState = {
  status: 'signed-in',
  user: { id: 'user-1', email: 'reader@example.com' },
  expiresAt: Date.now() + 3_600_000,
};

export const SigningOutEndsTheSession: StoryObj = {
  ...optionsPage('Account', {}, async root => {
    const canvas = within(root);

    await user.click(canvas.getByRole('button', { name: 'Sign out' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Sign in' })).toBeVisible()
    );
  }),
  name: 'signing out ends the session and the tab offers sign-in again',
  parameters: { chrome: { account: signedIn } },
};

export const UnsupportedBrowserHasNoSignIn: StoryObj = {
  ...optionsPage('Account', {}, async root => {
    const canvas = within(root);

    await waitFor(() =>
      expect(
        canvas.getByText(
          "NoBadFonts sign-in isn't available in this browser yet."
        )
      ).toBeVisible()
    );
    await expect(canvas.queryByRole('button', { name: 'Sign in' })).toBeNull();
  }),
  name: 'a browser without sign-in support shows no sign-in button',
  parameters: {
    chrome: { account: { status: 'unavailable', reason: 'unsupported' } },
  },
};

export const SignedInAccountShowsItsEmail: StoryObj = {
  ...optionsPage('Account', {}, async root => {
    const canvas = within(root);

    await waitFor(() =>
      expect(canvas.getByText('reader@example.com')).toBeVisible()
    );
    await expect(
      canvas.getByRole('button', { name: 'Manage connected apps' })
    ).toBeVisible();
  }),
  name: 'a signed-in account shows its email and the connected apps action',
  parameters: { chrome: { account: signedIn } },
};
