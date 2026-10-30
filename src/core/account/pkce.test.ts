import { base64Url, createChallenge, createRandomString } from './pkce';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('base64Url', () => {
  it('encodes bytes without padding', () => {
    expect(base64Url(new TextEncoder().encode('Hello'))).toBe('SGVsbG8');
  });

  it('uses the URL-safe alphabet instead of + and /', () => {
    expect(base64Url(new Uint8Array([0xfb, 0xff, 0xbf]))).toBe('-_-_');
  });
});

describe('createRandomString', () => {
  it('makes a URL-safe string long enough for a PKCE verifier', () => {
    const value = createRandomString();

    expect(value).toHaveLength(43);
    expect(value).toMatch(BASE64URL);
  });

  it('never repeats a value', () => {
    const values = new Set(
      Array.from({ length: 50 }, () => createRandomString())
    );

    expect(values.size).toBe(50);
  });
});

describe('createChallenge', () => {
  it('matches the S256 vector from RFC 7636', async () => {
    await expect(
      createChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
    ).resolves.toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('is URL-safe', async () => {
    const challenge = await createChallenge(createRandomString());

    expect(challenge).toHaveLength(43);
    expect(challenge).toMatch(BASE64URL);
  });
});
