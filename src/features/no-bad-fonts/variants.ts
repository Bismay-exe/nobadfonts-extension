import type {
  GetNoBadFontsVariants,
  GetNoBadFontsVariantsResponse,
  NoBadFontsVariantRow,
} from '@stylebot/types';
import { getNoBadFontsFontFile } from '@stylebot/utils';
import type { NoBadFontsFontFile } from '@stylebot/utils';

import { NoBadFontsRequestError } from './errors';

export type NoBadFontsStaticVariant = {
  kind: 'static';
  id: string;
  name: string;
  weight: number;
  style: 'normal' | 'italic';
  url: string;
  format: NoBadFontsFontFile['format'];
};

export type NoBadFontsVariableVariant = {
  kind: 'variable';
  id: string;
  name: string;
  url: string;
  format: NoBadFontsFontFile['format'];
};

export type NoBadFontsCustomVariant = {
  kind: 'custom';
  id: string;
  name: string;
  url: string;
  format: NoBadFontsFontFile['format'];
};

export type NoBadFontsVariant =
  | NoBadFontsStaticVariant
  | NoBadFontsVariableVariant
  | NoBadFontsCustomVariant;

export type NoBadFontsUnsupportedReason = 'missing-file' | 'invalid-file';

export type NoBadFontsUnsupportedVariant = {
  name: string;
  reason: NoBadFontsUnsupportedReason;
};

export type NoBadFontsVariantSet = {
  static: Array<NoBadFontsStaticVariant>;
  variable: NoBadFontsVariableVariant | null;
  custom: Array<NoBadFontsCustomVariant>;
  unsupported: Array<NoBadFontsUnsupportedVariant>;
};

type ParsedVariantName =
  | { kind: 'static'; weight: number; style: 'normal' | 'italic' }
  | { kind: 'variable' }
  | { kind: 'other' };

const FONT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VARIABLE = /\bvariable\b/;
const ITALIC = /\bitalic\b/;

const WEIGHTS: Record<string, number> = {
  thin: 100,
  'extra light': 200,
  extralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  'semi bold': 600,
  semibold: 600,
  'demi bold': 600,
  demibold: 600,
  bold: 700,
  'extra bold': 800,
  extrabold: 800,
  black: 900,
};

let variantsRequest: Promise<
  Map<string, NoBadFontsVariantSet>
> | null = null;

const normalizedName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ');

/**
 * Parses a variant name only when it maps to one known weight and style, or
 * to the single normal variable face. Every other name is left for the caller
 * to expose as a custom face rather than guessed at.
 */
export const parseVariantName = (rawName: string): ParsedVariantName => {
  const name = normalizedName(rawName);
  const lower = name.toLowerCase();

  if (!name) {
    return { kind: 'other' };
  }

  if (VARIABLE.test(lower)) {
    return lower === 'variable' || lower === 'upright variable'
      ? { kind: 'variable' }
      : { kind: 'other' };
  }

  const style = ITALIC.test(lower) ? 'italic' : 'normal';
  const base = lower
    .replace(ITALIC, '')
    .replace(/[\s-]+/g, ' ')
    .trim();

  if (!base) {
    return style === 'italic'
      ? { kind: 'static', weight: 400, style }
      : { kind: 'other' };
  }

  const weight = WEIGHTS[base];

  return weight
    ? { kind: 'static', weight, style }
    : { kind: 'other' };
};

type VariantCandidate = {
  row: NoBadFontsVariantRow;
  name: string;
  file: NoBadFontsFontFile;
  parsed: ParsedVariantName;
};

const variantFile = (
  row: NoBadFontsVariantRow
): NoBadFontsFontFile | null =>
  getNoBadFontsFontFile(row.woff2_url) ??
  getNoBadFontsFontFile(row.woff_url);

const unsupported = (
  name: string,
  reason: NoBadFontsUnsupportedReason
): NoBadFontsUnsupportedVariant => ({ name, reason });

/**
 * Splits the rows into standard static faces, one normal variable face,
 * custom faces, and files that cannot be used at all. Width names, unknown
 * names, duplicate weight/style pairs, and extra variable faces become
 * custom faces with their own family alias.
 */
