import 'jest-fetch-mock';

import type { AccountConfig } from './config';
import { AccountError } from './errors';
import {
  buildAuthorizeUrl,
  exchangeCode,
  readIdTokenClaims,
  refreshSession,
  renewSession,
  toSession,
} from './protocol';
import type { StoredSession } from './types';

const config: AccountConfig = {
  supabaseUrl: 'https://project.supabase.co',
  anonKey: 'anon-key',
  clientId: 'client-id',
  scopes: ['openid', 'profile', 'email'],
};

const REDIRECT_URI = 'https://abc.chromiumapp.org/';

const encode = (value: unknown): string =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const idToken = (claims: Record<string, unknown>): string =>
  `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;

const session: StoredSession = {
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  expiresAt: 1_000_000,
  scope: 'openid profile email',
  user: { id: 'user-1', email: 'reader@example.com' },
};

beforeEach(() => {
  fetchMock.resetMocks();
});

const sentBody = (call = 0): URLSearchParams =>
  new URLSearchParams(String(fetchMock.mock.calls[call][1]?.body));

const sentInit = (call = 0): RequestInit =>
  fetchMock.mock.calls[call][1] as RequestInit;

describe('buildAuthorizeUrl', () => {
  it('asks for a code at the project with the extension as the client', () => {
    const url = new URL(
      buildAuthorizeUrl({
        config,
        redirectUri: REDIRECT_URI,
        state: 'state-1',
        codeChallenge: 'challenge-1',
      })
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://project.supabase.co/auth/v1/oauth/authorize'
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-id',
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'openid profile email',
      state: 'state-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
    });
  });
});

describe('exchangeCode', () => {
  it('sends the code and its verifier, with no secret', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ access_token: 'token' }));

    await exchangeCode(config, {
      code: 'code-1',
      verifier: 'verifier-1',
      redirectUri: REDIRECT_URI,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://project.supabase.co/auth/v1/oauth/token'
    );
    expect(Object.fromEntries(sentBody())).toEqual({
      grant_type: 'authorization_code',
      code: 'code-1',
      client_id: 'client-id',
      redirect_uri: REDIRECT_URI,
      code_verifier: 'verifier-1',
    });
    expect(sentInit().method).toBe('POST');
    expect(sentInit().headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      apikey: 'anon-key',
    });
    expect(sentBody().get('client_secret')).toBeNull();
  });

  it('reports a failed connection as a network error', async () => {
    fetchMock.mockRejectOnce(new Error('offline'));

    await expect(
      exchangeCode(config, {
        code: 'code-1',
        verifier: 'verifier-1',
        redirectUri: REDIRECT_URI,
      })
    ).rejects.toMatchObject({ code: 'network' });
  });

  it('reports a reply that is not JSON', async () => {
    fetchMock.mockResponseOnce('<html>gateway</html>', { status: 502 });

    await expect(
      exchangeCode(config, {
        code: 'code-1',
        verifier: 'verifier-1',
        redirectUri: REDIRECT_URI,
      })
    ).rejects.toMatchObject({
      code: 'exchange-failed',
      message: 'HTTP 502',
    });
  });

  it('reports the OAuth error the server returned', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Refresh token revoked',
      }),
      { status: 400 }
    );

    await expect(
      exchangeCode(config, {
        code: 'code-1',
        verifier: 'verifier-1',
        redirectUri: REDIRECT_URI,
      })
    ).rejects.toMatchObject({
      code: 'exchange-failed',
      message: 'Refresh token revoked',
    });
  });
});

describe('refreshSession', () => {
  it('sends the refresh token as the extension, with no secret', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ access_token: 'new-access' }));

    await refreshSession(config, 'old-refresh');

    expect(Object.fromEntries(sentBody())).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh',
      client_id: 'client-id',
    });
    expect(sentBody().get('client_secret')).toBeNull();
  });
});

describe('readIdTokenClaims', () => {
  it('reads the claims out of the payload segment', () => {
    expect(
      readIdTokenClaims(
        idToken({ sub: 'user-1', email: 'reader@example.com', name: 'Reader' })
      )
    ).toMatchObject({
      sub: 'user-1',
      email: 'reader@example.com',
      name: 'Reader',
    });
  });

  it('has nothing for a token without a payload', () => {
    expect(readIdTokenClaims(undefined)).toBeNull();
    expect(readIdTokenClaims('not-a-token')).toBeNull();
  });

  it('has nothing for a payload that is not JSON', () => {
    expect(readIdTokenClaims('header.bm90LWpzb24.signature')).toBeNull();
  });
});

describe('toSession', () => {
  it('keeps the tokens and the account from the id token', () => {
    expect(
      toSession(
        {
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 120,
          scope: 'openid profile email',
          id_token: idToken({
            sub: 'user-1',
            email: 'reader@example.com',
            name: 'Reader',
            picture: 'https://example.com/picture.png',
          }),
        },
        5_000
      )
    ).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: 5_000 + 120_000,
      scope: 'openid profile email',
      user: {
        id: 'user-1',
        email: 'reader@example.com',
        name: 'Reader',
        picture: 'https://example.com/picture.png',
      },
    });
  });

  it('falls back to an hour when the server gives no lifetime', () => {
    expect(
      toSession(
        {
          access_token: 'access-1',
          id_token: idToken({ sub: 'user-1', email: 'reader@example.com' }),
        },
        0
      )
    ).toMatchObject({ expiresAt: 3_600_000, scope: '' });
  });

  it('refuses a reply without an access token', () => {
    expect(() =>
      toSession({ id_token: idToken({ sub: 'user-1' }) }, 0)
    ).toThrow(AccountError);
  });

  it('refuses a reply without an account', () => {
    expect(() =>
      toSession({ access_token: 'access-1', id_token: idToken({}) }, 0)
    ).toThrow(AccountError);
  });
});

describe('renewSession', () => {
  it('takes the rotated refresh token and leaves the account alone', () => {
    expect(
      renewSession(
        session,
        {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 60,
        },
        2_000
      )
    ).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: 2_000 + 60_000,
      scope: 'openid profile email',
      user: session.user,
    });
  });

  it('keeps the stored refresh token when none comes back', () => {
    expect(
      renewSession(session, { access_token: 'new-access' }, 0)
    ).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'old-refresh',
      expiresAt: 3_600_000,
    });
  });

  it('refuses a refresh without an access token', () => {
    expect(() => renewSession(session, {}, 0)).toThrow(AccountError);
  });
});
