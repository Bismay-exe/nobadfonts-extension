import type {
  GetNoBadFontsCatalog,
  GetNoBadFontsCatalogResponse,
  NoBadFontsFontRow,
  NoBadFontsLicense,
} from '@stylebot/types';

import { NoBadFontsRequestError } from './errors';

export type NoBadFontsLicenseStatus = 'allowed' | 'unverified' | 'restricted';

export type NoBadFontsFont = {
  id: string;
  name: string;
  slug: string;
  designer: string | null;
  category: string | null;
  tags: Array<string>;
  license: {
    type: string | null;
    redistribution: NoBadFontsLicenseStatus;
    commercialUse: boolean | null;
    url: string | null;
  };
};

const redistributionStatus = (
  value: boolean | null | undefined
): NoBadFontsLicenseStatus => {
  if (value === true) {
    return 'allowed';
  }

  return value === false ? 'restricted' : 'unverified';
};

const FONT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const hasUnsafeName = (name: string): boolean =>
  Array.from(name).some(character => {
    const code = character.codePointAt(0) ?? 0;

    return (
      code < 0x20 || code === 0x7f || character === '"' || character === '\\'
    );
  });

let catalogRequest: Promise<Array<NoBadFontsFont>> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const trimmed = (value: string | null | undefined): string | null => {
  const text = value?.trim();
  return text || null;
};

const licenseOf = (row: NoBadFontsFontRow): NoBadFontsLicense | null => {
  if (Array.isArray(row.license)) {
    return row.license[0] ?? null;
  }

  return isRecord(row.license) ? row.license : null;
};

const licenseUrl = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const tagsOf = (row: NoBadFontsFontRow): Array<string> => {
  if (!Array.isArray(row.tags)) {
    return [];
  }

  return Array.from(
    new Set(
      row.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map(tag => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
};

/**
 * Keeps published fonts whose family is not a parent, and whose names and
 * slugs are safe to show and interpolate into CSS. Explicitly restricted
 * fonts stay visible so the picker can explain why they can't be applied.
 */
export const normalizeCatalog = (
  rows: ReadonlyArray<NoBadFontsFontRow>
): Array<NoBadFontsFont> => {
  const seen = new Set<string>();
  const fonts: Array<NoBadFontsFont> = [];

  rows.forEach(row => {
    if (
      row.is_published !== true ||
      row.family_role === 'parent' ||
      !FONT_ID.test(row.id) ||
      !SLUG.test(row.slug)
    ) {
      return;
    }

    const name = row.name.trim();

    if (!name || name.length > 120 || hasUnsafeName(name)) {
      return;
    }

    if (seen.has(row.slug)) {
      return;
    }

    const license = licenseOf(row);
    const redistribution = license?.redistribution_allowed;

    seen.add(row.slug);

    fonts.push({
      id: row.id,
      name,
      slug: row.slug,
      designer: trimmed(row.designer),
      category: trimmed(row.category),
      tags: tagsOf(row),
      license: {
        type: trimmed(license?.license_type) ?? trimmed(row.license_type),
        redistribution: redistributionStatus(redistribution),
        commercialUse: license?.commercial_use ?? row.commercial_use ?? null,
        url: licenseUrl(license?.license_url),
      },
    });
  });

  return fonts.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const requestCatalog = async (): Promise<Array<NoBadFontsFont>> => {
  const message: GetNoBadFontsCatalog = { name: 'GetNoBadFontsCatalog' };
  const rows = await chrome.runtime
    .sendMessage<GetNoBadFontsCatalog, GetNoBadFontsCatalogResponse>(message)
    .catch(() => null);

  if (!rows) {
    throw new NoBadFontsRequestError();
  }

  return normalizeCatalog(rows);
};

/**
 * Loads the visible catalog once, reusing the request while it is in flight
 * or resolved. A failed request is dropped so Retry starts a new one.
 */
export const loadCatalog = (): Promise<Array<NoBadFontsFont>> => {
  if (!catalogRequest) {
    catalogRequest = requestCatalog().catch(error => {
      catalogRequest = null;
      throw error;
    });
  }

  return catalogRequest;
};

export const clearCatalogCache = (): void => {
  catalogRequest = null;
};

/**
 * Filters the catalog by family name, designer, category, or tag.
 */
export const searchCatalog = (
  fonts: ReadonlyArray<NoBadFontsFont>,
  query: string,
  category = ''
): Array<NoBadFontsFont> => {
  const term = query.trim().toLowerCase();

  return fonts.filter(font => {
    if (category && font.category !== category) {
      return false;
    }

    if (!term) {
      return true;
    }

    return [
      font.name,
      font.designer ?? '',
      font.category ?? '',
      ...font.tags,
    ].some(value => value.toLowerCase().includes(term));
  });
};

export const getCatalogCategories = (
  fonts: ReadonlyArray<NoBadFontsFont>
): Array<string> =>
  Array.from(
    new Set(
      fonts
        .map(font => font.category)
        .filter((category): category is string => !!category)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const fontPageUrl = (font: Pick<NoBadFontsFont, 'slug'>): string =>
  `https://www.nobadfonts.in/fonts/${font.slug}`;
