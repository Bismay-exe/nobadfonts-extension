# NoBadFonts

The typography picker reads fonts from the public [NoBadFonts](https://www.nobadfonts.in) catalog and adds the chosen family to the page's saved CSS.

## Catalog and licenses

The catalog comes from every published row of the NoBadFonts Supabase project whose `family_role` is not `parent`. Reads use the public anon key and the same row-level policies as the site, so no other backend or private credential is involved. The background pages past Supabase's row cap, so a growing catalog does not silently lose its tail.

A font with `license.redistribution_allowed` set to `false` stays visible with a **Restricted** chip and a note explaining that it cannot be applied, plus the same link to its NoBadFonts page. A missing or unknown value stays visible with an **Unverified license** warning; neither state claims the font is safe to redistribute or use commercially. The license type and license link are shown for information only.

## Variants

Static faces map to a weight and style only when the variant name is unambiguous (`Regular`, `Bold`, `Bold Italic`, …). Width names, unknown names, duplicate weight/style pairs, extra variable faces, and any other name that would need a guess become **Other faces**: selectable under an alias made from the font and face names, with no weight or style claimed. One normal variable face is selectable under a `<family> Variable` alias and leaves the element's existing weight and style alone.

A face with no file, or with a file outside the NoBadFonts hosts, is the only kind that cannot be selected. Its row stays under **Unsupported variants** with the reason. When a face has no usable WOFF2 file, its WOFF file is used instead.

## Picker

The typography section of the editor has a **Browse NoBadFonts** row that opens the picker in place of the panel, so the catalog gets the panel's full width. The picker has:

- **Apply to**, limited to the element selected in the inspector, `body`, and `h1`–`h6`. Nothing else can be targeted: `body` alone does not override a heading's own rule, so selecting a heading level is an explicit choice, and there is no universal selector.
- A search field and a category filter over the catalog already in memory.
- One row per font with its designer and category, plus a **Restricted** or **Unverified license** chip when it applies. Opening a row lists its usable faces and any unsupported ones.

The catalog and all variant metadata load in parallel when the picker opens, each in its own paginated request. Opening a font therefore does not wait on another request. A failed request shows its own error with **Retry**, and no font file is downloaded until a face is previewed or applied.

Hovering a face previews it after a short pause, so sweeping down the list does not fire a request per row; focusing or clicking previews it immediately. Every preview is a single `@font-face` for the selected file under a unique alias, so it never waits on a stylesheet and cannot disturb the saved font. **Cancel**, Escape, or closing the picker removes the preview and changes nothing.

**Apply** saves the `@font-face` rules, the quoted `font-family` and, for a static face, `font-weight` and `font-style` to the site's CSS as one undo step, then closes the picker. A static face writes every static file the font offers, so changing the weight later still has its file. A variable face writes its alias and sets only `font-family`; a custom face writes its alias and claims no weight or style. Applying removes any `/css` import an older picker version saved for the same font, along with the font's earlier generated faces.

Because the rules are ordinary saved CSS, code mode sees them like any other rule. Older saved `/css` imports still work: the background reduces them to `@font-face` rules before the page sees them.

## Permissions

The manifest adds two host permissions:

- `https://www.nobadfonts.in/*` for the catalog page and font files
- `https://wcegdxhvgwbeskaidlxr.supabase.co/*` for catalog and variant reads

Chrome and Edge already request `<all_urls>`, so these hosts add no new install warning there. Firefox and Safari request specific hosts: Firefox lists them in the site-access prompt and existing users may have to approve the new hosts after an update; Safari exposes them through its per-site extension settings. Both stay disabled until the user grants access, and catalog requests fail with the picker's normal retry path when that access is missing.

The picker writes concrete `@font-face` rules, so showing and applying a face needs no remote stylesheet. Older saved imports are still fetched through the background, which keeps the page's Content Security Policy from blocking them. Font files are loaded under the page's policy in Firefox, as with Google Fonts; the existing blocked-font fallback handles that case.
