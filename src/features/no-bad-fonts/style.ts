import { parse } from 'postcss';

import { addDeclaration, unquoteFamily } from '@stylebot/css';
import {
  getNoBadFontsFontFile,
  isNoBadFontsCssUrl,
  isNoBadFontsFontFileUrl,
} from '@stylebot/utils';

import type { NoBadFontsFont } from './catalog';
import type {
  NoBadFontsCustomVariant,
  NoBadFontsStaticVariant,
  NoBadFontsVariantSet,
  NoBadFontsVariableVariant,
} from './variants';

export type NoBadFontsCleanup = {
  families: Array<string>;
  urls: Array<string>;
};

export type NoBadFontsStyle =
  | {
      kind: 'static';
      font: NoBadFontsFont;
      variant: NoBadFontsStaticVariant;
      // Every static face the font offers, so later weight changes load.
      faces: Array<NoBadFontsStaticVariant>;
    }
  | {
      kind: 'variable';
      font: NoBadFontsFont;
      variant: NoBadFontsVariableVariant;
    }
  | {
      kind: 'custom';
      font: NoBadFontsFont;
      variant: NoBadFontsCustomVariant;
    };

export type NoBadFontsChoice = NoBadFontsStyle & {
  target: string;
  cleanup: NoBadFontsCleanup;
};

