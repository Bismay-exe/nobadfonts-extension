export type AccountConfig = {
  supabaseUrl: string;
  // Public by design, like the one the site ships: row-level security, not
  // the key, decides what a request may read.
  anonKey: string;
  clientId: string;
  scopes: Array<string>;
};

// The project the site and the extension share.
const FALLBACK_SUPABASE_URL = 'https://wcegdxhvgwbeskaidlxr.supabase.co';

const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZWdkeGh2Z3diZXNrYWlkbHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjI3OTQsImV4cCI6MjA4NTA5ODc5NH0.P_JY0RF6wVdPCDfWLlcor5l1CP3g4bLE5y4JWmZVOig';

const SCOPES = ['openid', 'profile', 'email'];

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

/**
 * Where the account signs in, from the build's own configuration so a local
 * build can point at a local Supabase. Null when the build has no OAuth
 * client, which production has yet to register.
 */
export const getAccountConfig = (): AccountConfig | null => {
  const clientId = (process.env.NOBADFONTS_OAUTH_CLIENT_ID ?? '').trim();

  if (!clientId) {
    return null;
  }

  return {
    supabaseUrl: trimTrailingSlashes(
      process.env.NOBADFONTS_SUPABASE_URL || FALLBACK_SUPABASE_URL
    ),
    anonKey: process.env.NOBADFONTS_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY,
    clientId,
    scopes: SCOPES,
  };
};
