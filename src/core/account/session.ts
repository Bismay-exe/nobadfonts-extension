import { getAccountConfig, type AccountConfig } from './config';
import { AccountError, isAccountError } from './errors';
import {
  getRedirectUri,
  isSignInSupported,
  launchWebAuthFlow,
} from './identity';
import { createChallenge, createRandomString } from './pkce';
import {
  buildAuthorizeUrl,
  exchangeCode,
  renewSession,
  refreshSession,
  toSession,
} from './protocol';
import { sessionStore } from './storage';
import type { AccountState, SessionStore, StoredSession } from './types';

const REFRESH_BEFORE_MS = 60 * 1000;

// One refresh per store at a time: two callers that both see a session near
// expiry must not spend the same rotating refresh token twice.
const refreshes = new WeakMap<SessionStore, Promise<StoredSession | null>>();

export type AccountDeps = {
  config: AccountConfig | null;
  supported: boolean;
  store: SessionStore;
  launch: (url: string) => Promise<string>;
  redirectUri: string;
  now: () => number;
};

/**
 * What the background's account calls run against. A local build overrides
 * the OAuth client and Supabase URL at build time.
 */
export const defaultAccountDeps = (): AccountDeps => {
  const supported = isSignInSupported();

  return {
    config: getAccountConfig(),
    supported,
    store: sessionStore,
    launch: launchWebAuthFlow,
    redirectUri: supported ? getRedirectUri() : '',
    now: () => Date.now(),
  };
};

/**
 * The auth window is handed back the browser's own redirect address. Checking
 * it here keeps a browser that answers with something else from feeding a
 * code into the exchange.
 */
const cameBackTo = (responseUrl: string, redirectUri: string): boolean => {
  try {
    const response = new URL(responseUrl);
    const expected = new URL(redirectUri);

    return (
      response.protocol === expected.protocol &&
      response.host === expected.host &&
      response.pathname === expected.pathname
    );
  } catch {
    return false;
  }
};

const blocked = (deps: AccountDeps): AccountState | null => {
  if (!deps.config) {
    return { status: 'unavailable', reason: 'not-configured' };
  }

  if (!deps.supported) {
    return { status: 'unavailable', reason: 'unsupported' };
  }

  return null;
};

const signedIn = (session: StoredSession): AccountState => ({
  status: 'signed-in',
  user: session.user,
  expiresAt: session.expiresAt,
});

const needsRenewal = (deps: AccountDeps, session: StoredSession): boolean =>
  session.expiresAt - deps.now() <= REFRESH_BEFORE_MS;

/**
 * A lost reply can arrive after the server rotated the refresh token. Supabase
 * reuses a rotated token for a short window, so one immediate retry usually
 * recovers instead of leaving the account signed out.
 */
const refreshTokens = async (
  config: AccountConfig,
  refreshToken: string
): Promise<Awaited<ReturnType<typeof refreshSession>>> => {
  try {
    return await refreshSession(config, refreshToken);
  } catch (error) {
    if (isAccountError(error) && error.code === 'network') {
      return refreshSession(config, refreshToken);
    }

    throw error;
  }
};

const isRevoked = (error: unknown): boolean =>
  isAccountError(error) && error.oauthError === 'invalid_grant';

/**
 * Re-reads the session under the lock, so a refresh another caller finished
 * first is reused rather than repeated with an already-rotated token.
 */
const renewLocked = async (
  deps: AccountDeps
): Promise<StoredSession | null> => {
  const session = await deps.store.read();

  if (!session) {
    return null;
  }

  if (!needsRenewal(deps, session)) {
    return session;
  }

  if (!session.refreshToken) {
    await deps.store.clear();
    return null;
  }

  try {
    const tokens = await refreshTokens(
      deps.config as AccountConfig,
      session.refreshToken
    );
    const renewed = renewSession(session, tokens, deps.now());

    await deps.store.write(renewed);
    return renewed;
  } catch (error) {
    // Only a grant the server no longer honours ends the session. A 5xx, a
    // malformed reply or another OAuth error is worth trying again later.
    if (isRevoked(error)) {
      await deps.store.clear();
      return null;
    }

    return session;
  }
};

