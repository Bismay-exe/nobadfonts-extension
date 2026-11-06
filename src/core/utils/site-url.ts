const SITE = 'https://www.nobadfonts.in';

/**
 * A NoBadFonts site page, such as the manual at `/docs`.
 */
export const getSiteUrl = (path: string): string => `${SITE}${path}`;
