# Connect the extension to NoBadFonts accounts

This folder is for the one-time Supabase setup that turns on **Sign in** in the
extension.

## There is no SQL migration for this

Supabase's OAuth server keeps its own tables inside the `auth` schema. The
supported way to add a client is the dashboard or the Auth Admin API, not an
`INSERT` from the SQL editor. A raw insert into `auth.*` is unsupported and can
leave the client unusable.

That is why this folder contains a dashboard guide and an optional Admin API
script, not a `.sql` file.

## What you need to do

You need **one public OAuth client**. A public client has a client id but no
secret, which is correct for a browser extension: a secret shipped in an
extension is not secret.

### 1. Open the OAuth Apps page

In the Supabase dashboard for the NoBadFonts project:

**Authentication → OAuth Apps → Add a new client**

You can also open:

`https://supabase.com/dashboard/project/wcegdxhvgwbeskaidlxr/auth/oauth-apps`

### 2. Fill in the client

- **Client name:** `NoBadFonts Extension`
- **Client type:** `Public`
- **Redirect URIs:** add the ones you need, exactly as written:

Local Chrome / Edge development build:

```
https://ccnipcpngemmggbkipemelphadkkkfgk.chromiumapp.org/
```

Firefox add-on `nobadfonts@nobadfonts.in`:

```
http://127.0.0.1/mozoauth2/9a30e7adef8fda1f39d1c414feb6315225c648d3
```

After the Chrome Web Store listing exists, add its own redirect URI:

```
https://<chrome-extension-id>.chromiumapp.org/
```

After the Edge Add-ons listing exists, add its own redirect URI:

```
https://<edge-extension-id>.chromiumapp.org/
```

Redirect URIs must match exactly. No wildcards, trailing slashes, or ports that
were not registered.

### 3. Copy the client id

After **Create**, Supabase shows a **Client ID** (a UUID). Copy it.

There is no client secret for a public client. If the dashboard offers one, you
picked `Confidential`; delete that client and create a public one instead.

### 4. Put the id in two places

Extension — edit `nobadfonts-extension/.env.local`:

```dotenv
NOBADFONTS_OAUTH_CLIENT_ID=00000000-0000-4000-8000-000000000000
```

Homepage — edit the website `.env.local`:

```dotenv
NOBADFONTS_OAUTH_CLIENT_ID=00000000-0000-4000-8000-000000000000
```

Both must be the **same** UUID. The homepage consent page refuses any client it
does not recognise. If the website is already deployed, rebuild and redeploy it
with this variable set; changing only the extension is not enough.

### 5. Build and load the extension

```powershell
cd nobadfonts-extension
npm run watch
```

In another terminal:

```powershell
npm run start:chrome
```

The development build is the one that has the fixed local extension id
`ccnipcpngemmggbkipemelphadkkkfgk`. A production `npm run build` loaded by hand
gets a different id, so its redirect will not match the one registered above.

### 6. Sign in

Open the extension popup. The row at the bottom now says **Sign in**. The
options page also has an **Account** tab with the same button.

Clicking it opens a NoBadFonts sign-in tab, then the browser's OAuth window. You
sign in on `www.nobadfonts.in`, approve the consent screen, and the popup
switches to your email address.

## Optional: register with the Admin API

If you prefer a terminal over the dashboard, use a **secret key** from
**Project Settings → API keys**:

```powershell
$env:SUPABASE_SECRET_KEY="sb_secret_..."
node scripts/supabase/register-oauth-client.mjs
```

To register extra redirect URIs, separate them with commas:

```powershell
$env:NOBADFONTS_REDIRECT_URIS="https://ccnipcpngemmggbkipemelphadkkkfgk.chromiumapp.org/,http://127.0.0.1/mozoauth2/9a30e7adef8fda1f39d1c414feb6315225c648d3,https://<store-id>.chromiumapp.org/"
node scripts/supabase/register-oauth-client.mjs
```

The script prints the client id and the two env lines to copy. It does not write
files and does not need the extension's `.env`.

## What not to put in the extension's env file

- **No service-role key.** It bypasses Row Level Security and must never be in a
  build users can inspect.
- **No client secret.** Public clients do not have one.
- The anon key is public and safe to ship; RLS is what protects data.
