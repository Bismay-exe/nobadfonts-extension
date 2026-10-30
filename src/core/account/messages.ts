import type {
  GetNoBadFontsAccount,
  GetNoBadFontsAccountResponse,
  NoBadFontsSignOut,
  NoBadFontsSignOutResponse,
  StartNoBadFontsSignIn,
  StartNoBadFontsSignInResponse,
} from '@stylebot/types';
import { NO_BAD_FONTS_CONNECTED_APPS_URL } from '@stylebot/utils';

/**
 * What the background reports for the account in this browser. Only the
 * extension's own pages can ask; a content script's request is refused.
 */
export const requestAccountState = (): Promise<
  GetNoBadFontsAccountResponse | undefined
> =>
  chrome.runtime.sendMessage<
    GetNoBadFontsAccount,
    GetNoBadFontsAccountResponse
  >({ name: 'GetNoBadFontsAccount' });

/**
 * Opens the tab that runs the sign-in, which stays put while the browser's
 * auth window has focus. False when the browser would not open it.
 */
export const requestSignIn = async (): Promise<boolean> => {
  const response = await chrome.runtime.sendMessage<
    StartNoBadFontsSignIn,
    StartNoBadFontsSignInResponse
  >({ name: 'StartNoBadFontsSignIn' });

  return response?.opened ?? false;
};

/**
 * Ends the session in this browser. The account's grant, which would end
 * every device's session, is revoked on the site instead.
 */
export const requestSignOut = async (): Promise<boolean> => {
  const response = await chrome.runtime.sendMessage<
    NoBadFontsSignOut,
    NoBadFontsSignOutResponse
  >({ name: 'NoBadFontsSignOut' });

  return response?.ok ?? false;
};

/**
 * Opens the site's page that lists the apps with access to an account, where
 * the extension's grant can be revoked.
 */
export const openConnectedAppsPage = (): void => {
  chrome.tabs.create({ url: NO_BAD_FONTS_CONNECTED_APPS_URL });
};
