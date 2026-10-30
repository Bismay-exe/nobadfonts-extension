import type { NoBadFontsFontRow, NoBadFontsLicense } from '@stylebot/types';

import { CATALOG_ROWS } from './catalog.fixtures';
import {
  clearCatalogCache,
  fontPageUrl,
  getCatalogCategories,
  loadCatalog,
  normalizeCatalog,
  searchCatalog,
} from './catalog';

const sendMessage = jest.fn();

beforeEach(() => {
  clearCatalogCache();
  sendMessage.mockReset();

  global.chrome = {
    runtime: { sendMessage },
  } as unknown as typeof chrome;
});

describe('normalizeCatalog', () => {
  it('keeps every published non-parent font, restricted ones included', () => {
    const fonts = normalizeCatalog(CATALOG_ROWS);

    expect(fonts.map(font => font.slug)).toEqual([
      'aveltin',
      'rock-salt',
      'subfamily-face',
      'thunder',
    ]);
  });

  it('marks unknown and missing redistribution data as unverified', () => {
    const fonts = normalizeCatalog(CATALOG_ROWS);

    expect(fonts[0].license.redistribution).toBe('unverified');
  });

  it('marks an explicitly allowed font as redistributable', () => {
    const fonts = normalizeCatalog(CATALOG_ROWS);

    expect(fonts[1].license.redistribution).toBe('allowed');
    expect(fonts[1].license.commercialUse).toBe(true);
    expect(fonts[1].license.url).toBe('https://openfontlicense.org/');
  });

  it('marks a font that forbids redistribution as restricted', () => {
    const fonts = normalizeCatalog(CATALOG_ROWS);
    const thunder = fonts.find(font => font.slug === 'thunder')!;

    expect(thunder.license.redistribution).toBe('restricted');
    expect(thunder.license.url).toBe(
      'https://www.nobadfonts.in/fonts/thunder'
    );
  });

  it('drops unpublished, parent, invalid-slug, and duplicate rows', () => {
    const fonts = normalizeCatalog([
      ...CATALOG_ROWS,
      {
        ...CATALOG_ROWS[1],
        name: 'Another duplicate',
      },
    ]);

    expect(fonts.map(font => font.name)).toEqual([
      'Aveltin',
      'Rock Salt',
      'Subfamily Face',
      'Thunder',
    ]);
  });

  it('drops names that cannot be interpolated into CSS safely', () => {
    const unsafe: NoBadFontsFontRow = {
      ...CATALOG_ROWS[1],
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Bad "quote"',
      slug: 'bad-quote',
    };

    expect(normalizeCatalog([unsafe])).toEqual([]);
  });

  it('ignores license URLs that are not http(s)', () => {
    const rockSaltLicense = CATALOG_ROWS[1].license as NoBadFontsLicense;
    const row = {
      ...CATALOG_ROWS[1],
      license: {
        ...rockSaltLicense,
        license_url: 'javascript:alert(1)',
      },
    } as NoBadFontsFontRow;

    expect(normalizeCatalog([row])[0].license.url).toBeNull();
  });
});

describe('loadCatalog', () => {
  it('loads and normalizes through the background message', async () => {
    sendMessage.mockResolvedValue(CATALOG_ROWS);

    await expect(loadCatalog()).resolves.toHaveLength(4);
    expect(sendMessage).toBeCalledWith({ name: 'GetNoBadFontsCatalog' });
  });

  it('reuses a successful request', async () => {
    sendMessage.mockResolvedValue(CATALOG_ROWS);

    await loadCatalog();
    await loadCatalog();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('drops a failed request so Retry starts a new one', async () => {
    sendMessage.mockResolvedValueOnce(null);
    sendMessage.mockResolvedValueOnce(CATALOG_ROWS);

    await expect(loadCatalog()).rejects.toThrow();
    await expect(loadCatalog()).resolves.toHaveLength(4);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});

describe('searchCatalog', () => {
  const fonts = normalizeCatalog(CATALOG_ROWS);

  it('searches family names, designers, tags, and categories', () => {
    expect(searchCatalog(fonts, 'rock').map(font => font.slug)).toEqual([
      'rock-salt',
    ]);
    expect(searchCatalog(fonts, 'heinzel').map(font => font.slug)).toEqual([
      'aveltin',
    ]);
    expect(searchCatalog(fonts, 'handwriting')).toHaveLength(1);
    expect(searchCatalog(fonts, 'display')).toHaveLength(3);
  });

  it('filters by category', () => {
    expect(searchCatalog(fonts, '', 'display')).toHaveLength(3);
  });

  it('returns everything for an empty search', () => {
    expect(searchCatalog(fonts, '')).toHaveLength(4);
  });
});

describe('catalog helpers', () => {
  it('lists categories once, sorted', () => {
    expect(getCatalogCategories(normalizeCatalog(CATALOG_ROWS))).toEqual([
      'display',
      'handwritten',
    ]);
  });

  it('builds the public font page URL from the validated slug', () => {
    expect(fontPageUrl({ slug: 'rock-salt' })).toBe(
      'https://www.nobadfonts.in/fonts/rock-salt'
    );
  });
});
