// A local Supabase, where a development build can test NoBadFonts sign-in.
const LOCAL_SUPABASE = 'http://127.0.0.1:54321/*';

/**
 * Extends a browser's manifest for development builds, making a local
 * Supabase reachable to try the account sign-in.
 */
module.exports = manifest => ({
  ...manifest,

  host_permissions: [...manifest.host_permissions, LOCAL_SUPABASE],
});
