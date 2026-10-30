import {
  getNoBadFontsFontFile,
  getWebFontFileUrls,
  isAllowedWebFontFileUrl,
  isNoBadFontsCssUrl,
  isNoBadFontsFontFileUrl,
  isNoBadFontsHostUrl,
} from './no-bad-fonts';

describe('NoBadFonts urls', () => {
  it('still recognises the CSS request shapes older styles saved', () => {
    expect(
      isNoBadFontsCssUrl('https://www.nobadfonts.in/css/rock-salt?weights=400')
    ).toBe(true);
    expect(
      isNoBadFontsCssUrl(
        'https://www.nobadfonts.in/css/rock-salt?weights=400,700'
      )
    ).toBe(true);
    expect(
      isNoBadFontsCssUrl(
        'https://www.nobadfonts.in/css/rock-salt?variable=true'
      )
    ).toBe(true);
  });

  it('rejects other hosts, paths, schemes and unexpected queries', () => {
    expect(
      isNoBadFontsCssUrl('https://nobadfonts.in/css/rock-salt?weights=400')
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl('https://www.nobadfonts.in/fonts/rock-salt')
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl('http://www.nobadfonts.in/css/rock-salt?weights=400')
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl(
        'https://www.nobadfonts.in/css/rock-salt?weights=400&foo=bar'
      )
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl(
        'https://www.nobadfonts.in/css/rock-salt?weights=400,400'
      )
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl('https://www.nobadfonts.in/css/rock-salt?weights=450')
    ).toBe(false);
    expect(
      isNoBadFontsCssUrl(
        'https://www.nobadfonts.in/css/rock-salt?variable=false'
      )
    ).toBe(false);
  });

  it('recognises the site host but not lookalikes', () => {
    expect(
      isNoBadFontsHostUrl('https://www.nobadfonts.in/fonts/rock-salt')
    ).toBe(true);
    expect(isNoBadFontsHostUrl('https://www.nobadfonts.in.evil.test/')).toBe(
      false
    );
  });
});

describe('getNoBadFontsFontFile', () => {
  it('keeps proxy files and their format', () => {
    expect(
      getNoBadFontsFontFile(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff2'
      )
    ).toEqual({
      url: 'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff2',
      format: 'woff2',
    });
    expect(
      getNoBadFontsFontFile(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff'
      )
    ).toEqual({
      url: 'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff',
      format: 'woff',
    });
  });

  it('rewrites a public storage file to the immutable proxy', () => {
    expect(
      getNoBadFontsFontFile(
        'https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/font/rock-salt/variants/Regular/rock-salt.woff2'
      )
    ).toEqual({
      url: 'https://www.nobadfonts.in/font-file/font/rock-salt/variants/Regular/rock-salt.woff2',
      format: 'woff2',
    });
  });

  it('rejects other paths, formats, queries and hosts', () => {
    expect(
      getNoBadFontsFontFile(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.otf'
      )
    ).toBeNull();
    expect(
      getNoBadFontsFontFile(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff2?x=1'
      )
    ).toBeNull();
    expect(
      getNoBadFontsFontFile(
        'https://example.com/storage/v1/object/public/fonts/a.woff2'
      )
    ).toBeNull();
    expect(getNoBadFontsFontFile('not a url')).toBeNull();
    expect(getNoBadFontsFontFile(null)).toBeNull();
  });

  it('recognises only a resolved WOFF or WOFF2 file as a font file', () => {
    expect(
      isNoBadFontsFontFileUrl(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff2'
      )
    ).toBe(true);
    expect(
      isNoBadFontsFontFileUrl(
        'https://wcegdxhvgwbeskaidlxr.supabase.co/storage/v1/object/public/fonts/font/rock-salt/rock-salt.woff2'
      )
    ).toBe(true);
    expect(
      isNoBadFontsFontFileUrl(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.otf'
      )
    ).toBe(false);
  });

  it('allows Google Fonts and NoBadFonts files only', () => {
    expect(
      isAllowedWebFontFileUrl('https://fonts.gstatic.com/s/lobster/a.woff2')
    ).toBe(true);
    expect(
      isAllowedWebFontFileUrl(
        'https://www.nobadfonts.in/font-file/a/rock-salt/rock-salt.woff'
      )
    ).toBe(true);
    expect(isAllowedWebFontFileUrl('https://example.com/a.woff2')).toBe(false);
  });

  it('finds both providers without duplicates', () => {
    const css = `
      @font-face { src: url(https://fonts.gstatic.com/s/lobster/a.woff2); }
      @font-face { src: url(https://www.nobadfonts.in/font-file/a/nobad/nobad.woff2); }
      @font-face { src: url(https://www.nobadfonts.in/font-file/a/nobad/nobad.woff2); }
      @font-face { src: url(https://example.com/c.woff2); }
    `;

    expect(getWebFontFileUrls(css)).toEqual([
      'https://fonts.gstatic.com/s/lobster/a.woff2',
      'https://www.nobadfonts.in/font-file/a/nobad/nobad.woff2',
    ]);
  });
});