export const normalizeVariants = (
  rows: ReadonlyArray<NoBadFontsVariantRow>
): NoBadFontsVariantSet => {
  const candidates: Array<VariantCandidate> = [];
  const unsupportedVariants: Array<NoBadFontsUnsupportedVariant> = [];
  const seen = new Set<string>();

  rows.forEach(row => {
    if (
      typeof row.id !== 'string' ||
      typeof row.variant_name !== 'string' ||
      !row.variant_name.trim()
    ) {
      return;
    }

    const name = normalizedName(row.variant_name);

    if (seen.has(name)) {
      return;
    }

    seen.add(name);

    const file = variantFile(row);

    if (!file) {
      unsupportedVariants.push(
        unsupported(
          name,
          row.woff2_url || row.woff_url ? 'invalid-file' : 'missing-file'
        )
      );
      return;
    }

    candidates.push({
      row,
      name,
      file,
      parsed: parseVariantName(name),
    });
  });

  const variableCandidates = candidates.filter(
    candidate => candidate.parsed.kind === 'variable'
  );
  const singleVariable = variableCandidates.length === 1;
  const staticGroups = new Map<string, Array<VariantCandidate>>();

  candidates.forEach(candidate => {
    if (candidate.parsed.kind !== 'static') {
      return;
    }

    const key = `${candidate.parsed.weight}/${candidate.parsed.style}`;
    const group = staticGroups.get(key) ?? [];

    group.push(candidate);
    staticGroups.set(key, group);
  });

  const staticVariants: Array<NoBadFontsStaticVariant> = [];
  const customCandidates: Array<VariantCandidate> = [];

  candidates.forEach(candidate => {
    if (candidate.parsed.kind === 'variable') {
      if (!singleVariable) {
        customCandidates.push(candidate);
      }
      return;
    }

    if (candidate.parsed.kind === 'other') {
      customCandidates.push(candidate);
      return;
    }

    const group = staticGroups.get(
      `${candidate.parsed.weight}/${candidate.parsed.style}`
    );

    if (group && group.length > 1) {
      customCandidates.push(candidate);
      return;
    }

    staticVariants.push({
      kind: 'static',
      id: candidate.row.id,
      name: candidate.name,
      weight: candidate.parsed.weight,
      style: candidate.parsed.style,
      url: candidate.file.url,
      format: candidate.file.format,
    });
  });

  let variable: NoBadFontsVariableVariant | null = null;

  if (singleVariable) {
    const [candidate] = variableCandidates;

    variable = {
      kind: 'variable',
      id: candidate.row.id,
      name: candidate.name,
      url: candidate.file.url,
      format: candidate.file.format,
    };
  }

  const custom = customCandidates.map(
    (candidate): NoBadFontsCustomVariant => ({
      kind: 'custom',
      id: candidate.row.id,
      name: candidate.name,
      url: candidate.file.url,
      format: candidate.file.format,
    })
  );

  staticVariants.sort(
    (a, b) =>
      a.weight - b.weight ||
      Number(a.style === 'italic') - Number(b.style === 'italic') ||
      a.name.localeCompare(b.name)
  );

  return {
    static: staticVariants,
    variable,
    custom,
    unsupported: unsupportedVariants,
  };
};

const requestVariants = async (): Promise<
  Map<string, NoBadFontsVariantSet>
> => {
  const message: GetNoBadFontsVariants = {
    name: 'GetNoBadFontsVariants',
  };
  const rows = await chrome.runtime
    .sendMessage<GetNoBadFontsVariants, GetNoBadFontsVariantsResponse>(message)
    .catch(() => null);

  if (!rows) {
    throw new NoBadFontsRequestError();
  }

  const byFont = new Map<string, Array<NoBadFontsVariantRow>>();

  rows.forEach(row => {
    if (!FONT_ID.test(row.font_id)) {
      return;
    }

    const group = byFont.get(row.font_id) ?? [];

    group.push(row);
    byFont.set(row.font_id, group);
  });

  const variants = new Map<string, NoBadFontsVariantSet>();

  byFont.forEach((group, fontId) => {
    variants.set(fontId, normalizeVariants(group));
  });

  return variants;
};

/**
 * Loads and parses every font's variants once, reusing the request while it
 * is in flight or resolved. A failed request is dropped so Retry starts a
 * new one.
 */
export const loadVariants = (): Promise<
  Map<string, NoBadFontsVariantSet>
> => {
  if (!variantsRequest) {
    variantsRequest = requestVariants().catch(error => {
      variantsRequest = null;
      throw error;
    });
  }

  return variantsRequest;
};

export const clearVariantsCache = (): void => {
  variantsRequest = null;
};
