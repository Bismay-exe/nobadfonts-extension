import type { Meta } from '@storybook/vue';

import TheBackupTab from './TheBackupTab.vue';
import { optionsPage } from '@stylebot/storybook/fixtures/options';

const meta: Meta = {
  title: 'Options/Backup',
  component: TheBackupTab,
  parameters: { padded: false },
};

export default meta;

export const Default = optionsPage('Backup');
