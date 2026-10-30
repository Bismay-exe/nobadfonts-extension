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

/**
 * Renews the access token when it is about to expire. A connection that
 * fails leaves the session for the next try; a grant the server no longer
 * knows means the account was disconnected elsewhere, so the session goes.
 */
const renew = async (
  deps: AccountDeps,
  session: StoredSession
): Promise<StoredSession | null> => {
  if (session.expiresAt - deps.now() > REFRESH_BEFORE_MS) {
    return session;
  }

  if (!session.refreshToken) {
    await deps.store.clear();
    return null;
  }

  try {
    const tokens = await refreshSession(
      deps.config as AccountConfig,
      session.refreshToken
    );

    return renewSession(session, tokens, deps.now());
  } catch (error) {
    if (isAccountError(error) && error.code === 'network') {
      return session;
    }

    await deps.store.clear();
    return null;
  }
};

const readSession = async (
  deps: AccountDeps
): Promise<StoredSession | null> => {
  const session = await deps.store.read();

  if (!session) {
    return null;
  }

  const renewed = await renew(deps, session);

  if (renewed && renewed !== session) {
    await deps.store.write(renewed);
  }

  return renewed;
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
  await deps.store.clear();
};
