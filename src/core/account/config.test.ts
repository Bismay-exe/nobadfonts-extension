import { getAccountConfig } from './config';

const ENV_KEYS = [
  'NOBADFONTS_OAUTH_CLIENT_ID',
  'NOBADFONTS_SUPABASE_URL',
  'NOBADFONTS_SUPABASE_ANON_KEY',
] as const;

const original = Object.fromEntries(
  ENV_KEYS.map(name => [name, process.env[name]])
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  for (const name of ENV_KEYS) {
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of ENV_KEYS) {
    const value = original[name];

    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('getAccountConfig', () => {
  it('is null without an OAuth client', () => {
    expect(getAccountConfig()).toBeNull();
  });

  it('uses the build client and trims the project URL', () => {
    process.env.NOBADFONTS_OAUTH_CLIENT_ID = ' client-id ';
    process.env.NOBADFONTS_SUPABASE_URL = 'https://dev.supabase.co///';
    process.env.NOBADFONTS_SUPABASE_ANON_KEY = 'dev-anon-key';

    expect(getAccountConfig()).toEqual({
      supabaseUrl: 'https://dev.supabase.co',
      anonKey: 'dev-anon-key',
      clientId: 'client-id',
      scopes: ['openid', 'profile', 'email'],
    });
  });

  it('asks only for the scopes the account needs', () => {
    process.env.NOBADFONTS_OAUTH_CLIENT_ID = 'client-id';

    expect(getAccountConfig()?.scopes).toEqual(['openid', 'profile', 'email']);
    expect(getAccountConfig()?.scopes).not.toContain('offline_access');
  });
});
