import { getRedirectUri, isSignInSupported } from './identity';

const FIREFOX_REDIRECT_HASH = '9a30e7adef8fda1f39d1c414feb6315225c648d3';

type ChromeStub = {
  runtime: {
    getURL: (path: string) => string;
  };
  identity?: {
    getRedirectURL?: () => string;
    launchWebAuthFlow?: unknown;
  };
};

const setChrome = (stub: ChromeStub): void => {
  Object.defineProperty(globalThis, 'chrome', {
    value: stub,
    configurable: true,
    writable: true,
  });
};

beforeEach(() => {
  setChrome({
    runtime: { getURL: () => 'chrome-extension://abcdef/' },
    identity: {
      getRedirectURL: () => 'https://abcdef.chromiumapp.org/',
      launchWebAuthFlow: jest.fn(),
    },
  });
});

describe('getRedirectUri', () => {
  it('uses the Chromium app address as it is', () => {
    expect(getRedirectUri()).toBe('https://abcdef.chromiumapp.org/');
  });

  it('turns the Firefox add-on address into its loopback form', () => {
    setChrome({
      runtime: { getURL: () => 'moz-extension://addon-id/' },
      identity: {
        getRedirectURL: () =>
          `https://${FIREFOX_REDIRECT_HASH}.extensions.allizom.org/`,
      },
    });

    expect(getRedirectUri()).toBe(
      `http://127.0.0.1/mozoauth2/${FIREFOX_REDIRECT_HASH}`
    );
  });
});

describe('isSignInSupported', () => {
  it('needs both an auth window and a redirect address', () => {
    expect(isSignInSupported()).toBe(true);

    setChrome({ runtime: { getURL: () => 'chrome-extension://abcdef/' } });
    expect(isSignInSupported()).toBe(false);

    setChrome({
      runtime: { getURL: () => 'chrome-extension://abcdef/' },
      identity: { getRedirectURL: () => 'https://abcdef.chromiumapp.org/' },
    });
    expect(isSignInSupported()).toBe(false);
  });
});
