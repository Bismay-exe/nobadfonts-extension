# Store listing copy

Paste-ready text for the Chrome Web Store, Edge Add-ons and Firefox AMO
listings. The locale files are the source of truth: the full description is
`@store_listing`, the short description is `@extension_description`, and the
App Store subtitle and keywords are `@app_store_subtitle` and
`@app_store_keywords` in `src/assets/_locales/en_US.config`.
`yarn store:safari-text` writes the Mac App Store version from them, so update
this file and the locale together.

## Shared fields

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Name              | NoBadFonts                                                |
| Short description | Change any website's fonts and CSS.                       |
| Homepage          | https://www.nobadfonts.in/                                |
| Privacy policy    | https://www.nobadfonts.in/legal/privacy                   |
| Support           | https://github.com/Bismay-exe/nobadfonts-extension/issues |
| Support email     | nobadfonts@gmail.com                                      |
| Category          | Choose in the store dashboard                             |

## Full description

NoBadFonts changes how any website looks, starting with its fonts.

- Font library: browse licensed typefaces and apply them to any element
- Pick and style: click an element and change its font, colors, spacing and more
- Code editor: write any CSS by hand
- Profiles: keep several looks for a site and switch between them
- Version history: every change is kept, so you can restore any earlier version
- Readability: turn articles into a clean, distraction-free reading view
- Backup: export and import your styles as JSON

Free and open source. We don't track what you browse.

Homepage: https://www.nobadfonts.in/
Privacy: https://www.nobadfonts.in/legal/privacy
Bug reports and feature requests: https://github.com/Bismay-exe/nobadfonts-extension/issues

## Keywords

```
css,dark mode,theme,fonts,readability,reader,userstyle,design,editor,clutter,colors,layout
```

## Chrome Web Store

- Short description must fit 132 characters; the shared one does.
- Screenshots: `store/screenshots/*.png` (1280×800, at least one, up to five).
- Small promo tile: `store/chrome/small_promo.png` (440×280).
- Marquee promo tile: `store/chrome/marquee_promo.png` (1400×560).

## Edge Add-ons

- Screenshots: `store/screenshots/*.png` (1280×800).
- Small promo tile: `store/edge/small-promo.png` (440×280).
- Large promo tile: `store/edge/large-promo.png` (1400×560).
- Logo: `store/edge/logo.png` (300×300).

## Firefox AMO

- Add-on ID: `nobadfonts@nobadfonts.in`
- Screenshots: `store/screenshots/*.png` (1280×800).
- `yarn package:firefox` writes the extension zip, the source zip and the
  reviewer build steps to `release/`.

## IDs to record after the listings exist

Set these in the upload environment described in `docs/releases.md`; never
commit a secret.

| Store   | Values                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome  | `CHROME_WEB_STORE_PUBLISHER_ID`, `CHROME_WEB_STORE_ITEM_ID`, the listing's public key for `manifest-dev.json`                               |
| Edge    | `EDGE_ADDONS_PRODUCT_ID` (Partner Center GUID), `EDGE_ADDONS_CLIENT_ID`, `EDGE_ADDONS_API_KEY`, the public key for `manifest-edge-dev.json` |
| Firefox | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` (add-on ID is already fixed)                                                                             |

The Chrome and Edge public keys give the production extension IDs and their
`https://<store-id>.chromiumapp.org/` redirect URIs. Register both redirect
URIs on the same Supabase OAuth client, next to the development and Firefox
ones. Record the final review pages as `NOBADFONTS_CHROME_REVIEW_URL`,
`NOBADFONTS_EDGE_REVIEW_URL` and `NOBADFONTS_FIREFOX_REVIEW_URL` so the rating
prompt links straight to the listing instead of the store search.
