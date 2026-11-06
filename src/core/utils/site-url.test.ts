import { getSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  it('uses the canonical site', () => {
    expect(getSiteUrl('/docs')).toBe('https://www.nobadfonts.in/docs');
  });
});
