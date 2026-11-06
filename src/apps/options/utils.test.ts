import { grantSidePanel, setAllStyles } from './utils';

describe('setAllStyles', () => {
  it('resolves true once the background stored the styles', async () => {
    global.chrome = {
      runtime: { sendMessage: async () => ({ ok: true }) },
    } as unknown as typeof chrome;

    await expect(setAllStyles({})).resolves.toBe(true);
  });

  it.each([
    ['the background failed to store them', async () => ({ ok: false })],
    ['the service worker answers with nothing', async () => undefined],
    [
      'the message port closes',
      () => Promise.reject(new Error('The message port closed.')),
    ],
  ])('resolves false when %s', async (_name, sendMessage) => {
    global.chrome = {
      runtime: { sendMessage },
    } as unknown as typeof chrome;

    await expect(setAllStyles({})).resolves.toBe(false);
  });
});

describe('grantSidePanel', () => {
  const mockPermissions = (granted: boolean) => {
    const api = {
      runtime: { sendMessage: jest.fn(), lastError: undefined },
      permissions: {
        request: jest.fn((_permissions, callback) => callback(granted)),
      },
    };

    global.chrome = api as unknown as typeof chrome;
    return api;
  };

  const flush = () => new Promise(resolve => setTimeout(resolve));

  it('asks the background to reload once the permission is granted', async () => {
    const api = mockPermissions(true);

    grantSidePanel();
    await flush();

    expect(api.permissions.request).toBeCalledWith(
      { permissions: ['sidePanel'] },
      expect.any(Function)
    );
    expect(api.runtime.sendMessage).toBeCalledWith({
      name: 'ReloadForSidePanelGrant',
    });
  });

  it('leaves Stylebot running when the permission is refused', async () => {
    const api = mockPermissions(false);

    grantSidePanel();
    await flush();

    expect(api.runtime.sendMessage).not.toBeCalled();
  });
});
