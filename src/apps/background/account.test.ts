import {
  GetNoBadFontsAccount,
  NoBadFontsSignInReady,
  NoBadFontsSignOut,
  StartNoBadFontsSignIn,
  isExtensionPage,
  sentFromAuthTab,
} from './account';

jest.mock('@stylebot/account', () => {
  class AccountError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    getAccount: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isAccountError: (error: unknown) =>
      error instanceof AccountError,
    AccountError,
  };
});

import { getAccount, signIn, signOut } from '@stylebot/account';

const mockGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnop/';
const AUTH_TAB_URL = `${EXTENSION_ORIGIN}auth/index.html`;

const sender = (
  overrides: Partial<chrome.runtime.MessageSender> = {}
): chrome.runtime.MessageSender => ({
  id: 'abcdefghijklmnop',
  url: `${EXTENSION_ORIGIN}popup/index.html`,
  ...overrides,
});

const signedIn = {
  status: 'signed-in' as const,
  user: { id: 'user-1', email: 'reader@example.com' },
  expiresAt: 1_000,
};

let sendMessage: jest.Mock;

beforeEach(() => {
  sendMessage = jest.fn((_message, callback?: () => void) => callback?.());

  global.chrome = {
    runtime: {
      id: 'abcdefghijklmnop',
      getURL: (path: string) => `${EXTENSION_ORIGIN}${path}`,
      sendMessage,
      lastError: undefined,
    },
    tabs: {
      query: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as typeof chrome;

  mockGetAccount.mockReset();
  mockSignIn.mockReset();
  mockSignOut.mockReset();
});

const tabs = () => chrome.tabs as unknown as {
  query: jest.Mock;
  update: jest.Mock;
  create: jest.Mock;
};

describe('isExtensionPage', () => {
  it('accepts the extension’s own pages', () => {
    expect(isExtensionPage(sender())).toBe(true);
    expect(isExtensionPage(sender({ url: AUTH_TAB_URL }))).toBe(true);
  });

  it('refuses a page that does not belong to this extension', () => {
    expect(isExtensionPage(sender({ id: 'someone-else' }))).toBe(false);
  });

  it('refuses a content script, whose url is the page’s', () => {
    expect(
      isExtensionPage(sender({ url: 'https://example.com/article' }))
    ).toBe(false);
  });

  it('refuses a sender with no url', () => {
    expect(isExtensionPage(sender({ url: undefined }))).toBe(false);
  });
});

describe('sentFromAuthTab', () => {
  it('accepts only the sign-in tab', () => {
    expect(sentFromAuthTab(sender({ url: AUTH_TAB_URL }))).toBe(true);
    expect(sentFromAuthTab(sender())).toBe(false);
  });
});

describe('GetNoBadFontsAccount', () => {
  it('answers with the account state', async () => {
    mockGetAccount.mockResolvedValue(signedIn);
    const sendResponse = jest.fn();

    await GetNoBadFontsAccount(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(signedIn);
  });
});

describe('StartNoBadFontsSignIn', () => {
  it('brings back a sign-in tab that is already open', async () => {
    tabs().query.mockResolvedValue([{ id: 7 }]);
    const sendResponse = jest.fn();

    await StartNoBadFontsSignIn(sendResponse);

    expect(tabs().query).toHaveBeenCalledWith({ url: AUTH_TAB_URL });
    expect(tabs().update).toHaveBeenCalledWith(7, { active: true });
    expect(tabs().create).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ opened: true });
  });

  it('opens the sign-in tab when there is none', async () => {
    tabs().query.mockResolvedValue([]);
    const sendResponse = jest.fn();

    await StartNoBadFontsSignIn(sendResponse);

    expect(tabs().create).toHaveBeenCalledWith({ url: AUTH_TAB_URL });
    expect(sendResponse).toHaveBeenCalledWith({ opened: true });
  });

  it('reports a tab the browser would not open', async () => {
    tabs().query.mockRejectedValue(new Error('no tabs'));
    const sendResponse = jest.fn();

    await StartNoBadFontsSignIn(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ opened: false });
  });
});

describe('NoBadFontsSignInReady', () => {
  it('answers with the account already signed in, without a second window', async () => {
    mockGetAccount.mockResolvedValue(signedIn);
    const sendResponse = jest.fn();

    await NoBadFontsSignInReady(sendResponse);

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, account: signedIn });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('runs the sign-in and tells the extension’s pages', async () => {
    mockGetAccount.mockResolvedValue({ status: 'signed-out' });
    mockSignIn.mockResolvedValue(signedIn);
    const sendResponse = jest.fn();

    await NoBadFontsSignInReady(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true, account: signedIn });
    expect(sendMessage).toHaveBeenCalledWith(
      { name: 'NoBadFontsAccountChanged' },
      expect.any(Function)
    );
  });

  it('reports the reason a sign-in failed', async () => {
    const { AccountError } = jest.requireMock('@stylebot/account') as {
      AccountError: new (code: string, message: string) => Error;
    };
    mockGetAccount.mockResolvedValue({ status: 'signed-out' });
    mockSignIn.mockRejectedValue(new AccountError('denied', 'nope'));
    const sendResponse = jest.fn();

    await NoBadFontsSignInReady(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'denied' });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('falls back to a generic failure for an unexpected error', async () => {
    mockGetAccount.mockResolvedValue({ status: 'signed-out' });
    mockSignIn.mockRejectedValue(new Error('boom'));
    const sendResponse = jest.fn();

    await NoBadFontsSignInReady(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'exchange-failed',
    });
  });

  it('refuses to sign in when the build cannot', async () => {
    mockGetAccount.mockResolvedValue({
      status: 'unavailable',
      reason: 'not-configured',
    });
    mockSignIn.mockRejectedValue(
      new (jest.requireMock('@stylebot/account') as {
        AccountError: new (code: string, message: string) => Error;
      }).AccountError('not-configured', 'no client')
    );
    const sendResponse = jest.fn();

    await NoBadFontsSignInReady(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'not-configured',
    });
  });
});

describe('NoBadFontsSignOut', () => {
  it('ends the session and tells the extension’s pages', async () => {
    mockSignOut.mockResolvedValue();
    const sendResponse = jest.fn();

    await NoBadFontsSignOut(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(sendMessage).toHaveBeenCalledWith(
      { name: 'NoBadFontsAccountChanged' },
      expect.any(Function)
    );
  });

  it('reports a session it could not clear', async () => {
    mockSignOut.mockRejectedValue(new Error('storage'));
    const sendResponse = jest.fn();

    await NoBadFontsSignOut(sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
