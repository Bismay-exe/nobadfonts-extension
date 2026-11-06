import type { Meta, StoryObj } from '@storybook/vue';
import { expect, waitFor, within } from '@storybook/test';

import TheBackupTab from './TheBackupTab.vue';
import {
  optionsPage,
  seededStyles,
} from '@stylebot/storybook/fixtures/options';
import { user } from '@stylebot/storybook/story-helpers';

const meta: Meta = {
  title: 'Tests/Options/Backup',
  tags: ['test'],
  component: TheBackupTab,
  parameters: { padded: false },
};

export default meta;

/**
 * Answers the next file picker with a file holding `contents`, since a story
 * can't drive the browser's own file chooser.
 */
const chooseFileOnNextPicker = (contents: unknown) => {
  const click = HTMLInputElement.prototype.click;

  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    HTMLInputElement.prototype.click = click;

    const transfer = new DataTransfer();
    transfer.items.add(
      new File([JSON.stringify(contents)], 'stylebot_backup.json', {
        type: 'application/json',
      })
    );
    this.files = transfer.files;
    this.dispatchEvent(new Event('change'));
  };
};

const backup = (styles: Record<string, unknown>) => ({
  format: 'stylebot-backup',
  version: 1,
  exportedAt: '2026-10-01T00:00:00Z',
  styles,
});

export const MergingABackupKeepsLocalStyles: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker(
      backup({
        'example.com': {
          ...seededStyles['example.com'],
          css: 'h1 { color: blue; }',
        },
        'new.example.net': {
          css: 'body { margin: 0; }',
          enabled: true,
          readability: false,
          modifiedTime: '2026-09-01T00:00:00Z',
        },
      })
    );
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    const dialog = within(
      await canvas.findByRole('dialog', { name: 'Import 2 styles?' })
    );
    await expect(
      dialog.getByRole('button', { name: 'Replace all (deletes 3)' })
    ).toBeVisible();
    await waitFor(() =>
      expect(dialog.getByRole('button', { name: 'Import' })).toHaveFocus()
    );

    await user.click(dialog.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(canvas.getByText(/^Imported 2 styles\./)).toBeVisible()
    );
    await expect(canvas.queryByRole('dialog')).toBeNull();
  }),
  name: 'importing a backup counts what it adds and updates, then confirms the import',
};

export const ABackupWithEveryStyleHidesReplaceAll: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker(
      backup({
        ...seededStyles,
        'example.com': {
          ...seededStyles['example.com'],
          css: 'h1 { color: blue; }',
        },
      })
    );
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    const dialog = within(
      await canvas.findByRole('dialog', { name: 'Import 1 style?' })
    );
    await expect(
      dialog.queryByRole('button', { name: /^Replace all/ })
    ).toBeNull();
  }),
  name: 'a backup holding every saved style offers only Import and Cancel',
};

export const AnEmptyBackupIsRejected: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker({});
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(
        canvas.getByText('Could not import styles - The backup has no styles')
      ).toBeVisible()
    );
    await expect(canvas.queryByRole('dialog')).toBeNull();
  }),
  name: 'an empty backup shows an error instead of offering to replace every style',
};

export const AnUpToDateBackupShowsABanner: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker(backup(seededStyles));
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    await expect(await canvas.findByText('Already up to date')).toBeVisible();
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(canvas.queryByText(/^Imported/)).toBeNull();
  }),
  name: 'a backup matching every style shows an up-to-date banner instead of a dialog',
};

export const ReplacingAllDeletesStylesTheBackupLacks: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker(
      backup({
        'example.com': {
          ...seededStyles['example.com'],
          css: 'h1 { color: blue; }',
        },
      })
    );
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    const dialog = within(
      await canvas.findByRole('dialog', { name: 'Import 1 style?' })
    );
    await user.click(
      dialog.getByRole('button', { name: 'Replace all (deletes 3)' })
    );

    await waitFor(() =>
      expect(canvas.getByText(/^Imported 1 style\./)).toBeVisible()
    );
    await expect(canvas.queryByRole('dialog')).toBeNull();
  }),
  name: 'replacing all imports only the backup and reports its count',
};

export const DismissingAnImportBannerHidesIt: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker({});
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    const error = 'Could not import styles - The backup has no styles';
    await waitFor(() => expect(canvas.getByText(error)).toBeVisible());

    await user.click(canvas.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => expect(canvas.queryByText(error)).toBeNull());
  }),
  name: 'dismissing an import error banner removes it',
};

export const StartingAnImportClearsTheLastBanner: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    chooseFileOnNextPicker({});
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    const error = 'Could not import styles - The backup has no styles';
    await waitFor(() => expect(canvas.getByText(error)).toBeVisible());

    chooseFileOnNextPicker(backup(seededStyles));
    await user.click(canvas.getByRole('button', { name: 'Import' }));

    await canvas.findByText('Already up to date');
    await expect(canvas.queryByText(error)).toBeNull();
  }),
  name: 'starting a new import clears the previous import banner',
};

export const ExportNeedsSavedStyles: StoryObj = {
  ...optionsPage('Backup', {}, async root => {
    const canvas = within(root);

    await expect(canvas.getByRole('button', { name: 'Export' })).toBeDisabled();
  }),
  name: 'export is disabled while there are no saved styles',
};

export const ExportIsEnabledWithSavedStyles: StoryObj = {
  ...optionsPage('Backup', { styles: seededStyles }, async root => {
    const canvas = within(root);

    await expect(canvas.getByRole('button', { name: 'Export' })).toBeEnabled();
  }),
  name: 'export is enabled once there are saved styles',
};
