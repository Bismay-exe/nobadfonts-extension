import {
  AMBIGUOUS_VARIANT_ROWS,
  CUSTOM_VARIANT_ROWS,
  MULTIPLE_VARIABLE_ROWS,
  STATIC_VARIANT_ROWS,
  UNSUPPORTED_VARIANT_ROWS,
  VARIABLE_VARIANT_ROWS,
  VARIANT_FONT_ID,
  WOFF_VARIANT_ROWS,
} from './catalog.fixtures';
import {
  clearVariantsCache,
  loadVariants,
  normalizeVariants,
  parseVariantName,
} from './variants';

const sendMessage = jest.fn();

beforeEach(() => {
  clearVariantsCache();
  sendMessage.mockReset();

  global.chrome = {
    runtime: { sendMessage },
  } as unknown as typeof chrome;
});

describe('parseVariantName', () => {
  it.each([
    ['Thin', 100, 'normal'],
    ['Extra Light', 200, 'normal'],
    ['Light', 300, 'normal'],
    ['Regular', 400, 'normal'],
    ['Normal', 400, 'normal'],
    ['Medium', 500, 'normal'],
    ['Semi Bold', 600, 'normal'],
    ['Bold', 700, 'normal'],
    ['Extra Bold', 800, 'normal'],
    ['Black', 900, 'normal'],
    ['Bold Italic', 700, 'italic'],
  ])('maps %s to weight %i and style %s', (name, weight, style) => {
    expect(parseVariantName(name)).toEqual({ kind: 'static', weight, style });
  });

  it('leaves width and unknown names for a custom face', () => {
    expect(parseVariantName('Condensed Bold')).toEqual({ kind: 'other' });
    expect(parseVariantName('Poster')).toEqual({ kind: 'other' });
  });

  it('accepts one normal variable face', () => {
    expect(parseVariantName('Variable')).toEqual({ kind: 'variable' });
    expect(parseVariantName('Upright Variable')).toEqual({
      kind: 'variable',
    });
  });

  it('leaves an italic variable face for a custom face', () => {
    expect(parseVariantName('Italic Variable')).toEqual({ kind: 'other' });
  });
});

describe('normalizeVariants', () => {
  it('sorts selectable static variants by weight and style', () => {
    const variants = normalizeVariants(STATIC_VARIANT_ROWS);

    expect(variants.static.map(variant => variant.name)).toEqual([
      'Light',
      'Regular',
      'Bold',
      'Bold Italic',
    ]);
    expect(variants.variable).toBeNull();
    expect(variants.custom).toEqual([]);
    expect(variants.unsupported).toEqual([]);
    expect(variants.static[1].url).toBe(
      'https://www.nobadfonts.in/font-file/font/test-sans/variants/Regular/test-sans.woff2'
    );
    expect(variants.static[1].format).toBe('woff2');
  });

  it('keeps one normal variable face', () => {
    const variants = normalizeVariants(VARIABLE_VARIANT_ROWS);

    expect(variants.static).toEqual([]);
    expect(variants.variable?.name).toBe('Variable');
  });

  it('turns ambiguous weight/style duplicates into custom faces', () => {
    const variants = normalizeVariants(AMBIGUOUS_VARIANT_ROWS);

    expect(variants.static.map(variant => variant.name)).toEqual([
      'Light',
      'Bold',
      'Bold Italic',
    ]);
    expect(variants.custom.map(variant => variant.name)).toEqual([
      'Regular',
      'Normal',
    ]);
    expect(variants.unsupported).toEqual([]);
  });

  it('keeps width and unknown names as custom faces', () => {
    const variants = normalizeVariants(CUSTOM_VARIANT_ROWS);

    expect(variants.static).toEqual([]);
    expect(variants.custom.map(variant => variant.name)).toEqual([
      'Condensed Bold',
      'Poster',
    ]);
    expect(variants.unsupported).toEqual([]);
  });

  it('reports only faces without a usable file as unsupported', () => {
    const variants = normalizeVariants(UNSUPPORTED_VARIANT_ROWS);

    expect(variants.unsupported).toEqual([
      { name: 'Blank', reason: 'missing-file' },
      { name: 'Foreign', reason: 'invalid-file' },
    ]);
  });

  it('falls back to a WOFF file when WOFF2 is missing or invalid', () => {
    const variants = normalizeVariants(WOFF_VARIANT_ROWS);

    expect(variants.unsupported).toEqual([]);
    expect(
      variants.custom.map(variant => [variant.name, variant.format])
    ).toEqual([
      ['2AM', 'woff'],
      ['Sunrise', 'woff'],
      ['Midnight', 'woff'],
    ]);
    expect(variants.custom[0].url).toBe(
      'https://www.nobadfonts.in/font-file/font/test-sans/variants/2AM/test-sans.woff'
    );
  });

  it('keeps the normal variable face and makes an extra one custom', () => {
    const variants = normalizeVariants(MULTIPLE_VARIABLE_ROWS);

    expect(variants.variable?.name).toBe('Variable');
    expect(variants.custom.map(variant => variant.name)).toEqual([
      'Italic Variable',
    ]);
  });

  it('ignores a duplicate variant name', () => {
    const duplicate = {
      ...STATIC_VARIANT_ROWS[0],
      id: '11111111-1111-4111-8111-111111111111',
      woff2_url: STATIC_VARIANT_ROWS[1].woff2_url,
    };

    const variants = normalizeVariants([...STATIC_VARIANT_ROWS, duplicate]);

    expect(variants.static).toHaveLength(4);
    expect(variants.custom).toEqual([]);
  });
});

describe('loadVariants', () => {
  it('loads every font and groups faces by font id', async () => {
    sendMessage.mockResolvedValue(STATIC_VARIANT_ROWS);

    const variants = await loadVariants();

    expect(variants.get(VARIANT_FONT_ID)?.static).toHaveLength(4);
    expect(sendMessage).toBeCalledWith({ name: 'GetNoBadFontsVariants' });
  });

  it('reuses a successful request', async () => {
    sendMessage.mockResolvedValue(STATIC_VARIANT_ROWS);

    await loadVariants();
    await loadVariants();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('drops a failed request so Retry starts a new one', async () => {
    sendMessage.mockResolvedValueOnce(null);
    sendMessage.mockResolvedValueOnce(STATIC_VARIANT_ROWS);

    await expect(loadVariants()).rejects.toThrow();
    await expect(loadVariants()).resolves.toBeInstanceOf(Map);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('skips rows whose font id is not a uuid', async () => {
    sendMessage.mockResolvedValue([
      { ...STATIC_VARIANT_ROWS[0], font_id: 'font-id' },
    ]);

    await expect(loadVariants()).resolves.toEqual(new Map());
  });
});
