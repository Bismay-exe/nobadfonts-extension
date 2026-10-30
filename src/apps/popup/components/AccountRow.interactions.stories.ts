import type { Meta, StoryObj } from '@storybook/vue';
import { expect, waitFor, within } from '@storybook/test';

import AccountRow from './AccountRow.vue';
import { popup } from '@stylebot/storybook/fixtures/popup';

const meta: Meta = {
  title: 'Tests/Browser Action/Account',
  tags: ['test'],
  component: AccountRow,
  parameters: { padded: false },
};

export default meta;

export const ShowsTheSignedInAccount: StoryObj = {
  ...popup({
    account: {
      status: 'signed-in',
      user: { id: 'user-1', email: 'reader@example.com' },
      expiresAt: Date.now() + 3_600_000,
    },
  }),
  name: 'a signed-in account shows its email and a way to manage it',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() =>
      expect(canvas.getByText('reader@example.com')).toBeVisible()
    );
    await expect(canvas.getByText('Manage')).toBeVisible();
  },
};

export const OffersSignInWhenSignedOut: StoryObj = {
  ...popup({ account: { status: 'signed-out' } }),
  name: 'a signed-out account offers to sign in',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(canvas.getByText('Sign in')).toBeVisible());
  },
};

export const UnavailableBrowserHasNoSignIn: StoryObj = {
  ...popup({ account: { status: 'unavailable', reason: 'unsupported' } }),
  name: 'an unsupported browser explains why there is no sign-in',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() =>
      expect(
        canvas.getByText(
          "NoBadFonts sign-in isn't available in this browser yet."
        )
      ).toBeVisible()
    );
    await expect(canvas.queryByText('Sign in')).toBeNull();
  },
};
