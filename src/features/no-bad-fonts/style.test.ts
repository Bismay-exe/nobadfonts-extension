import { normalizeCatalog } from './catalog';
import {
  CATALOG_ROWS,
  CUSTOM_VARIANT_ROWS,
  STATIC_VARIANT_ROWS,
  VARIABLE_VARIANT_ROWS,
} from './catalog.fixtures';
import {
  buildNoBadFontsCss,
  buildNoBadFontsPreviewCss,
  getNoBadFontsCleanup,
  isNoBadFontsTarget,
} from './style';
import { normalizeVariants } from './variants';

const fonts = normalizeCatalog(CATALOG_ROWS);
const rockSalt = fonts.find(font => font.slug === 'rock-salt')!;
const aveltin = fonts.find(font => font.slug === 'aveltin')!;

const staticVariants = normalizeVariants(STATIC_VARIANT_ROWS);
const regular = staticVariants.static.find(variant => variant.weight === 400)!;
const variable = normalizeVariants(VARIABLE_VARIANT_ROWS).variable!;
const customSet = normalizeVariants(CUSTOM_VARIANT_ROWS);
const condensed = customSet.custom[0];

const staticCleanup = getNoBadFontsCleanup(rockSalt, staticVariants);
const variableCleanup = getNoBadFontsCleanup(aveltin, {
  static: [],
  variable,
  custom: [],
  unsupported: [],
});

describe('isNoBadFontsTarget', () => {
  it('accepts the selected element, body, and headings', () => {
    expect(isNoBadFontsTarget('.article-body', '.article-body')).toBe(true);
    expect(isNoBadFontsTarget('body', '.article-body')).toBe(true);
    expect(isNoBadFontsTarget('h1', '.article-body')).toBe(true);
    expect(isNoBadFontsTarget('h6', '.article-body')).toBe(true);
  });

  it('rejects the universal selector and other targets', () => {
    expect(isNoBadFontsTarget('*', '.article-body')).toBe(false);
    expect(isNoBadFontsTarget('*', '*')).toBe(false);
    expect(isNoBadFontsTarget('h7', '.article-body')).toBe(false);
    expect(isNoBadFontsTarget('p', '.article-body')).toBe(false);
    expect(isNoBadFontsTarget('', '.article-body')).toBe(false);
  });
});

describe('getNoBadFontsCleanup', () => {
  it('names every family and file an earlier apply could have written', () => {
    expect(staticCleanup).toEqual({
      families: ['Rock Salt', 'Rock Salt Variable'],
      urls: staticVariants.static.map(variant => variant.url),
    });

    expect(getNoBadFontsCleanup(aveltin, customSet)).toEqual({
      families: [
        'Aveltin',
        'Aveltin Variable',
        'Aveltin Condensed Bold',
        'Aveltin Poster',
      ],
      urls: customSet.custom.map(variant => variant.url),
    });
  });
});

