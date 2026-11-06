# NoBadFonts account

Signs a browser in to a NoBadFonts account, so features that need an identity (and, later, an entitlement) can ask for one. The site owns the identity: a person only ever types a password at `www.nobadfonts.in`, and the extension is a public OAuth client with no secret.

## Protocol

The identity provider is the NoBadFonts Supabase project, using its OAuth Server with an authorization code and PKCE (`S256`). The extension asks for `openid profile email`: the account only needs an id, an address and a name to show, and a refresh token comes back without `offline_access`, so the shorter scope keeps the consent screen honest.

The extension's OAuth client is registered as public (`token_endpoint_auth_method` `none`), so the token request carries the code, the verifier and `client_id` — never a secret. Dynamic client registration stays off: only the extension's own client may ask for a grant.

Supabase signs tokens with ES256. The project's published JWKS (`/auth/v1/.well-known/jwks.json`) carries a single P-256 key, `kid 3ccfc8a5-090a-4ba9-9923-66a9d02f7930`. The extension does not verify the ID token's signature itself: it receives the token directly from the token endpoint over TLS after the PKCE exchange, so the TLS channel, not a locally checked signature, is what ties the claims to the request.

## Sign-in

`StartNoBadFontsSignIn` opens `auth/index.html` in a tab, and that page sends `NoBadFontsSignInReady`, which is where the background runs the flow:

1. `chrome.identity.launchWebAuthFlow` opens the browser's auth window on the project's `/auth/v1/oauth/authorize`.
2. The site's consent page shows the account and the scopes, and approves or denies.
3. The browser returns to `https://<extension id>.chromiumapp.org/`, which `launchWebAuthFlow` reads.
4. The background checks `state`, exchanges the code for tokens, and broadcasts `NoBadFontsAccountChanged` so the popup and the options tab catch up.

It runs in a tab rather than the popup because the popup closes as soon as the auth window takes focus; a tab stays for the whole flow and reports its outcome. A second sign-in brings that tab forward instead of opening another one.

The auth tab is the only sender allowed to start or finish a sign-in, and `isExtensionPage` (sender id plus an extension URL) gates every account message, so a content script — whose sender URL is the page's — can never read the session.

## Tokens

The background keeps the session in the extension's own IndexedDB: access token, refresh token, expiry, granted scope, and the account from the ID token's claims. It is not `chrome.storage.local`, which content scripts can read; the background's IndexedDB is not reachable from a content script or a page.

`getAccount` renews a token a minute before it expires and stores the rotated refresh token. Only an `invalid_grant` reply clears the session, which is how a grant revoked on the site ends a session here. A network failure is retried once immediately: a lost reply may have rotated the refresh token already, and Supabase reuses a rotated token for a short window. A 5xx, a malformed reply or any other OAuth error leaves the session in place and tries again on the next read.

Refreshes are serialized per session store. Callers that arrive while one is running share its result, and the refresh re-reads the stored session under the lock before spending the refresh token. Sign-in and sign-out wait for a refresh already in flight, so a late reply cannot write a session back after sign-out or over a newer sign-in.

The popup and the options tab only ever ask the background for the account state; they never see a token.

## Signing out

`NoBadFontsSignOut` clears this browser's session and nothing else. Disconnecting the extension everywhere is a grant revocation on the site's `/settings/connected-apps` page, which both pages link to.

Revocation takes effect at the next refresh. An access token already issued stays valid until its `exp` — one hour by default — so the extension can keep reporting a signed-in account for up to that long after the grant is revoked.

Website sign-out used to be global; it now uses `scope: 'local'` so signing out of the site does not end the extension's session, and the two can be used independently.

## Entitlements

None are read or enforced yet. The design, for when premium lands: a table keyed by the authenticated user id, written only by the service role, read through RLS by the same Supabase project. The extension would ask the background, and the background would ask Supabase with the account's access token — the same shape as the catalog read, no extra credential in the extension. Billing, plan changes and any migration stay out of this repository until then.

## Browsers

Chrome, Edge and Firefox sign in. Chrome and Edge use the built extension's `chromiumapp.org` address; Firefox uses the `mzoauth2` loopback address derived from the add-on id. Each has to be registered on the client before release.

- Firefox add-on id: `nobadfonts@nobadfonts.in`
- Firefox redirect: `http://127.0.0.1/mozoauth2/9a30e7adef8fda1f39d1c414feb6315225c648d3`
- Local Chrome and Edge build id: `ccnipcpngemmggbkipemelphadkkkfgk`
- Local Chrome and Edge redirect: `https://ccnipcpngemmggbkipemelphadkkkfgk.chromiumapp.org/`

The Chromium id comes from the temporary development key in `manifest-dev.json` and `manifest-edge-dev.json`. It is for local development only; each store listing's own id and key replace it before release. Safari is deferred: its wrapper has no supported auth window here, so the popup and the options tab report that sign-in is unavailable rather than failing.

## Configuration

The build reads `.env.local`, then `.env`, from the extension folder. Shell variables win over both. See `scripts/supabase/README.md` for registering the client; creating one through SQL is not supported.

- `NOBADFONTS_OAUTH_CLIENT_ID` — read at build time, with no default, so a build that was not registered shows the clean "isn't set up" state instead of a broken flow. A production build outside CI fails when it is missing or not a UUID.
- `NOBADFONTS_SUPABASE_URL`, `NOBADFONTS_SUPABASE_ANON_KEY` — development-build overrides only, for a local Supabase. Release builds use the production project, which `src/core/account/config.ts` carries as fallbacks.

A development build adds `http://127.0.0.1:54321/*` to its host permissions for that local project.

Registering the production client, its redirect URIs and the OAuth Server settings in the production project are release steps that need approval; until then only local clients exist.
