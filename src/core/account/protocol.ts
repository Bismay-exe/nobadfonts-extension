import type { AccountConfig } from './config';
import { AccountError, errorMessage } from './errors';
import type { AccountUser, StoredSession } from './types';

export type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type IdTokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

const DEFAULT_EXPIRES_IN = 3600;

export const buildAuthorizeUrl = (params: {
  config: AccountConfig;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string => {
  const url = new URL(`${params.config.supabaseUrl}/auth/v1/oauth/authorize`);

  url.searchParams.set('client_id', params.config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', params.config.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
};

const requestTokens = async (
  config: AccountConfig,
  body: Record<string, string>
): Promise<TokenResponse> => {
  let response: Response;

  try {
    response = await fetch(`${config.supabaseUrl}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        apikey: config.anonKey,
      },
      body: new URLSearchParams(body).toString(),
    });
  } catch (error) {
    throw new AccountError('network', errorMessage(error));
  }

  let json: TokenResponse;

  try {
    json = await response.json();
  } catch {
    throw new AccountError('exchange-failed', `HTTP ${response.status}`);
  }

  if (!response.ok || json.error) {
    throw new AccountError(
      'exchange-failed',
      json.error_description ?? json.error ?? `HTTP ${response.status}`
    );
  }

  return json;
};

/**
 * Trades the code the browser came back with for tokens. A public client, so
 * no secret goes with it: the PKCE verifier proves the request instead.
 */
export const exchangeCode = (
  config: AccountConfig,
  params: { code: string; verifier: string; redirectUri: string }
): Promise<TokenResponse> =>
  requestTokens(config, {
    grant_type: 'authorization_code',
    code: params.code,
    client_id: config.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
  });

/**
 * Gets a new access token with the stored refresh token. Supabase rotates the
 * refresh token on every use, so the caller must store the new one.
 */
export const refreshSession = (
  config: AccountConfig,
  refreshToken: string
): Promise<TokenResponse> =>
  requestTokens(config, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

const decodeBase64Url = (value: string): string => {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  return new TextDecoder().decode(
    Uint8Array.from(atob(padded), character => character.charCodeAt(0))
  );
};

export const readIdTokenClaims = (
  idToken: string | undefined
): IdTokenClaims | null => {
  const payload = idToken?.split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as IdTokenClaims;
  } catch {
    return null;
  }
};

const toUser = (claims: IdTokenClaims): AccountUser => ({
  id: claims.sub ?? '',
  email: claims.email ?? '',
  name: claims.name,
  picture: claims.picture,
});

/**
 * Turns a token response into what the background keeps, with the account's
 * details read from the id token the `openid profile email` scopes provide.
 */
export const toSession = (
  tokens: TokenResponse,
  now: number
): StoredSession => {
  const claims = readIdTokenClaims(tokens.id_token);

  if (!tokens.access_token || !claims?.sub) {
    throw new AccountError(
      'exchange-failed',
      'The token response has no account'
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: now + (tokens.expires_in ?? DEFAULT_EXPIRES_IN) * 1000,
    scope: tokens.scope ?? '',
    user: toUser(claims),
  };
};

/**
 * Reads a refresh response over the session it renews: a new access token
 * and, since Supabase rotates them, a new refresh token, while the account
 * stays the one already known.
 */
export const renewSession = (
  session: StoredSession,
  tokens: TokenResponse,
  now: number
): StoredSession => {
  if (!tokens.access_token) {
    throw new AccountError(
      'exchange-failed',
      'The refresh response has no access token'
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: now + (tokens.expires_in ?? DEFAULT_EXPIRES_IN) * 1000,
    scope: tokens.scope ?? session.scope,
    user: session.user,
  };
};