describe('buildNoBadFontsCss', () => {
  it('adds declarations and every static face to the target', () => {
    const css = buildNoBadFontsCss('h1 {\n  color: red;\n}', {
      target: 'h1',
      kind: 'static',
      font: rockSalt,
      variant: regular,
      faces: staticVariants.static,
      cleanup: staticCleanup,
    });

    expect(css).not.toContain('@import');
    expect(css).toContain('font-family: "Rock Salt";');
    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('font-style: normal;');
    expect(css).toContain('color: red;');
    expect(css).toContain(
      'src: url("https://www.nobadfonts.in/font-file/font/test-sans/variants/Regular/test-sans.woff2") format("woff2");'
    );
    expect(css).toContain('font-weight: 700;');
    expect(css).toContain('font-style: italic;');
    expect(css.match(/@font-face \{/g)).toHaveLength(4);
  });

  it('always quotes the family name, even without spaces', () => {
    const css = buildNoBadFontsCss('', {
      target: 'body',
      kind: 'static',
      font: aveltin,
      variant: regular,
      faces: [regular],
      cleanup: variableCleanup,
    });

    expect(css).toContain('font-family: "Aveltin";');
  });

  it('sets only an aliased family for a variable face', () => {
    const css = buildNoBadFontsCss(
      'body {\n  font-weight: 600;\n  font-style: italic;\n}',
      {
        target: 'body',
        kind: 'variable',
        font: aveltin,
        variant: variable,
        cleanup: variableCleanup,
      }
    );

    expect(css).not.toContain('@import');
    expect(css).toContain('font-family: "Aveltin Variable";');
    expect(css).toContain('font-weight: 600;');
    expect(css).toContain('font-style: italic;');
    expect(css).toContain('@font-face {');
    expect(css).not.toContain(
      'font-face {\n  font-family: "Aveltin Variable";\n  src: url("https://www.nobadfonts.in/font-file/font/test-sans/variants/Variable/test-sans.woff2") format("woff2");\n  font-weight'
    );
  });

  it('adds a custom face under its own family alias', () => {
    const cleanup = getNoBadFontsCleanup(aveltin, customSet);

    const css = buildNoBadFontsCss('h1 {\n  font-weight: 600;\n}', {
      target: 'h1',
      kind: 'custom',
      font: aveltin,
      variant: condensed,
      cleanup,
    });

    expect(css).toContain('font-family: "Aveltin Condensed Bold";');
    expect(css).toContain('font-weight: 600;');
    expect(css).not.toContain('font-style');
    expect(css.match(/@font-face \{/g)).toHaveLength(1);
  });

  it('removes an older import and faces of the same font first', () => {
    const older = `@import url(https://www.nobadfonts.in/css/rock-salt?weights=400);

@font-face {
  font-family: "Rock Salt Variable";
  src: url("https://www.nobadfonts.in/font-file/font/rock-salt/Old/rock-salt.woff2") format("woff2");
}

@font-face {
  font-family: "Other Font";
  src: url("https://www.nobadfonts.in/font-file/font/other/other.woff2") format("woff2");
}

h1 {
  font-family: "Rock Salt Variable";
}`;

    const css = buildNoBadFontsCss(older, {
      target: 'h1',
      kind: 'static',
      font: rockSalt,
      variant: regular,
      faces: staticVariants.static,
      cleanup: staticCleanup,
    });

    expect(css).not.toContain('/css/rock-salt');
    expect(css).not.toContain('Old/rock-salt.woff2');
    expect(css).not.toContain('"Rock Salt Variable"');
    expect(css).toContain('"Other Font"');
    expect(css).toContain('other/other.woff2');
    expect(css.match(/@font-face \{/g)).toHaveLength(5);
  });

  it('removes a same-font import even when its weights list changed', () => {
    const css = buildNoBadFontsCss(
      '@import url(https://www.nobadfonts.in/css/rock-salt?variable=true);\n\nbody {\n}',
      {
        target: 'body',
        kind: 'static',
        font: rockSalt,
        variant: regular,
        faces: [regular],
        cleanup: staticCleanup,
      }
    );

    expect(css).not.toContain('/css/rock-salt');
    expect(css).not.toContain('@import');
  });
});

describe('buildNoBadFontsPreviewCss', () => {
  it('loads only the selected static file under a unique alias', () => {
    const choice = {
      target: 'h1',
      kind: 'static' as const,
      font: rockSalt,
      variant: regular,
      faces: staticVariants.static,
      cleanup: staticCleanup,
    };

    const css = buildNoBadFontsPreviewCss(choice);

    expect(css).toContain(
      `font-family: "NoBadFonts Preview ${rockSalt.id} ${regular.id}";`
    );
    expect(css).toContain('format("woff2")');
    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('font-style: normal;');
    expect(css.match(/@font-face \{/g)).toHaveLength(1);
    expect(css).not.toContain(staticVariants.static[2].url);
  });

  it('leaves weight and style off a variable or custom preview face', () => {
    const choice = {
      target: 'body',
      kind: 'variable' as const,
      font: aveltin,
      variant: variable,
      cleanup: variableCleanup,
    };

    const css = buildNoBadFontsPreviewCss(choice);

    expect(css).toContain(
      `font-family: "NoBadFonts Preview ${aveltin.id} ${variable.id}";`
    );
    expect(css).toContain('body {');
    expect(css).not.toContain('font-weight');
    expect(css).not.toContain('font-style');
  });
});
