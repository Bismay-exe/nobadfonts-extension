export type NoBadFontsLicense = {
  license_url?: string | null;
  license_type?: string | null;
  personal_use?: boolean | null;
  commercial_use?: boolean | null;
  modification_allowed?: boolean | null;
  redistribution_allowed?: boolean | null;
};

export type NoBadFontsFontRow = {
  id: string;
  name: string;
  slug: string;
  designer?: string | null;
  category?: string | null;
  tags?: Array<string> | null;
  license_type?: string | null;
  commercial_use?: boolean | null;
  is_published?: boolean | null;
  family_role?: string | null;
  license?: NoBadFontsLicense | Array<NoBadFontsLicense> | null;
};

export type NoBadFontsVariantRow = {
  id: string;
  font_id: string;
  variant_name: string;
  woff2_url?: string | null;
  woff_url?: string | null;
  order_index?: number | null;
};

export type NoBadFontsFontsResponse = Array<NoBadFontsFontRow> | null;
export type NoBadFontsVariantsResponse = Array<NoBadFontsVariantRow> | null;
