jest.mock('../utils', () => ({
  getAllStyles: jest.fn().mockResolvedValue({}),
  setAllStyles: jest.fn().mockResolvedValue(true),
  setOption: jest.fn(),
  getAllOptions: jest.fn().mockResolvedValue({}),
  getCommands: jest.fn().mockResolvedValue({}),
  scanVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  undoRestore: jest.fn(),
}));

import { setAllStyles } from '../utils';
import { createStore } from '.';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('importStyles', () => {
  it('adopts the imported styles once the background stored them', async () => {
    const styles = {
      'example.com': {
        css: 'h1 { color: red; }',
        enabled: true,
        readability: false,
        modifiedTime: '',
      },
    };

    const store = createStore();
    await expect(store.dispatch('importStyles', styles)).resolves.toBe(true);

    expect(store.state.styles).toEqual(styles);
  });

  it('keeps the styles it had when the background fails to store them', async () => {
    jest.mocked(setAllStyles).mockResolvedValue(false);

    const store = createStore();
    await expect(store.dispatch('importStyles', {})).resolves.toBe(false);

    expect(store.state.styles).toEqual({});
  });
});
