import { parse } from 'postcss';

import { getNoBadFontsFontFile } from '@stylebot/utils';
import type {
  NoBadFontsFontRow,
  NoBadFontsFontsResponse,
  NoBadFontsVariantRow,
  NoBadFontsVariantsResponse,
} from '@stylebot/types';

const SUPABASE_URL = 'https://wcegdxhvgwbeskaidlxr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZWdkeGh2Z3diZXNrYWlkbHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjI3OTQsImV4cCI6MjA4NTA5ODc5NH0.P_JY0RF6wVdPCDfWLlcor5l1CP3g4bLE5y4JWmZVOig';

const CACHE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

const FONT_FIELDS = [
  'id',
  'name',
  'slug',
  'designer',
  'category',
  'tags',
  'license_type',
  'commercial_use',
  'is_published',
  'family_role',
  'license:taxonomy->license',
].join(',');

const VARIANT_FIELDS = [
  'id',
  'font_id',
  'variant_name',
  'woff2_url',
  'woff_url',
  'order_index',
].join(',');

type Cached<T> = {
  at: number;
  promise: Promise<T>;
};

type Page<T> = {
  rows: Array<T>;
  count: number;
};

let catalogCache: Cached<NoBadFontsFontsResponse> | null = null;
let variantsCache: Cached<NoBadFontsVariantsResponse> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFontRow = (value: unknown): value is NoBadFontsFontRow =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.slug === 'string';

const isVariantRow = (value: unknown): value is NoBadFontsVariantRow =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.font_id === 'string' &&
  typeof value.variant_name === 'string';

const fetchPage = async <T>(
  url: string,
  isRow: (value: unknown) => value is T
): Promise<Page<T> | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return null;
    }

    return {
      rows: data.filter(isRow),
      count: data.length,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchAllRows = async <T>(
  urlForOffset: (offset: number) => string,
  isRow: (value: unknown) => value is T
): Promise<Array<T> | null> => {
  const rows: Array<T> = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPage(
      urlForOffset(page * PAGE_SIZE),
      isRow
    );

    if (!result) {
      return null;
    }

    rows.push(...result.rows);

    if (result.count < PAGE_SIZE) {
      return rows;
    }
  }

  return rows;
};

const catalogUrl = (offset: number): string => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/fonts`);

  url.searchParams.set('select', FONT_FIELDS);
  url.searchParams.set('is_published', 'eq.true');
  url.searchParams.set('order', 'name.asc,id.asc');
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));

  return url.toString();
};

const variantsUrl = (offset: number): string => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/font_variants`);

  url.searchParams.set('select', VARIANT_FIELDS);
  url.searchParams.set(
    'order',
    'font_id.asc,order_index.asc.nullsfirst,id.asc'
  );
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));

  return url.toString();
};

/**
 * Reads the published NoBadFonts catalog, remembering a successful response
 * for five minutes. A failed response is not cached.
 */
export const getNoBadFontsCatalog = (): Promise<NoBadFontsFontsResponse> => {
  const now = Date.now();

  if (catalogCache && now - catalogCache.at < CACHE_MS) {
    return catalogCache.promise;
  }

  const promise = fetchAllRows(catalogUrl, isFontRow);
  catalogCache = { at: now, promise };

  void promise.then(rows => {
    if (!rows && catalogCache?.promise === promise) {
      catalogCache = null;
    }
  });

  return promise;
};

/**
 * Reads every font's variants in one paginated request, remembering a
 * successful response for five minutes. A failed response is not cached.
 */
export const getNoBadFontsVariants = (): Promise<NoBadFontsVariantsResponse> => {
  const now = Date.now();

  if (variantsCache && now - variantsCache.at < CACHE_MS) {
    return variantsCache.promise;
  }

  const promise = fetchAllRows(variantsUrl, isVariantRow);
  variantsCache = { at: now, promise };

  void promise.then(rows => {
    if (!rows && variantsCache?.promise === promise) {
      variantsCache = null;
    }
  });

  return promise;
};

export const clearNoBadFontsCache = (): void => {
  catalogCache = null;
  variantsCache = null;
};

const MAX_CSS_LENGTH = 200_000;

