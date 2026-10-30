import 'jest-fetch-mock';

import {
  clearNoBadFontsCache,
  getNoBadFontsCatalog,
  getNoBadFontsVariants,
  sanitizeNoBadFontsCss,
} from './no-bad-fonts';

const FONT_ID = '1e67c09f-a958-4bc4-a010-afe514ed2046';

const fontRow = {
  id: FONT_ID,
  name: 'Rock Salt',
  slug: 'rock-salt',
  designer: 'Google',
  category: 'handwritten',
  tags: ['handwriting'],
  license_type: 'Unknown',
  commercial_use: true,
  is_published: true,
  family_role: 'standalone',
  license: {
    license_type: 'Unknown',
    redistribution_allowed: true,
  },
};

const variantRow = {
  id: 'e2ddf8b8-2a0e-441a-9606-38a2b54d00f8',
  font_id: FONT_ID,
  variant_name: 'Regular',
  woff2_url:
    'https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/font/rock-salt/variants/Regular/rock-salt.woff2',
  woff_url: null,
  order_index: 1,
};

const requestUrl = (call: number): URL =>
  new URL(String(fetchMock.mock.calls[call][0]));

describe('getNoBadFontsCatalog', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    clearNoBadFontsCache();
  });

  it('reads every published font with explicit fields', async () => {
    fetchMock.mockResponseOnce(JSON.stringify([fontRow]));

    await expect(getNoBadFontsCatalog()).resolves.toEqual([fontRow]);

    const url = requestUrl(0);
    expect(url.pathname).toBe('/rest/v1/fonts');
    expect(url.searchParams.get('select')).toContain('license:taxonomy->license');
    expect(url.searchParams.get('is_published')).toBe('eq.true');
    expect(url.searchParams.get('family_role')).toBeNull();
    expect(url.searchParams.get('order')).toBe('name.asc,id.asc');
    expect(url.searchParams.get('limit')).toBe('1000');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('sends the public anon key without a service role', async () => {
    fetchMock.mockResponseOnce(JSON.stringify([]));

    await getNoBadFontsCatalog();

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers.apikey).toBeTruthy();
    expect(headers.Authorization).toBe(`Bearer ${headers.apikey}`);
  });

  it('drops rows that do not have the required identifiers', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify([
        fontRow,
        { id: FONT_ID, slug: 'missing-name' },
        { name: 'Missing id', slug: 'missing-id' },
      ])
    );

    await expect(getNoBadFontsCatalog()).resolves.toEqual([fontRow]);
  });

  it('reads past the first page when it is full', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      ...fontRow,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }));
    fetchMock.mockResponseOnce(JSON.stringify(firstPage));
    fetchMock.mockResponseOnce(JSON.stringify([fontRow]));

    await expect(getNoBadFontsCatalog()).resolves.toHaveLength(1001);
    expect(requestUrl(1).searchParams.get('offset')).toBe('1000');
  });

  it('returns null for a non-array response', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ fonts: [fontRow] }));

    await expect(getNoBadFontsCatalog()).resolves.toBeNull();
  });

  it('returns null for a failed response', async () => {
    fetchMock.mockResponseOnce('', { status: 500 });

    await expect(getNoBadFontsCatalog()).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockResponseOnce(() => Promise.reject(new Error('offline')));

    await expect(getNoBadFontsCatalog()).resolves.toBeNull();
  });

  it('caches a successful response for five minutes', async () => {
    fetchMock.mockResponse(JSON.stringify([fontRow]));

    await getNoBadFontsCatalog();
    await getNoBadFontsCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed response', async () => {
    fetchMock.mockResponseOnce('', { status: 500 });
    fetchMock.mockResponseOnce(JSON.stringify([fontRow]));

    await expect(getNoBadFontsCatalog()).resolves.toBeNull();
    await expect(getNoBadFontsCatalog()).resolves.toEqual([fontRow]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('sanitizeNoBadFontsCss', () => {
  const fontFace = `@font-face {
  font-family: 'Rock Salt';
  src: url('https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`;

  it('keeps the expected @font-face rule and its descriptors', () => {
    const css = `/* Font: Rock Salt */\n\n${fontFace}\n`;

    expect(sanitizeNoBadFontsCss(css)).toBe(fontFace);
  });

  it('keeps a WOFF source', () => {
    const woff = fontFace
      .replace('rock-salt.woff2', 'rock-salt.woff')
      .replace("format('woff2')", "format('woff')");

    expect(sanitizeNoBadFontsCss(woff)).toBe(woff);
  });

  it('rewrites a storage source to the immutable proxy', () => {
    const storage = fontFace.replace(
      'https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2',
      'https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/font/rock-salt/rock-salt.woff2'
    );
    const expected = fontFace.replace(
      'https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2',
      'https://www.nobadfonts.in/font-file/font/rock-salt/rock-salt.woff2'
    );

    expect(sanitizeNoBadFontsCss(storage)).toBe(expected);
  });

  it('drops top-level rules and every other at-rule', () => {
    const css = `
      body { display: none; }
      @import url(https://example.com/evil.css);
      @media (min-width: 1px) { a { color: red; } }
      ${fontFace}
    `;

    expect(sanitizeNoBadFontsCss(css)).toBe(fontFace);
  });

  it('drops descriptors the picker does not support', () => {
    const css = fontFace.replace(
      'font-display: swap;',
      'font-display: swap;\n  font-stretch: 75%;\n  ascent-override: 100%;'
    );

    expect(sanitizeNoBadFontsCss(css)).toBe(fontFace);
  });

  it('drops a src outside the NoBadFonts font hosts', () => {
    const css = fontFace.replace(
      'https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2',
      'https://example.com/rock-salt.woff2'
    );

    expect(sanitizeNoBadFontsCss(css)).toBe('');
  });

  it('drops local() and data sources', () => {
    const local = fontFace.replace(
      "url('https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2') format('woff2')",
      "local('Rock Salt')"
    );
    const data = fontFace.replace(
      "url('https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2') format('woff2')",
      "url('data:font/woff2;base64,d09GMg==')"
    );

    expect(sanitizeNoBadFontsCss(local)).toBe('');
    expect(sanitizeNoBadFontsCss(data)).toBe('');
  });

  it('drops a rule missing a family or src', () => {
    expect(
      sanitizeNoBadFontsCss(
        fontFace.replace(/font-family: 'Rock Salt';/, '')
      )
    ).toBe('');
    expect(sanitizeNoBadFontsCss(fontFace.replace(/src: [^;]+;/, ''))).toBe('');
  });

  it('drops a family name that could break out of its declaration', () => {
    const css = fontFace.replace(
      "font-family: 'Rock Salt';",
      "font-family: 'Rock Salt'; } body { display: none; } @font-face { font-family: 'x';"
    );

    const output = sanitizeNoBadFontsCss(css);

    expect(output).not.toContain('body');
    expect(output.match(/@font-face/g)).toHaveLength(1);
  });

  it('normalizes quotes, weights and styles', () => {
    const css = fontFace
      .replace("'Rock Salt'", '"Rock Salt"')
      .replace('font-weight: 400;', 'font-weight: 100 900;')
      .replace('font-style: normal;', 'font-style: ITALIC;');

    expect(sanitizeNoBadFontsCss(css)).toBe(`@font-face {
  font-family: 'Rock Salt';
  src: url('https://www.nobadfonts.in/font-file/a78af31f/rock-salt/rock-salt.woff2') format('woff2');
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}`);
  });

  it('returns empty css for a parse error', () => {
    expect(sanitizeNoBadFontsCss('@font-face {')).toBe('');
  });
});

describe('getNoBadFontsVariants', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    clearNoBadFontsCache();
  });

  it('reads every font’s variants in order', async () => {
    fetchMock.mockResponseOnce(JSON.stringify([variantRow]));

    await expect(getNoBadFontsVariants()).resolves.toEqual([variantRow]);

    const url = requestUrl(0);
    expect(url.pathname).toBe('/rest/v1/font_variants');
    expect(url.searchParams.get('select')).toContain('variant_name');
    expect(url.searchParams.get('select')).toContain('woff_url');
    expect(url.searchParams.get('font_id')).toBeNull();
    expect(url.searchParams.get('order')).toBe(
      'font_id.asc,order_index.asc.nullsfirst,id.asc'
    );
    expect(url.searchParams.get('limit')).toBe('1000');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('drops rows that do not have the required identifiers', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify([
        variantRow,
        { id: variantRow.id, font_id: FONT_ID },
        { id: variantRow.id, variant_name: 'Bold' },
      ])
    );

    await expect(getNoBadFontsVariants()).resolves.toEqual([variantRow]);
  });

  it('caches a successful response for every font', async () => {
    fetchMock.mockResponse(JSON.stringify([variantRow]));

    await getNoBadFontsVariants();
    await getNoBadFontsVariants();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed response', async () => {
    fetchMock.mockResponseOnce('', { status: 500 });
    fetchMock.mockResponseOnce(JSON.stringify([variantRow]));

    await expect(getNoBadFontsVariants()).resolves.toBeNull();
    await expect(getNoBadFontsVariants()).resolves.toEqual([variantRow]);
  });
});
