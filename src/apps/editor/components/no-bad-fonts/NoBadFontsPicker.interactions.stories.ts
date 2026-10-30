import type { Meta, StoryObj } from '@storybook/vue';
import { expect, waitFor, within } from '@storybook/test';

import { clearCatalogCache, clearVariantsCache } from '@stylebot/no-bad-fonts';
import { editor, WITH_RULE } from '@stylebot/storybook/fixtures/editor';
import {
  AVELTIN_ID,
  ROCK_SALT_ID,
  WOFF_ID,
} from '@stylebot/storybook/fixtures/no-bad-fonts';
import type { Canvas } from '@stylebot/storybook/story-helpers';
import {
  declaration,
  pageStyle,
  storeOf,
  user,
} from '@stylebot/storybook/story-helpers';

const resetNoBadFontsCache = (): void => {
  clearCatalogCache();
  clearVariantsCache();
};

const meta: Meta = {
  title: 'Tests/Editor/NoBadFonts',
  tags: ['test'],
  parameters: { padded: false },
  // Runs before the editor mounts, so a story never sees the previous
  // story's loaded catalog or variants.
  loaders: [resetNoBadFontsCache],
};

export default meta;

const REGULAR_ID = 'd6e1b5e1-92b5-4c69-94a8-0f5b0f6f5b48';
const VARIABLE_ID = '1ac1b5e1-92b5-4c69-94a8-0f5b0f6f5b48';
const TWO_AM_ID = '5af1b5e1-92b5-4c69-94a8-0f5b0f6f5b48';

const previewFamily = (fontId: string, variantId: string): string =>
  `"NoBadFonts Preview ${fontId} ${variantId}"`;

const openPicker = async (canvas: Canvas): Promise<void> => {
  await user.click(canvas.getByRole('button', { name: 'Browse NoBadFonts' }));
  await canvas.findByRole('heading', { name: 'NoBadFonts' });
};

const fontRow = (canvas: Canvas, name: string): HTMLElement =>
  canvas
    .getByText(name, { selector: '.font-name' })
    .closest('.font') as HTMLElement;

const expand = async (canvas: Canvas, name: string): Promise<HTMLElement> => {
  const row = fontRow(canvas, name);
  await user.click(row.querySelector('.font-header') as HTMLElement);
  return row;
};

const pickVariant = async (
  row: HTMLElement,
  name: RegExp
): Promise<HTMLElement> => {
  const variant = await within(row).findByRole('button', { name });
  await user.click(variant);
  return variant;
};

export const CatalogAndLicenses: StoryObj = {
  ...editor(WITH_RULE),
  name: 'the picker shows restricted fonts and every usable face',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openPicker(canvas);

    const rockSalt = fontRow(canvas, 'Rock Salt');
    const aveltin = fontRow(canvas, 'Aveltin');
    const thunder = fontRow(canvas, 'Thunder');

    await expect(within(rockSalt).queryByText('Unverified license')).toBeNull();
    await expect(within(aveltin).getByText('Unverified license')).toBeVisible();
    await expect(within(thunder).getByText('Restricted')).toBeVisible();
    await expect(fontRow(canvas, 'Blank Face')).toBeVisible();

    await expand(canvas, 'Thunder');
    await expect(
      within(thunder).getByText(
        "This font's license doesn't allow redistribution, so it can't be applied here."
      )
    ).toBeVisible();
    await expect(
      within(thunder).queryByRole('button', { name: /^Regular/ })
    ).toBeNull();

    const blankFace = await expand(canvas, 'Blank Face');
    await waitFor(() =>
      expect(
        within(blankFace).getByText('No usable variants for this font.')
      ).toBeVisible()
    );
    await user.click(within(blankFace).getByText('Unsupported variants'));
    await expect(within(blankFace).getByText('Regular')).toBeVisible();
    await expect(
      within(blankFace).getByText('This variant has no usable font file.')
    ).toBeVisible();
    await expect(within(blankFace).getByText('Bold')).toBeVisible();
    await expect(
      within(blankFace).getByText("This variant's font file isn't usable.")
    ).toBeVisible();

    const narrowCut = await expand(canvas, 'Narrow Cut');
    await within(narrowCut).findByText('Other faces');
    await expect(
      within(narrowCut).getByRole('button', { name: /^Condensed Bold/ })
    ).toBeVisible();

    const pixelDust = await expand(canvas, 'Pixel Dust');
    await within(pixelDust).findByText('Other faces');
    await expect(
      within(pixelDust).getByRole('button', { name: /^2AM/ })
    ).toBeVisible();
    await expect(
      within(pixelDust).getByRole('button', { name: /^Sunrise/ })
    ).toBeVisible();
  },
};

