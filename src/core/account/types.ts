// The NoBadFonts account the extension signs in as, as the UI shows it.
export type AccountUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

// What the background keeps for a signed-in account. Only the background
// reads it: tokens never reach a content script or a page.
export type StoredSession = {
  accessToken: string;
  refreshToken?: string;
  // When the access token stops working, in epoch milliseconds.
  expiresAt: number;
  scope: string;
  user: AccountUser;
};

export type AccountState =
  | { status: 'signed-in'; user: AccountUser; expiresAt: number }
  | { status: 'signed-out' }
  | { status: 'unavailable'; reason: 'unsupported' | 'not-configured' };

export type SessionStore = {
  read: () => Promise<StoredSession | null>;
  write: (session: StoredSession) => Promise<void>;
  clear: () => Promise<void>;
};
