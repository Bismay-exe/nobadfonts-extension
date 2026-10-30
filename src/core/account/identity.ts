import { AccountError } from './errors';

/**
 * Whether the browser can run the interactive sign-in: Chrome and Edge open
 * an auth window and hand back the redirect, Firefox does the same on its
 * loopback address. Safari has no equivalent yet.
 */
export const isSignInSupported = (): boolean =>
  Boolean(chrome?.identity?.launchWebAuthFlow) &&
  Boolean(chrome?.identity?.getRedirectURL);

const isFirefox = (): boolean =>
  chrome.runtime.getURL('').startsWith('moz-extension:');

/**
 * The address the OAuth server sends the browser back to. Firefox hands back
 * the loopback form, which it intercepts before anything loads; Chrome uses
 * its own chromiumapp.org address.
 */
export const getRedirectUri = (): string => {
  const redirectUri = chrome.identity.getRedirectURL();

  if (!isFirefox()) {
    return redirectUri;
  }

  const [subdomain] = new URL(redirectUri).hostname.split('.');
  return `http://127.0.0.1/mozoauth2/${subdomain}`;
};

/**
 * Opens the OAuth server in the browser's auth window and resolves with the
 * address it redirects to. @types/chrome has no promise overload.
 */
export const launchWebAuthFlow = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { interactive: true, url },
      responseURL => {
        const lastError = chrome.runtime.lastError;

        if (lastError || !responseURL) {
          reject(
            new AccountError(
              'cancelled',
              lastError?.message ?? 'The sign-in window closed'
            )
          );
          return;
        }

        resolve(responseURL);
      }
    );
  });