const FONT_FACE_DESCRIPTORS = new Set([
  'font-family',
  'src',
  'font-weight',
  'font-style',
  'font-display',
  'unicode-range',
]);

const FONT_WEIGHT = /^(normal|bold|[1-9]00)(\s+[1-9]00)?$/;
const FONT_STYLE = /^(normal|italic|oblique(?:\s+-?\d+(?:deg|grad|rad|turn))?)$/;
const FONT_DISPLAY = /^(auto|block|swap|fallback|optional)$/;
const UNICODE_RANGE = /^[\sUu0-9A-Fa-f?,-]+$/;
const SRC =
  /^url\(\s*(['"]?)([^'")]+)\1\s*\)(?:\s+format\(\s*(['"]?)([\w-]+)\3\s*\))?$/i;

const hasUnsafeFamilyCharacter = (name: string): boolean =>
  Array.from(name).some(character => {
    const code = character.codePointAt(0) ?? 0;

    return (
      code < 0x20 ||
      code === 0x7f ||
      character === '"' ||
      character === "'" ||
      character === '\\' ||
      character === ',' ||
      character === ';' ||
      character === '{' ||
      character === '}'
    );
  });

const familyName = (value: string): string | null => {
  const text = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(text);
  const name = (quoted ? quoted[2] : text).trim();

  if (
    !name ||
    name.length > 120 ||
    hasUnsafeFamilyCharacter(name) ||
    name.includes('\n')
  ) {
    return null;
  }

  return `'${name}'`;
};

const weight = (value: string): string | null => {
  const text = value.trim().replace(/\s+/g, ' ');

  if (!FONT_WEIGHT.test(text)) {
    return null;
  }

  const [start, end] = text.split(' ');

  if (end && Number(start) >= Number(end)) {
    return null;
  }

  return text;
};

const src = (value: string): string | null => {
  const match = SRC.exec(value.trim());

  if (!match) {
    return null;
  }

  const file = getNoBadFontsFontFile(match[2]);
  const format = match[4]?.toLowerCase();

  if (!file || (format && !['woff2', 'woff'].includes(format))) {
    return null;
  }

  return `url('${file.url}') format('${file.format}')`;
};

const descriptorValue = (property: string, value: string): string | null => {
  switch (property) {
    case 'font-family':
      return familyName(value);
    case 'src':
      return src(value);
    case 'font-weight':
      return weight(value);
    case 'font-style': {
      const text = value.trim().toLowerCase();
      return FONT_STYLE.test(text) ? text : null;
    }
    case 'font-display': {
      const text = value.trim().toLowerCase();
      return FONT_DISPLAY.test(text) ? text : null;
    }
    case 'unicode-range': {
      const text = value.trim().replace(/\s+/g, ' ');
      return UNICODE_RANGE.test(text) ? text : null;
    }
    default:
      return null;
  }
};

/**
 * Keeps only the @font-face rules and descriptors NoBadFonts CSS uses, and
 * only src urls on its font-file hosts. Storage urls are rewritten to the
 * immutable proxy, and anything else is dropped rather than injected.
 */
export const sanitizeNoBadFontsCss = (css: string): string => {
  if (css.length > MAX_CSS_LENGTH) {
    return '';
  }

  let root;

  try {
    root = parse(css);
  } catch {
    return '';
  }

  root.each(node => {
    if (node.type !== 'atrule' || node.name.toLowerCase() !== 'font-face') {
      node.remove();
    }
  });

  root.walkAtRules('font-face', atRule => {
    atRule.each(node => {
      if (node.type !== 'decl') {
        node.remove();
      }
    });

    atRule.walkDecls(declaration => {
      const property = declaration.prop.toLowerCase();

      if (!FONT_FACE_DESCRIPTORS.has(property)) {
        declaration.remove();
        return;
      }

      const value = descriptorValue(property, declaration.value);

      if (value === null) {
        declaration.remove();
        return;
      }

      declaration.value = value;
    });

    const hasFamily = atRule.nodes?.some(
      node => node.type === 'decl' && node.prop === 'font-family'
    );
    const hasSrc = atRule.nodes?.some(
      node => node.type === 'decl' && node.prop === 'src'
    );

    if (!hasFamily || !hasSrc) {
      atRule.remove();
    }
  });

  return root.toString().trim();
};
