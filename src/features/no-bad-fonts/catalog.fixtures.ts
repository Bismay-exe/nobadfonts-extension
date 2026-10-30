import type { NoBadFontsFontRow, NoBadFontsVariantRow } from '@stylebot/types';

export const ROCK_SALT_ID = 'b1069847-b7b3-4183-9288-4a9a2a3dc995';
export const AVELTIN_ID = 'e34c1bd0-bd63-419c-8d83-3ff50481ecdc';
export const THUNDER_ID = '1e67c09f-a958-4bc4-a010-afe514ed2046';
export const VARIANT_FONT_ID = '0f67c09f-a958-4bc4-a010-afe514ed2046';

const storageUrl = (path: string): string =>
  `https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/${path}`;

export const CATALOG_ROWS: Array<NoBadFontsFontRow> = [
  {
    id: AVELTIN_ID,
    name: 'Aveltin',
    slug: 'aveltin',
    designer: 'HeinzelStd',
    category: 'display',
    tags: ['modern', 'serif'],
    license_type: 'Unknown',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: {
      license_type: 'Unknown',
      commercial_use: true,
      redistribution_allowed: null,
      license_url: null,
    },
  },
  {
    id: ROCK_SALT_ID,
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
      commercial_use: true,
      redistribution_allowed: true,
      license_url: 'https://openfontlicense.org/',
    },
  },
  {
    id: THUNDER_ID,
    name: 'Thunder',
    slug: 'thunder',
    designer: 'Zetafonts',
    category: 'display',
    tags: ['bold'],
    license_type: 'Free for Personal & Commercial Use',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: {
      license_type: 'Free for Personal & Commercial Use',
      commercial_use: true,
      redistribution_allowed: false,
      license_url: 'https://www.nobadfonts.in/fonts/thunder',
    },
  },
  {
    id: 'd4e1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    name: 'Unpublished',
    slug: 'unpublished',
    designer: null,
    category: 'display',
    tags: null,
    license_type: 'Unknown',
    commercial_use: true,
    is_published: false,
    family_role: 'standalone',
    license: { redistribution_allowed: true },
  },
  {
    id: '6f9e1f0c-bb76-4d50-a8f6-63ef68a4a637',
    name: 'Parent Family',
    slug: 'parent-family',
    designer: null,
    category: 'display',
    tags: null,
    license_type: 'Unknown',
    commercial_use: true,
    is_published: true,
    family_role: 'parent',
    license: { redistribution_allowed: true },
  },
  {
    id: '7a0f2b1c-bb76-4d50-a8f6-63ef68a4a637',
    name: 'Subfamily Face',
    slug: 'subfamily-face',
    designer: null,
    category: 'display',
    tags: null,
    license_type: 'Unknown',
    commercial_use: true,
    is_published: true,
    family_role: 'subfamily',
    license: { redistribution_allowed: true },
  },
  {
    id: 'f0e8c4c4-4af8-4d34-8a72-3d7c17e7ae6c',
    name: 'Invalid Slug',
    slug: 'Invalid Slug',
    designer: null,
    category: 'display',
    tags: null,
    license_type: 'Unknown',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: { redistribution_allowed: true },
  },
  {
    id: ROCK_SALT_ID,
    name: 'Rock Salt Duplicate',
    slug: 'rock-salt',
    designer: null,
    category: 'handwritten',
    tags: null,
    license_type: 'Unknown',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: { redistribution_allowed: true },
  },
];

export const STATIC_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  {
    id: 'd6e1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Regular',
    woff2_url: storageUrl('font/test-sans/variants/Regular/test-sans.woff2'),
    order_index: 2,
  },
  {
    id: 'e7f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Bold',
    woff2_url: storageUrl('font/test-sans/variants/Bold/test-sans-bold.woff2'),
    order_index: 3,
  },
  {
    id: 'f8a1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Bold Italic',
    woff2_url: storageUrl(
      'font/test-sans/variants/Bold%20Italic/test-sans-bold-italic.woff2'
    ),
    order_index: 4,
  },
  {
    id: '09b1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Light',
    woff2_url: storageUrl(
      'font/test-sans/variants/Light/test-sans-light.woff2'
    ),
    order_index: 1,
  },
];

export const VARIABLE_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  {
    id: '1ac1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Variable',
    woff2_url: storageUrl('font/test-sans/variants/Variable/test-sans.woff2'),
    order_index: 5,
  },
];

export const AMBIGUOUS_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  ...STATIC_VARIANT_ROWS,
  {
    id: '2bd1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Normal',
    woff2_url: storageUrl('font/test-sans/variants/Normal/test-sans.woff2'),
    order_index: 6,
  },
];

export const CUSTOM_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  {
    id: '3ce1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Condensed Bold',
    woff2_url: storageUrl('font/test-sans/variants/Condensed/test-sans.woff2'),
    order_index: 1,
  },
  {
    id: '4df1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Poster',
    woff2_url: storageUrl('font/test-sans/variants/Poster/test-sans.woff2'),
    order_index: 2,
  },
];

export const UNSUPPORTED_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  {
    id: '5ef1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Blank',
    order_index: 1,
  },
  {
    id: '6ff1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Foreign',
    woff2_url: 'https://example.com/test.woff2',
    order_index: 2,
  },
];

export const WOFF_VARIANT_ROWS: Array<NoBadFontsVariantRow> = [
  {
    id: '70f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: '2AM',
    woff2_url: null,
    woff_url: storageUrl('font/test-sans/variants/2AM/test-sans.woff'),
    order_index: 1,
  },
  {
    id: '81f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Sunrise',
    woff2_url: 'not a url',
    woff_url: storageUrl('font/test-sans/variants/Sunrise/test-sans.woff'),
    order_index: 2,
  },
  {
    id: '92f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Midnight',
    woff2_url: 'https://example.com/test.woff2',
    woff_url: storageUrl('font/test-sans/variants/Midnight/test-sans.woff'),
    order_index: 3,
  },
];

export const MULTIPLE_VARIABLE_ROWS: Array<NoBadFontsVariantRow> = [
  ...VARIABLE_VARIANT_ROWS,
  {
    id: 'a1f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: VARIANT_FONT_ID,
    variant_name: 'Italic Variable',
    woff2_url: storageUrl(
      'font/test-sans/variants/Variable%20Italic/test-sans-italic.woff2'
    ),
    order_index: 6,
  },
];
