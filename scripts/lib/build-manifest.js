const fs = require('fs');
const path = require('path');

const MANIFEST_DIR = path.resolve(__dirname, '../../src/assets/manifest');

// Chrome and Edge share one build, which runs with no BROWSER set.
const CHROME = 'chrome';

// Each store's public key, by STYLEBOT_STORE (unset for the Chrome Web Store).
// Both currently hold the temporary NoBadFonts development key: it fixes the
// local extension id, and therefore the OAuth redirect, before either listing
// exists. Replace each with its store's key after the first upload.
const STORE_KEY_FILES = {
  chrome: 'manifest-dev.json',
  edge: 'manifest-edge-dev.json',
};

const readManifest = name =>
  JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, name)));

/**
 * Loads one of the manifest modules. Watch builds rebuild the manifest after
 * an edit, so they're loaded fresh each time.
 */
const loadManifestModule = name => {
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(MANIFEST_DIR)) {
      delete require.cache[file];
    }
  }

  return require(path.join(MANIFEST_DIR, `${name}.js`));
};

/**
 * Builds the extension manifest for a browser (undefined for Chrome and Edge,
 * which share one build). Chrome's development and preview builds also get the
 * store's public key, for the store id Drive sign-in needs; the stores reject
 * an upload with a key.
 */
const buildManifest = ({ browser, nodeEnv, preview, store }) => {
  const isDevelopment = nodeEnv === 'development';
  let manifest = loadManifestModule(browser ?? CHROME);

  if (browser === undefined && (isDevelopment || preview)) {
    const storeKey = readManifest(STORE_KEY_FILES[store ?? CHROME]);
    manifest = { ...manifest, ...storeKey };
  }

  if (isDevelopment) {
    const extendForDevelopment = loadManifestModule('development');
    manifest = extendForDevelopment(manifest);
  }

  return manifest;
};

module.exports = { buildManifest };