export const SearchAndApplyStatic: StoryObj = {
  ...editor(WITH_RULE),
  name: 'searching narrows the list and applying a static face saves every static file',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = storeOf(canvasElement);
    await openPicker(canvas);

    const search = canvas.getByPlaceholderText('Search NoBadFonts');
    await user.type(search, 'zzz');
    await expect(canvas.getByText('No fonts match your search.')).toBeVisible();
    await expect(canvas.queryByText('Rock Salt')).toBeNull();

    await user.clear(search);
    await user.type(search, 'aveltin');
    await expect(fontRow(canvas, 'Aveltin')).toBeVisible();
    await expect(canvas.queryByText('Rock Salt')).toBeNull();

    await user.clear(search);
    const row = await expand(canvas, 'Rock Salt');

    await within(row).findByRole('button', { name: /^Regular/ });
    await expect(
      within(row).getByRole('button', { name: /^Bold Italic/ })
    ).toBeVisible();
    await pickVariant(row, /^Regular/);

    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(
        previewFamily(ROCK_SALT_ID, REGULAR_ID)
      )
    );
    await expect(declaration(store, 'h1', 'font-family')).toBe('Merriweather');

    await user.click(canvas.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(declaration(store, 'h1', 'font-family')).toBe('"Rock Salt"')
    );
    await expect(declaration(store, 'h1', 'font-weight')).toBe('400');
    await expect(declaration(store, 'h1', 'font-style')).toBe('normal');
    await expect(store.state.css).toContain(
      'https://www.nobadfonts.in/font-file/font/rock-salt/Regular/rock-salt.woff2'
    );
    await expect(store.state.css).toContain(
      'https://www.nobadfonts.in/font-file/font/rock-salt/Bold%20Italic/rock-salt-bold-italic.woff2'
    );
    await expect(store.state.css).not.toContain('/css/rock-salt');
    await expect(
      canvas.queryByRole('heading', { name: 'NoBadFonts' })
    ).toBeNull();
  },
};

export const VariableFace: StoryObj = {
  ...editor(WITH_RULE),
  name: 'a variable face gets its own family and leaves weight and style alone',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = storeOf(canvasElement);
    await openPicker(canvas);

    const row = await expand(canvas, 'Aveltin');
    await within(row).findByRole('button', { name: /^Variable/ });

    await pickVariant(row, /^Variable/);
    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(
        previewFamily(AVELTIN_ID, VARIABLE_ID)
      )
    );

    await user.click(canvas.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(declaration(store, 'h1', 'font-family')).toBe('"Aveltin Variable"')
    );
    await expect(declaration(store, 'h1', 'font-weight')).toBeUndefined();
    await expect(declaration(store, 'h1', 'font-style')).toBeUndefined();
    await expect(store.state.css).toContain('font-family: "Aveltin Variable";');
    await expect(store.state.css).toContain('format("woff2")');
    await expect(store.state.css).not.toContain('/css/aveltin');
  },
};

