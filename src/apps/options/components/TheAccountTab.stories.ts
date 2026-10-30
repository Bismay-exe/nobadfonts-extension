import type { Meta, StoryObj } from '@storybook/vue';
import type { AccountState } from '@stylebot/account';

import TheAccountTab from './TheAccountTab.vue';
import { optionsPage } from '@stylebot/storybook/fixtures/options';

const meta: Meta = {
  title: 'Options/Account',
  component: TheAccountTab,
  parameters: { padded: false },
};

export default meta;

const signedIn: AccountState = {
  status: 'signed-in',
  user: { id: 'user-1', email: 'reader@example.com' },
  expiresAt: Date.now() + 3_600_000,
};

const page = (account: AccountState): StoryObj => ({
  ...optionsPage('Account'),
  parameters: { chrome: { account } },
});

export const SignedOut = page({ status: 'signed-out' });

export const SignedIn = page(signedIn);

export const Unavailable = page({
  status: 'unavailable',
  reason: 'unsupported',
});

export const NotConfigured = page({
  status: 'unavailable',
  reason: 'not-configured',
});
