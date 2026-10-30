import 'jest-fetch-mock';

import type { AccountConfig } from './config';
import { AccountError } from './errors';
import { getAccount, signIn, signOut, type AccountDeps } from './session';
import type { SessionStore, StoredSession } from './types';

const config: AccountConfig = {
  supabaseUrl: 'https://project.supabase.co',
  anonKey: 'anon-key',
  clientId: 'client-id',
  scopes: ['openid', 'profile', 'email'],
};

const REDIRECT_URI = 'https://abc.chromiumapp.org/';

const NOW = 1_700_000_000_000;

const encode = (value: unknown): string =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const idToken = (claims: Record<string, unknown>): string =>
  `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;

const session = (overrides: Partial<StoredSession> = {}): StoredSession => ({
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: NOW + 3_600_000,
  scope: 'openid profile email',
  user: { id: 'user-1', email: 'reader@example.com' },
  ...overrides,
});

const createStore = (initial: StoredSession | null = null) => {
  let value = initial;

  return {
    read: jest.fn(async () => value),
    write: jest.fn(async (next: StoredSession) => {
      value = next;
    }),
    clear: jest.fn(async () => {
      value = null;
    }),
    current: () => value,
  };
};

const deps = (
  store: ReturnType<typeof createStore>,
  overrides: Partial<AccountDeps> = {}
): AccountDeps => ({
  config,
  supported: true,
  store: store as unknown as SessionStore,
  launch: jest.fn(),
  redirectUri: REDIRECT_URI,
  now: () => NOW,
  ...overrides,
});

const tokenReply = (overrides: Record<string, unknown> = {}) => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  scope: 'openid profile email',
  id_token: idToken({ sub: 'user-1', email: 'reader@example.com' }),
  ...overrides,
});

/**
 * Answers launchWebAuthFlow the way the browser does, echoing the state back
 * with a code so the flow can finish.
 */
const launchWith = (
  params: { error?: string; code?: string } = {}
): jest.Mock => {
  return jest.fn(async (url: string) => {
    const state = new URL(url).searchParams.get('state') ?? '';
    const query = new URLSearchParams({ state });

    if (params.code) {
      query.set('code', params.code);
    }

    if (params.error) {
      query.set('error', params.error);
    }

    return `${REDIRECT_URI}?${query.toString()}`;
  });
};

beforeEach(() => {
  fetchMock.resetMocks();
});

describe('getAccount', () => {
  it('is not configured when the build has no OAuth client', async () => {
    const store = createStore();

    await expect(getAccount(deps(store, { config: null }))).resolves.toEqual({
      status: 'unavailable',
      reason: 'not-configured',
    });
    expect(store.read).not.toHaveBeenCalled();
  });

  it('is unsupported before the browser can run an auth window', async () => {
    const store = createStore();

    await expect(
      getAccount(deps(store, { supported: false }))
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'unsupported',
    });
    expect(store.read).not.toHaveBeenCalled();
  });

  it('is signed out with nothing stored', async () => {
    await expect(getAccount(deps(createStore()))).resolves.toEqual({
      status: 'signed-out',
    });
  });

  it('reports a session that is not near its expiry as it is', async () => {
    const stored = session();
    const store = createStore(stored);

    await expect(getAccount(deps(store))).resolves.toEqual({
      status: 'signed-in',
      user: stored.user,
      expiresAt: stored.expiresAt,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('renews an access token that is about to expire', async () => {
    const store = createStore(session({ expiresAt: NOW + 30_000 }));
    fetchMock.mockResponseOnce(
      JSON.stringify({
        access_token: 'new-access-token',
        refresh_token: 'rotated-token',
        expires_in: 3600,
      })
    );

    await expect(getAccount(deps(store))).resolves.toMatchObject({
      status: 'signed-in',
      user: { id: 'user-1' },
      expiresAt: NOW + 3_600_000,
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://project.supabase.co/auth/v1/oauth/token'
    );
    expect(new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get('refresh_token')).toBe(
      'refresh-token'
    );
    expect(store.current()).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'rotated-token',
    });
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it('clears a session that expired with no refresh token', async () => {
    const store = createStore(
      session({ expiresAt: NOW - 1, refreshToken: undefined })
    );

    await expect(getAccount(deps(store))).resolves.toEqual({
      status: 'signed-out',
    });
    expect(store.clear).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session when the renewal cannot reach the server', async () => {
    const store = createStore(session({ expiresAt: NOW + 30_000 }));
    fetchMock.mockRejectOnce(new Error('offline'));

    await expect(getAccount(deps(store))).resolves.toMatchObject({
      status: 'signed-in',
      expiresAt: NOW + 30_000,
    });
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('clears the session when the server no longer honours the grant', async () => {
    const store = createStore(session({ expiresAt: NOW + 30_000 }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ error: 'invalid_grant' }),
      { status: 400 }
    );

    await expect(getAccount(deps(store))).resolves.toEqual({
      status: 'signed-out',
    });
    expect(store.clear).toHaveBeenCalledTimes(1);
  });
});

describe('signIn', () => {
  it('runs the flow and keeps what the server returns', async () => {
    const store = createStore();
    const launch = launchWith({ code: 'code-1' });
    fetchMock.mockResponseOnce(JSON.stringify(tokenReply()));

    await expect(
      signIn(deps(store, { launch }))
    ).resolves.toMatchObject({
      status: 'signed-in',
      user: { id: 'user-1', email: 'reader@example.com' },
      expiresAt: NOW + 3_600_000,
    });

    const authorizeUrl = new URL(String(launch.mock.calls[0][0]));
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe(
      'S256'
    );
    expect(authorizeUrl.searchParams.get('code_challenge')).toHaveLength(43);
    expect(store.write).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    );
  });

  it('refuses a redirect that belongs to another request', async () => {
    const store = createStore();
    const launch = jest.fn(
      async () => `${REDIRECT_URI}?code=code-1&state=someone-else`
    );

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'state-mismatch',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('reports a cancelled sign-in', async () => {
    const store = createStore();
    const launch = jest.fn(async () => {
      throw new AccountError('cancelled', 'The sign-in window closed');
    });

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'cancelled',
    });
  });

  it('reports the user denying the extension', async () => {
    const store = createStore();
    const launch = launchWith({ error: 'access_denied' });

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'denied',
    });
  });

  it('reports any other OAuth error', async () => {
    const store = createStore();
    const launch = launchWith({ error: 'server_error' });

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'exchange-failed',
    });
  });

  it('refuses a redirect with no code', async () => {
    const store = createStore();
    const launch = launchWith();

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'exchange-failed',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a redirect it cannot read', async () => {
    const store = createStore();
    const launch = jest.fn(async () => 'not a url');

    await expect(signIn(deps(store, { launch }))).rejects.toMatchObject({
      code: 'exchange-failed',
    });
  });

  it('needs an OAuth client to sign in', async () => {
    const store = createStore();

    await expect(
      signIn(deps(store, { config: null }))
    ).rejects.toMatchObject({ code: 'not-configured' });
  });

  it('needs a browser that can run the flow', async () => {
    const store = createStore();

    await expect(
      signIn(deps(store, { supported: false }))
    ).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('signOut', () => {
  it('forgets the session in this browser', async () => {
    const store = createStore(session());

    await signOut(deps(store));

    expect(store.clear).toHaveBeenCalledTimes(1);
    expect(store.current()).toBeNull();
  });
});
