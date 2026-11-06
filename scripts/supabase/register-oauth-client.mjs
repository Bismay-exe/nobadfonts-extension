// Registers the extension's public OAuth client through Supabase's Admin API.
//
// This is a one-off release step, not part of a normal build. The dashboard's
// Authentication > OAuth Apps page does the same thing. Creating the client
// through SQL is not supported: Supabase Auth owns its schema and the Admin API
// validates the redirect URIs and client settings that a raw INSERT would skip.
//
// Usage:
//   $env:SUPABASE_SECRET_KEY="sb_secret_..."
//   node scripts/supabase/register-oauth-client.mjs
//
// Do not put SUPABASE_SECRET_KEY in the extension's .env files.

const DEFAULT_SUPABASE_URL = 'https://wcegdxhvgwbeskaidlxr.supabase.co';

const DEFAULT_REDIRECT_URIS = [
  // Local Chrome and Edge development build, from the development manifest key.
  'https://ccnipcpngemmggbkipemelphadkkkfgk.chromiumapp.org/',
  // Firefox add-on id nobadfonts@nobadfonts.in.
  'http://127.0.0.1/mozoauth2/9a30e7adef8fda1f39d1c414feb6315225c648d3',
];

const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(
  /\/+$/,
  ''
);
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!secretKey) {
  console.error(
    'Set SUPABASE_SECRET_KEY to a secret key from Supabase Dashboard > Project Settings > API keys.'
  );
  process.exit(1);
}

const redirectUris = (process.env.NOBADFONTS_REDIRECT_URIS || '')
  .split(/[\n,]/)
  .map(value => value.trim())
  .filter(Boolean);

const body = {
  name: 'NoBadFonts Extension',
  redirect_uris: redirectUris.length > 0 ? redirectUris : DEFAULT_REDIRECT_URIS,
  client_type: 'public',
  token_endpoint_auth_method: 'none',
};

const response = await fetch(`${supabaseUrl}/auth/v1/admin/oauth/clients`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const result = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(
    `Supabase rejected the client (${response.status}):`,
    result.message || result.error_description || result
  );
  process.exit(1);
}

console.log(`Created "${result.name}" (${result.client_id}).`);
console.log('Redirect URIs:');

for (const uri of result.redirect_uris || body.redirect_uris) {
  console.log(`  ${uri}`);
}

console.log('');
console.log('Now put this in nobadfonts-extension/.env.local:');
console.log(`  NOBADFONTS_OAUTH_CLIENT_ID=${result.client_id}`);
console.log('');
console.log(
  'And put this in the website .env.local, then rebuild/redeploy the site:'
);
console.log(`  NOBADFONTS_OAUTH_CLIENT_ID=${result.client_id}`);