/**
 * Renews the access token when it is about to expire. A connection that
 * fails leaves the session for the next try; a grant the server no longer
 * knows means the account was disconnected elsewhere, so the session goes.
 */
const renew = (
  deps: AccountDeps,
  session: StoredSession
): Promise<StoredSession | null> => {
  if (!needsRenewal(deps, session)) {
    return Promise.resolve(session);
  }

  const inFlight = refreshes.get(deps.store);

  if (inFlight) {
    return inFlight;
  }

  const refresh = renewLocked(deps).finally(() => {
    if (refreshes.get(deps.store) === refresh) {
      refreshes.delete(deps.store);
    }
  });
  refreshes.set(deps.store, refresh);

  return refresh;
};

const readSession = async (
  deps: AccountDeps
): Promise<StoredSession | null> => {
  const session = await deps.store.read();

  if (!session) {
    return null;
  }

  return renew(deps, session);
};

/**
 * The account as the popup and options show it, renewing the tokens first so
 * a session revoked on the site reads as signed out.
 */
export const getAccount = async (
  deps: AccountDeps = defaultAccountDeps()
): Promise<AccountState> => {
  const unavailable = blocked(deps);

  if (unavailable) {
    return unavailable;
  }

  const session = await readSession(deps);

  return session ? signedIn(session) : { status: 'signed-out' };
};

/**
 * Runs the interactive part of the sign-in and keeps what comes back: PKCE
 * codes, a state that ties the redirect to this request, then the exchange.
 * The browser's auth window is the only place the user types a password.
 */
export const signIn = async (
  deps: AccountDeps = defaultAccountDeps()
): Promise<AccountState> => {
  const unavailable = blocked(deps);

  if (unavailable?.status === 'unavailable') {
    throw new AccountError(
      unavailable.reason === 'unsupported' ? 'unavailable' : 'not-configured',
      `NoBadFonts sign-in is ${unavailable.reason}`
    );
  }

  const config = deps.config as AccountConfig;
  const verifier = createRandomString();
  const state = createRandomString();
  const responseUrl = await deps.launch(
    buildAuthorizeUrl({
      config,
      redirectUri: deps.redirectUri,
      state,
      codeChallenge: await createChallenge(verifier),
    })
  );

  let params: URLSearchParams;

  try {
    params = new URL(responseUrl).searchParams;
  } catch {
    throw new AccountError('exchange-failed', 'Unreadable sign-in redirect');
  }

  if (!cameBackTo(responseUrl, deps.redirectUri)) {
    throw new AccountError(
      'exchange-failed',
      'The sign-in returned to another address'
    );
  }

  if (params.get('state') !== state) {
    throw new AccountError(
      'state-mismatch',
      'The sign-in returned for another request'
    );
  }

  const error = params.get('error');

  if (error === 'access_denied') {
    throw new AccountError('denied', params.get('error_description') ?? error);
  }

  if (error) {
    throw new AccountError(
      'exchange-failed',
      params.get('error_description') ?? error
    );
  }

  const code = params.get('code');

  if (!code) {
    throw new AccountError('exchange-failed', 'The sign-in returned no code');
  }

  const session = toSession(
    await exchangeCode(config, {
      code,
      verifier,
      redirectUri: deps.redirectUri,
    }),
    deps.now()
  );
  const inFlight = refreshes.get(deps.store);

  // A refresh that started before this sign-in must not write its older
  // session over the one the sign-in just obtained.
  if (inFlight) {
    await inFlight.catch(() => undefined);
  }

  await deps.store.write(session);

  return signedIn(session);
};

/**
 * Ends the session in this browser. Revoking the extension's grant, which
 * ends it everywhere, is done from the site's connected apps page.
 */
export const signOut = async (
  deps: AccountDeps = defaultAccountDeps()
): Promise<void> => {
  // A refresh already on its way would otherwise write a session back after
  // the clear. Let it finish, then clear what it stored.
  const inFlight = refreshes.get(deps.store);

  if (inFlight) {
    await inFlight.catch(() => undefined);
  }

  await deps.store.clear();
};
