export const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * A URL-safe random string, for the PKCE verifier and the state that ties the
 * redirect back to the request.
 */
export const createRandomString = (): string =>
  base64Url(crypto.getRandomValues(new Uint8Array(32)));

/**
 * The S256 PKCE challenge for a verifier.
 */
export const createChallenge = async (verifier: string): Promise<string> =>
  base64Url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    )
  );
