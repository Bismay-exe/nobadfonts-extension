import type { BrowserContext } from '@playwright/test';
import { test, expect } from './fixtures';
import { openEditor, PAGE_URL, pickElement, servePage } from './helpers';

const PAGE_HTML = `
  <!doctype html>
  <html>
    <body>
      <h1>Test page</h1>
    </body>
  </html>
`;

const FONT_ID = '3b1f7c62-9d24-4e8a-9c15-2f5a0d6b8e41';
const SLUG = 'rock-salt';
const FAMILY = 'Rock Salt';

const CATALOG = [
  {
    id: FONT_ID,
    name: FAMILY,
    slug: SLUG,
    designer: 'Test Designer',
    category: 'Display',
    tags: ['handwriting'],
    license_type: 'OFL',
    commercial_use: true,
    is_published: true,
    family_role: 'standalone',
    license: {
      license_type: 'OFL',
      commercial_use: true,
      redistribution_allowed: true,
      license_url: 'https://example.com/ofl',
    },
  },
];

const VARIANTS = [
  {
    id: 'a9d0e4b2-1c3f-4a5d-8b6e-7f9012345678',
    font_id: FONT_ID,
    variant_name: 'Regular',
    woff2_url: `https://www.nobadfonts.in/font-file/${SLUG}.woff2`,
    woff_url: null,
    order_index: 0,
  },
];

// Both the catalog and the variants are fetched by the background, which
// Playwright only observes on Chromium.
const interceptNoBadFonts = async (
  context: BrowserContext
): Promise<Array<string>> => {
  const requests: Array<string> = [];

  await context.route(
    'https://wcegdxhvgwbeskaidlxr.supabase.co/**',
    route => {
      const url = route.request().url();
      requests.push(url);

      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(
          url.includes('/rest/v1/font_variants') ? VARIANTS : CATALOG
        ),
      });
    }
  );

  await context.route('https://www.nobadfonts.in/css/**', route => {
    requests.push(route.request().url());
    return route.abort();
  });

  await context.route('https://www.nobadfonts.in/font-file/**', route =>
    route.fulfill({ contentType: 'font/woff2', body: '' })
  );

  return requests;
};

test.skip(
  ({ engine }) => !engine.routesExtensionRequests,
  "Playwright can't observe the extension's own requests on this engine"
);

test('applies a NoBadFonts family and keeps it after a reload', async ({
  context,
  extension,
  openPopup,
}) => {
  const requests = await interceptNoBadFonts(context);
  await servePage(context, PAGE_HTML);

  const page = await context.newPage();
  await page.goto(PAGE_URL);

  const editor = await openEditor(page, openPopup);
  await pickElement(page, editor, 'h1');

  await page.getByRole('button', { name: 'Browse NoBadFonts' }).click();
  await expect(
    page.getByRole('heading', { name: 'NoBadFonts' })
  ).toBeVisible();

  const row = page.locator('.font').filter({ hasText: FAMILY });
  await row.locator('.font-header').click();
  await row.getByRole('button', { name: /^Regular/ }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.locator('h1')).toHaveCSS(
    'font-family',
    `"${FAMILY}"`
  );

  expect(requests.some(url => url.includes('/rest/v1/fonts?'))).toBe(true);
  const variantRequest = requests.find(url =>
    url.includes('/rest/v1/font_variants?')
  );
  expect(variantRequest).toBeDefined();
  expect(variantRequest ?? '').not.toContain('font_id=');
  expect(requests.some(url => url.includes('/css/'))).toBe(false);

  const savedCss = () =>
    extension.evaluate(async () => {
      const { styles } = await chrome.storage.local.get('styles');
      const style = styles?.localhost;

      return [
        style?.css ?? '',
        ...Object.values(style?.profiles ?? {}).map(
          profile => (profile as { css: string }).css
        ),
      ].join('\n');
    });

  await expect
    .poll(savedCss)
    .toContain('@font-face {');
  await expect
    .poll(savedCss)
    .toContain(
      `src: url("https://www.nobadfonts.in/font-file/${SLUG}.woff2") format("woff2");`
    );
  await expect.poll(savedCss).toContain(`font-family: "${FAMILY}";`);
  await expect.poll(savedCss).toContain('font-weight: 400;');
  await expect.poll(savedCss).toContain('font-style: normal;');
  expect(await savedCss()).not.toContain('/css/');

  await page.reload();
  await expect(page.locator('h1')).toHaveCSS(
    'font-family',
    `"${FAMILY}"`
  );
});
