import type { Meta } from '@storybook/vue';
import type { AccountState } from '@stylebot/account';

import AccountRow from './AccountRow.vue';
import { popup } from '@stylebot/storybook/fixtures/popup';

const meta: Meta = {
  title: 'Browser Action/Account',
  component: AccountRow,
  parameters: { padded: false },
};

export default meta;

const signedIn: AccountState = {
  status: 'signed-in',
  user: { id: 'user-1', email: 'reader@example.com' },
  expiresAt: Date.now() + 3_600_000,
};

export const SignedOut = popup({ account: { status: 'signed-out' } });

export const SignedIn = popup({ account: signedIn });

export const Unavailable = popup({
  account: { status: 'unavailable', reason: 'unsupported' },
});

export const NotConfigured = popup({
  account: { status: 'unavailable', reason: 'not-configured' },
});
