export const NO_BAD_FONTS_HOST = 'www.nobadfonts.in';

// Where the site shows which apps can reach an account, and revokes them.
export const NO_BAD_FONTS_CONNECTED_APPS_URL = `https://${NO_BAD_FONTS_HOST}/settings/connected-apps`;

const NO_BAD_FONTS_SUPABASE_HOST = 'wcegdxhvgwbeskaidlxr.supabase.co';

const WEIGHT = /^[1-9]00$/;
const FONT_FILE_PATH = /^\/font-file\/(.+\.(woff2|woff))$/i;
const STORAGE_FONT_PATH =
  /^\/storage\/v1\/object\/public\/fonts\/(.+\.(woff2|woff))$/i;

export type NoBadFontsFontFile = {
  url: string;
  format: 'woff2' | 'woff';
};

const parseHttpsUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

/**
 * Whether the url is the site's own NoBadFonts host, whatever its path.
 */
export const isNoBadFontsHostUrl = (value: string): boolean =>
  parseHttpsUrl(value)?.hostname === NO_BAD_FONTS_HOST;

/**
 * Whether the url is one of the CSS endpoints the old picker wrote: a font
 * slug, with either a variable flag or a comma-separated list of weights.
 */
export const isNoBadFontsCssUrl = (value: string): boolean => {
  const url = parseHttpsUrl(value);

  if (url?.hostname !== NO_BAD_FONTS_HOST) {
    return false;
  }

  if (!/^\/css\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) {
    return false;
  }

  if (Array.from(url.searchParams.keys()).length !== 1) {
    return false;
  }

  if (url.searchParams.has('variable')) {
    return url.searchParams.get('variable') === 'true';
  }

  const weights = url.searchParams.get('weights');

  if (!weights) {
    return false;
  }

  const list = weights.split(',');

  return (
    list.length > 0 &&
    list.every(weight => WEIGHT.test(weight)) &&
    new Set(list).size === list.length
  );
};

/**
 * Resolves a font file url to the immutable /font-file/ proxy, whichever host
 * it originally came from. Returns null for anything NoBadFonts doesn't serve
 * as a WOFF or WOFF2 file.
 */
export const getNoBadFontsFontFile = (
  value: string | null | undefined
): NoBadFontsFontFile | null => {
  if (!value) {
    return null;
  }

  const url = parseHttpsUrl(value);

  if (!url || url.search) {
    return null;
  }

  if (url.hostname === NO_BAD_FONTS_HOST) {
    const match = FONT_FILE_PATH.exec(url.pathname);

    return match
      ? { url: url.toString(), format: match[2].toLowerCase() as 'woff2' | 'woff' }
      : null;
  }

  if (url.hostname === NO_BAD_FONTS_SUPABASE_HOST) {
    const match = STORAGE_FONT_PATH.exec(url.pathname);

    return match
      ? {
          url: `https://${NO_BAD_FONTS_HOST}/font-file/${match[1]}`,
          format: match[2].toLowerCase() as 'woff2' | 'woff',
        }
      : null;
  }

  return null;
};

/**
 * Whether the url is a font file NoBadFonts serves, either through its
 * /font-file/ proxy or from the public Supabase storage bucket.
 */
export const isNoBadFontsFontFileUrl = (value: string): boolean =>
  getNoBadFontsFontFile(value) !== null;

/**
 * Whether the url is a font file Stylebot may fetch through the background,
 * for a page whose CSP blocks the browser's own request.
 */
export const isAllowedWebFontFileUrl = (value: string): boolean => {
  if (isNoBadFontsFontFileUrl(value)) {
    return true;
  }

  return parseHttpsUrl(value)?.hostname === 'fonts.gstatic.com';
};

const WEB_FONT_FILE_URL =
  /https:\/\/(?:fonts\.gstatic\.com\/|www\.nobadfonts\.in\/font-file\/|wcegdxhvgwbeskaidlxr\.supabase\.co\/storage\/v1\/object\/public\/fonts\/)[^"')\s,]+/g;

/**
 * The font file urls the css loads, from either web font provider.
 */
export const getWebFontFileUrls = (css: string): Array<string> => {
  const urls = (css.match(WEB_FONT_FILE_URL) ?? []).filter(
    isAllowedWebFontFileUrl
  );

  return Array.from(new Set(urls));
};