const IMPORT_URL = /^url\(\s*(['"]?)([^'")]+)\1\s*\)$/;
const SRC_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

const quoteFamilyName = (name: string): string =>
  `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const quoteUrl = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const familyFor = (choice: NoBadFontsChoice): string => {
  if (choice.kind === 'static') {
    return choice.font.name;
  }

  if (choice.kind === 'variable') {
    return `${choice.font.name} Variable`;
  }

  return `${choice.font.name} ${choice.variant.name}`;
};

/**
 * The families and files an earlier picker apply of this font may have
 * written, so the next apply can remove them before adding its own.
 */
export const getNoBadFontsCleanup = (
  font: NoBadFontsFont,
  set: NoBadFontsVariantSet
): NoBadFontsCleanup => ({
  families: [
    font.name,
    `${font.name} Variable`,
    ...set.custom.map(variant => `${font.name} ${variant.name}`),
  ],
  urls: [
    ...set.static.map(variant => variant.url),
    ...(set.variable ? [set.variable.url] : []),
    ...set.custom.map(variant => variant.url),
  ],
});

const fontFace = (
  family: string,
  file: { url: string; format: 'woff2' | 'woff' },
  descriptors?: { weight: number; style: 'normal' | 'italic' }
): string => {
  const lines = [
    '@font-face {',
    `  font-family: ${quoteFamilyName(family)};`,
    `  src: url(${quoteUrl(file.url)}) format("${file.format}");`,
  ];

  if (descriptors) {
    lines.push(`  font-weight: ${descriptors.weight};`);
    lines.push(`  font-style: ${descriptors.style};`);
  }

  lines.push('  font-display: swap;');
  lines.push('}');

  return lines.join('\n');
};

const srcUrls = (value: string): Array<string> =>
  Array.from(value.matchAll(SRC_URL), match => match[2]);

const removeNoBadFontsImport = (
  root: ReturnType<typeof parse>,
  slug: string
): void => {
  root.walkAtRules('import', atRule => {
    const match = IMPORT_URL.exec(atRule.params.trim());

    if (!match || !isNoBadFontsCssUrl(match[2])) {
      return;
    }

    const importSlug = new URL(match[2]).pathname.split('/').pop();

    if (importSlug === slug) {
      atRule.remove();
    }
  });
};

const removeOldFaces = (
  root: ReturnType<typeof parse>,
  cleanup: NoBadFontsCleanup
): void => {
  const families = new Set(
    cleanup.families.map(family => family.toLowerCase())
  );
  const urls = new Set(cleanup.urls);

  root.walkAtRules('font-face', atRule => {
    let family = '';
    let src = '';

    atRule.walkDecls('font-family', declaration => {
      family = unquoteFamily(declaration.value.trim());
    });
    atRule.walkDecls('src', declaration => {
      src = declaration.value;
    });

    if (!family || !src) {
      return;
    }

    const faceUrls = srcUrls(src);

    if (!faceUrls.some(isNoBadFontsFontFileUrl)) {
      return;
    }

    const familyMatch = families.has(family.toLowerCase());
    const urlMatch = faceUrls.some(value => {
      const file = getNoBadFontsFontFile(value);
      return file ? urls.has(file.url) : false;
    });

    if (familyMatch || urlMatch) {
      atRule.remove();
    }
  });
};

const addFaces = (css: string, faces: Array<string>): string => {
  if (faces.length === 0) {
    return css;
  }

  const root = parse(css);
  const generated = faces.join('\n\n');

  root.append((root.nodes?.length ?? 0) > 0 ? `\n\n${generated}` : generated);

  return root.toString();
};

/**
 * Whether a selector is one the picker may write: the element selected in
 * the inspector, the page body, or one of the six heading levels.
 */
export const isNoBadFontsTarget = (
  selector: string,
  activeSelector: string
): boolean =>
  selector !== '*' &&
  (selector === activeSelector ||
    selector === 'body' ||
    /^h[1-6]$/.test(selector));

const applyFace = (choice: NoBadFontsChoice): string => {
  if (choice.kind === 'static') {
    return fontFace(choice.font.name, choice.variant, {
      weight: choice.variant.weight,
      style: choice.variant.style,
    });
  }

  return fontFace(familyFor(choice), choice.variant);
};

const choiceFaces = (choice: NoBadFontsChoice): Array<string> =>
  choice.kind === 'static'
    ? choice.faces.map(variant =>
        fontFace(choice.font.name, variant, {
          weight: variant.weight,
          style: variant.style,
        })
      )
    : [applyFace(choice)];

/**
 * Adds the selected face's declarations to the target selector and the
 * concrete @font-face rules the page needs. Static faces share the real
 * family; variable and custom faces get an alias so they cannot collide with
 * a regular face of the same font. Prior picker imports and faces for the
 * font are removed first.
 */
export const buildNoBadFontsCss = (
  css: string,
  choice: NoBadFontsChoice
): string => {
  const root = parse(css);

  removeNoBadFontsImport(root, choice.font.slug);
  removeOldFaces(root, choice.cleanup);

  let next = addDeclaration(
    'font-family',
    quoteFamilyName(familyFor(choice)),
    choice.target,
    root.toString()
  );

  if (choice.kind === 'static') {
    next = addDeclaration(
      'font-weight',
      String(choice.variant.weight),
      choice.target,
      next
    );
    next = addDeclaration(
      'font-style',
      choice.variant.style,
      choice.target,
      next
    );
  }

  return addFaces(next, choiceFaces(choice));
};

/**
 * Builds the preview stylesheet for one face. The preview loads only the
 * selected file, under an alias unique to the font and variant, so it never
 * waits on a stylesheet request or disturbs the saved font.
 */
export const buildNoBadFontsPreviewCss = (choice: NoBadFontsChoice): string => {
  const alias = `NoBadFonts Preview ${choice.font.id} ${choice.variant.id}`;
  const preview = fontFace(
    alias,
    choice.variant,
    choice.kind === 'static'
      ? { weight: choice.variant.weight, style: choice.variant.style }
      : undefined
  );

  let css = addDeclaration(
    'font-family',
    quoteFamilyName(alias),
    choice.target,
    ''
  );

  if (choice.kind === 'static') {
    css = addDeclaration(
      'font-weight',
      String(choice.variant.weight),
      choice.target,
      css
    );
    css = addDeclaration(
      'font-style',
      choice.variant.style,
      choice.target,
      css
    );
  }

  return `${preview}\n\n${css}`;
};
