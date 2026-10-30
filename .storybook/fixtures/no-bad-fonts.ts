import type {
  NoBadFontsFontsResponse,
  NoBadFontsVariantsResponse,
} from '@stylebot/types';

export const ROCK_SALT_ID = 'b1069847-b7b3-4183-9288-4a9a2a3dc995';
export const AVELTIN_ID = 'e34c1bd0-bd63-419c-8d83-3ff50481ecdc';
export const THUNDER_ID = '1e67c09f-a958-4bc4-a010-afe514ed2046';
export const NO_FILES_ID = '0f67c09f-a958-4bc4-a010-afe514ed2046';
export const WIDTH_ONLY_ID = '2a77c09f-a958-4bc4-a010-afe514ed2046';
export const WOFF_ID = '3b88c09f-a958-4bc4-a010-afe514ed2046';

const storageUrl = (path: string): string =>
  `https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/${path}`;

export const NO_BAD_FONTS_CATALOG: NoBadFontsFontsResponse = [
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
    license: null,
  },
  {
    id: ROCK_SALT_ID,
    name: 'Rock Salt',
    slug: 'rock-salt',
    designer: 'Google',
    category: 'handwritten',
    tags: ['handwriting'],
    license_type: 'SIL Open Font License',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: {
      license_type: 'SIL Open Font License',
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
    id: NO_FILES_ID,
    name: 'Blank Face',
    slug: 'blank-face',
    designer: null,
    category: 'sans',
    tags: null,
    license_type: 'Unknown',
    commercial_use: null,
    is_published: true,
    family_role: 'standalone',
    license: { redistribution_allowed: null },
  },
  {
    id: WIDTH_ONLY_ID,
    name: 'Narrow Cut',
    slug: 'narrow-cut',
    designer: null,
    category: 'sans',
    tags: null,
    license_type: 'Unknown',
    commercial_use: null,
    is_published: true,
    family_role: 'standalone',
    license: { redistribution_allowed: true },
  },
  {
    id: WOFF_ID,
    name: 'Pixel Dust',
    slug: 'pixel-dust',
    designer: 'Test Designer',
    category: 'display',
    tags: ['pixel'],
    license_type: 'SIL Open Font License',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: {
      license_type: 'SIL Open Font License',
      commercial_use: true,
      redistribution_allowed: true,
    },
  },
];

export const NO_BAD_FONTS_VARIANTS: NoBadFontsVariantsResponse = [
  {
    id: 'd6e1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: ROCK_SALT_ID,
    variant_name: 'Regular',
    woff2_url: storageUrl('font/rock-salt/Regular/rock-salt.woff2'),
    order_index: 1,
  },
  {
    id: 'e7f1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: ROCK_SALT_ID,
    variant_name: 'Bold',
    woff2_url: storageUrl('font/rock-salt/Bold/rock-salt-bold.woff2'),
    order_index: 2,
  },
  {
    id: 'f8a1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: ROCK_SALT_ID,
    variant_name: 'Bold Italic',
    woff2_url: storageUrl(
      'font/rock-salt/Bold%20Italic/rock-salt-bold-italic.woff2'
    ),
    order_index: 3,
  },
  {
    id: '1ac1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: AVELTIN_ID,
    variant_name: 'Variable',
    woff2_url: storageUrl('font/aveltin/Variable/aveltin.woff2'),
    order_index: 1,
  },
  {
    id: '3ce1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: WIDTH_ONLY_ID,
    variant_name: 'Condensed Bold',
    woff2_url: storageUrl('font/narrow-cut/Condensed/narrow-cut.woff2'),
    order_index: 1,
  },
  {
    id: '5af1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: WOFF_ID,
    variant_name: '2AM',
    woff2_url: null,
    woff_url: storageUrl('font/pixel-dust/2AM/pixel-dust.woff'),
    order_index: 1,
  },
  {
    id: '6bf1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: WOFF_ID,
    variant_name: 'Sunrise',
    woff2_url: storageUrl('font/pixel-dust/Sunrise/pixel-dust.woff2'),
    order_index: 2,
  },
  {
    id: '7cf1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: NO_FILES_ID,
    variant_name: 'Regular',
    order_index: 1,
  },
  {
    id: '8df1b5e1-92b5-4c69-94a8-0f5b0f6f5b48',
    font_id: NO_FILES_ID,
    variant_name: 'Bold',
    woff2_url: 'https://example.com/not-a-font.woff2',
    order_index: 2,
  },
];
