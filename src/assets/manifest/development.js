const SITE_BRIDGE_SCRIPT = 'site-bridge/index.js';

// stylebot-site's `yarn dev`, on whichever port is free.
const SITE_DEV_SERVER = 'http://localhost/*';

const runOnSiteDevServer = script => {
  if (!script.js.includes(SITE_BRIDGE_SCRIPT)) {
    return script;
  }

  return { ...script, matches: [...script.matches, SITE_DEV_SERVER] };
};

// A local Supabase, where a development build can test NoBadFonts sign-in.
const LOCAL_SUPABASE = 'http://127.0.0.1:54321/*';

/**
 * Extends a browser's manifest for development builds: the site's dev server
 * gets the stylebot.dev bridge, to try gallery installs locally, and a local
 * Supabase is reachable to try the account sign-in.
 */
module.exports = manifest => ({
  ...manifest,

  content_scripts: manifest.content_scripts.map(runOnSiteDevServer),

  host_permissions: [...manifest.host_permissions, LOCAL_SUPABASE],
});
