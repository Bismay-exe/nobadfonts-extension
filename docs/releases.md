# Releases

Releases go through a pull request from a `release/vX.Y.Z` branch — the `release/` prefix is what triggers the Edge e2e suite, which doesn't run on ordinary PRs.

Pull requests target `main`, and the release workflow only runs on pull requests into it.

- Branch off `main` as `release/vX.Y.Z`
- Add entry to `CHANGELOG`
- Update version in `package.json` and `src/assets/manifest/manifest.json`
- A unit test fails if a release manifest's required permissions, hosts or content script matches change, since a new install warning disables NoBadFonts for existing users until they re-approve it. Before publishing, also check the update with Chrome's [Extension Update Testing Tool](https://github.com/GoogleChromeLabs/extension-update-testing-tool)
- Open the PR and wait for `build`, `validation`, `storybook`, `e2e`, `e2e (edge)` and `e2e (firefox)` to pass
- Squash-merge — the GitHub Release and its `vX.Y.Z` tag are then created automatically from the changelog entry
- Build for the stores from that tag: `git fetch origin --tags && git checkout vX.Y.Z`. Packaging and uploading refuse to run anywhere else, and every production build starts from an empty output folder
- Set `NOBADFONTS_OAUTH_CLIENT_ID` to the extension's registered public OAuth client UUID — the account needs it, and a production build outside CI fails without it
- Without a local `zip`, run the `package` workflow from Actions (`ref` = the release tag). It builds on Ubuntu and uploads `nobadfonts-<version>-<commit>.zip` for Chrome and Edge plus the Firefox extension and source zips as a workflow artifact
- Chrome and Edge: Run `yarn build` and manually create zip for distribution from `dist/`
- Firefox: Run `yarn package:firefox` from a clean working tree. It stops if a JavaScript file is too large for AMO's linter to parse, and otherwise builds the extension and writes the extension zip and the source zip AMO asks for, with build steps for reviewers, to `release/`
- To upload instead of zipping by hand, run each store's command from a clean working tree. Each builds what it uploads and publishes nothing; Chrome and Edge share one zip per commit in `release/`, so the second reuses the first's
  - `yarn upload:chrome` uploads a draft of the next version to the Chrome Web Store; publish it from the Developer Dashboard. Needs `CHROME_WEB_STORE_PUBLISHER_ID` (Publisher > Settings in the dashboard), `CHROME_WEB_STORE_ITEM_ID` (the listing's id), and the OAuth client and refresh token of the account that owns the item, with the `chromewebstore` scope, as `CHROME_WEB_STORE_CLIENT_ID`, `CHROME_WEB_STORE_CLIENT_SECRET` and `CHROME_WEB_STORE_REFRESH_TOKEN`
  - `yarn upload:edge` replaces the package in the Edge Add-ons draft submission; publish it from Partner Center. Needs `EDGE_ADDONS_PRODUCT_ID`, `EDGE_ADDONS_CLIENT_ID` and `EDGE_ADDONS_API_KEY`, from Partner Center's Publish API page
  - `yarn upload:firefox` only validates the upload, since AMO has no drafts. `--submit` creates the version from it instead, with the source zip and the changelog's notes, which submits it for review. Needs `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`, from AMO's API keys page
- Chrome, Edge and Firefox listing copy is in `store/listing.md`, kept in sync with the locale store strings and `yarn store:safari-text`
- Safari (Mac App Store, macOS 15 and later):
  - Run `yarn upload:safari`, with `NOBADFONTS_OAUTH_CLIENT_ID` set. It builds the extension, archives the app and uploads it to App Store Connect, signing with the Apple account signed in to Xcode, or with an App Store Connect API key when `APP_STORE_CONNECT_KEY_PATH`, `APP_STORE_CONNECT_KEY_ID` and `APP_STORE_CONNECT_ISSUER_ID` are set
  - The app and extension take their version from the manifest and a build number from the build's time, so there's nothing to bump in Xcode, and a rebuilt upload of the same version is accepted as a new build
  - For the listing, `yarn store:safari-text` writes each language's name, subtitle, keywords and description, from the store copy in the locale files, into `store/safari/listing/`. Then `yarn upload:safari-listing`, with the API key set, fills in the version being prepared in App Store Connect: its version number, each language's listing, the screenshots in `store/safari/` and the newest processed build of that version. App Privacy, the age rating, pricing and the review notes are set in App Store Connect itself
  - In App Store Connect, try the build through TestFlight, then submit the version for review. Before installing it, quit Safari and run `yarn clean:safari`, which unregisters every other copy of the app so Safari loads only the TestFlight one

## New extension identity

NoBadFonts 1.0 uses its own identities, not Stylebot's:

- Firefox uses `nobadfonts@nobadfonts.in`, which gives the redirect `http://127.0.0.1/mozoauth2/9a30e7adef8fda1f39d1c414feb6315225c648d3`.
- Chrome and Edge local builds use the temporary development key in `manifest-dev.json` and `manifest-edge-dev.json`. It gives the id `ccnipcpngemmggbkipemelphadkkkfgk` and the redirect `https://ccnipcpngemmggbkipemelphadkkkfgk.chromiumapp.org/`. It is not a production signing key.

For a new Chrome or Edge listing, upload a release build, which carries no `key` (the release manifest test enforces this). Then copy the store's item id and public key into the upload environment and the matching development key file, and register `https://<store-id>.chromiumapp.org/` on the OAuth client. Edge's Partner Center product id is a GUID, separate from the public CRX id used in the redirect.
