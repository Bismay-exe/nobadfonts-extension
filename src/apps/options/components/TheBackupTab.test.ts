import { mount } from '@vue/test-utils';

import TheBackupTab from './TheBackupTab.vue';

const mountTab = (state: Record<string, unknown> = {}) =>
  mount(TheBackupTab, {
    mocks: {
      $store: {
        state: {
          styles: {},
          ...state,
        },
        dispatch: jest.fn(),
      },
    },
  });

describe('TheBackupTab.vue', () => {
  it('shows no banner when nothing has happened yet', () => {
    const wrapper = mountTab();
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('disables export when there are no saved styles', () => {
    const wrapper = mountTab();
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('localizes its description instead of hardcoding English', () => {
    const wrapper = mountTab();
    expect(wrapper.text()).toContain('backup_description');
  });
});
