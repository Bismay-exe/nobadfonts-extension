import { getAccount, isAccountError, signIn, signOut } from '@stylebot/account';
import type {
  GetNoBadFontsAccountResponse,
  NoBadFontsAccountChanged,
  NoBadFontsSignInResponse,
  NoBadFontsSignOutResponse,
  StartNoBadFontsSignInResponse,
} from '@stylebot/types';

const AUTH_TAB_PATH = 'auth/index.html';

/**
 * Only the extension's own pages may touch the account. A content script's
 * sender.url is the page's URL, so a page can never read the session.
 */
export const isExtensionPage = (
  sender: chrome.runtime.MessageSender
): boolean =>
  sender.id === chrome.runtime.id &&
  Boolean(sender.url?.startsWith(chrome.runtime.getURL('')));

/**
 * The sign-in runs in its own tab: the popup closes as soon as the browser's
 * auth window takes focus, while a tab stays for the whole flow.
 */
export const sentFromAuthTab = (
  sender: chrome.runtime.MessageSender
): boolean => sender.url === chrome.runtime.getURL(AUTH_TAB_PATH);

const broadcastAccountChange = (): void => {
  const message: NoBadFontsAccountChanged = {
    name: 'NoBadFontsAccountChanged',
  };

  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
};

export const GetNoBadFontsAccount = async (
  sendResponse: (response: GetNoBadFontsAccountResponse) => void
): Promise<void> => {
  sendResponse(await getAccount());
};

/**
 * Opens the sign-in tab, or brings back the one already open.
 */
export const StartNoBadFontsSignIn = async (
  sendResponse: (response: StartNoBadFontsSignInResponse) => void
): Promise<void> => {
  const url = chrome.runtime.getURL(AUTH_TAB_PATH);

  try {
    const [existing] = await chrome.tabs.query({ url });

    if (existing?.id !== undefined) {
      await chrome.tabs.update(existing.id, { active: true });
      sendResponse({ opened: true });
      return;
    }

    await chrome.tabs.create({ url });
    sendResponse({ opened: true });
  } catch {
    sendResponse({ opened: false });
  }
};

/**
 * The sign-in tab's request to run the flow. Repeats are harmless: an account
 * already signed in answers with itself instead of a second auth window.
 */
export const NoBadFontsSignInReady = async (
  sendResponse: (response: NoBadFontsSignInResponse) => void
): Promise<void> => {
  try {
    const current = await getAccount();

    if (current.status === 'signed-in') {
      sendResponse({ ok: true, account: current });
      return;
    }

    const account = await signIn();
    broadcastAccountChange();
    sendResponse({ ok: true, account });
  } catch (error) {
    sendResponse({
      ok: false,
      error: isAccountError(error) ? error.code : 'exchange-failed',
    });
  }
};

/**
 * Ends the session in this browser only. The account's grant, which would end
 * every device's session, is revoked from the site's connected apps page.
 */
export const NoBadFontsSignOut = async (
  sendResponse: (response: NoBadFontsSignOutResponse) => void
): Promise<void> => {
  try {
    await signOut();
    broadcastAccountChange();
    sendResponse({ ok: true });
  } catch {
    sendResponse({ ok: false });
  }
};