export const CustomWoffFace: StoryObj = {
  ...editor(WITH_RULE),
  name: 'a custom WOFF face applies under its own family alias',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = storeOf(canvasElement);
    await openPicker(canvas);

    const row = await expand(canvas, 'Pixel Dust');
    await within(row).findByRole('button', { name: /^2AM/ });
    await pickVariant(row, /^2AM/);

    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(
        previewFamily(WOFF_ID, TWO_AM_ID)
      )
    );

    await user.click(canvas.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(declaration(store, 'h1', 'font-family')).toBe('"Pixel Dust 2AM"')
    );
    await expect(store.state.css).toContain('font-family: "Pixel Dust 2AM";');
    await expect(store.state.css).toContain(
      'https://www.nobadfonts.in/font-file/font/pixel-dust/2AM/pixel-dust.woff'
    );
    await expect(store.state.css).toContain('format("woff")');
  },
};

export const HoverPreview: StoryObj = {
  ...editor(WITH_RULE),
  name: 'hovering a face previews it after a short pause',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openPicker(canvas);

    const row = await expand(canvas, 'Rock Salt');
    const variant = await within(row).findByRole('button', {
      name: /^Regular/,
    });
    await user.hover(variant);

    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(
        previewFamily(ROCK_SALT_ID, REGULAR_ID)
      )
    );
  },
};

export const HeadingTarget: StoryObj = {
  ...editor(WITH_RULE),
  name: 'the target can be a heading other than the inspected element',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = storeOf(canvasElement);
    await openPicker(canvas);

    await user.click(canvas.getByRole('button', { name: 'Selected element' }));
    const menu = await canvas.findByRole('menu');
    await user.click(
      within(menu).getByRole('menuitem', { name: /^Heading 2/ })
    );

    const row = await expand(canvas, 'Rock Salt');
    await within(row).findByRole('button', { name: /^Regular/ });

    await pickVariant(row, /^Regular/);
    await user.click(canvas.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(declaration(store, 'h2', 'font-family')).toBe('"Rock Salt"')
    );
    await expect(declaration(store, 'h2', 'font-weight')).toBe('400');
    await expect(declaration(store, 'h1', 'font-family')).toBe('Merriweather');
  },
};

export const CatalogError: StoryObj = {
  ...editor(WITH_RULE),
  name: 'a failed catalog shows an error with Retry',
  parameters: {
    chrome: { noBadFonts: { catalog: null } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openPicker(canvas);

    await expect(canvas.getByText("Couldn't load NoBadFonts.")).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
  },
};

export const VariantsError: StoryObj = {
  ...editor(WITH_RULE),
  name: 'a failed variants request shows an error with Retry',
  parameters: {
    chrome: { noBadFonts: { variants: null } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openPicker(canvas);

    const row = await expand(canvas, 'Rock Salt');
    await waitFor(() =>
      expect(
        within(row).getByText("Couldn't load this font's variants.")
      ).toBeVisible()
    );
    await expect(
      within(row).getByRole('button', { name: 'Retry' })
    ).toBeVisible();
  },
};

export const CatalogBeforeVariants: StoryObj = {
  ...editor(WITH_RULE),
  name: 'the catalog appears while the variants are still loading',
  parameters: {
    chrome: { noBadFonts: { variants: 'pending' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openPicker(canvas);

    await expect(fontRow(canvas, 'Rock Salt')).toBeVisible();
    await expect(canvas.queryByText('Loading NoBadFonts…')).toBeNull();

    const row = await expand(canvas, 'Rock Salt');
    await expect(within(row).getByText('Loading NoBadFonts…')).toBeVisible();
  },
};

export const PreviewRemovedOnCancel: StoryObj = {
  ...editor(WITH_RULE),
  name: 'cancelling clears the preview without saving it',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = storeOf(canvasElement);
    const before = pageStyle(canvasElement, 'h1', 'font-family');
    await openPicker(canvas);

    const row = await expand(canvas, 'Rock Salt');
    await within(row).findByRole('button', { name: /^Regular/ });
    await pickVariant(row, /^Regular/);
    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(
        previewFamily(ROCK_SALT_ID, REGULAR_ID)
      )
    );

    await user.click(canvas.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(pageStyle(canvasElement, 'h1', 'font-family')).toBe(before)
    );
    await expect(declaration(store, 'h1', 'font-family')).toBe('Merriweather');
  },
};
