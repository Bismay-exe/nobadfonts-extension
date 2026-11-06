import messages from 'virtual:stylebot-locale';
import { fn } from '@storybook/test';

import {
  add as addRecentColor,
  getAll as getAllRecentColors,
} from '@/apps/background/color-history';

import {
  defaultOptions,
  defaultCommands,
  defaultReadabilitySettings,
} from '@stylebot/settings';
import type { AccountState } from '@stylebot/account';
import type {
  Style,
  StylebotOptions,
  StylebotCommands,
  ReadabilitySettings,
  VersionHistory,
  NoBadFontsFontsResponse,
  NoBadFontsVariantsResponse,
} from '@stylebot/types';

import { isMac, toBrowserShortcut } from '@stylebot/utils';
import {
  NO_BAD_FONTS_CATALOG,
  NO_BAD_FONTS_VARIANTS,
} from '../fixtures/no-bad-fonts';

/**
 * A response a story can leave unresolved, to show the surface still waiting.
 */
type Pending<T> = T | 'pending';

export type ChromeShimOptions = {
  styles?: Array<Style>;
  defaultStyle?: Style;
  options?: Partial<StylebotOptions>;
  commands?: Partial<StylebotCommands>;
  readabilitySettings?: Partial<ReadabilitySettings>;
  recentColors?: Array<string>;
  storage?: Record<string, unknown>;
  isOpen?: boolean;
  pageReaderable?: boolean;
  tabUrl?: string;
  // The page script's answer; "unreachable" leaves the message unanswered.
  pageSupport?: 'supported' | 'unsupported' | 'unreachable';
  versionHistory?: Pending<VersionHistory>;
  // Optional permissions already granted, and how the prompt answers a request.
  permissions?: { granted?: boolean; allowRequest?: boolean };
  noBadFonts?: NoBadFontsShimOptions;
  // What the account row and tab read, and where signing out leaves them.
  account?: AccountState;
};

export type NoBadFontsShimOptions = {
  // The catalog rows the picker reads; null stands in for a failed request.
  catalog?: Pending<NoBadFontsFontsResponse>;
  // Every font's variant rows in one answer; null stands in for a failure.
  variants?: Pending<NoBadFontsVariantsResponse>;
};

type Callback = (response?: unknown) => void;

/* Pinned so stories don't churn on every release. */
const MANIFEST_VERSION = '3.2.0';
const RELEASE_VERSION = MANIFEST_VERSION.split('.').slice(0, 2).join('.');

const getMessage = (key: string, substitutions: Array<string> = []) => {
  const entry = messages[key];

  if (!entry) {
    return '';
  }

  return entry.message.replace(/\$([^$]+)\$/g, (_: string, name: string) => {
    const index = Number(entry.placeholders?.[name]?.content.slice(1)) - 1;
    return substitutions[index] ?? '';
  });
};

/* Like Chrome, answers asynchronously through a callback when one is
   passed and always resolves a promise, so both call styles work. */
const respond = (callback: Callback | undefined, value: unknown) =>
  new Promise<unknown>(resolve => {
    setTimeout(async () => {
      const resolved = await value;
      callback?.(resolved);
      resolve(resolved);
    }, 0);
  });

/**
 * Installs a fresh in-memory window.chrome for the current story so
 * production code paths (i18n, messaging, storage) run unmodified.
 */
export const installChrome = (overrides: ChromeShimOptions = {}): void => {
  const options = { ...defaultOptions, ...overrides.options };
  const commands = { ...defaultCommands, ...overrides.commands };
  const readabilitySettings = {
    ...defaultReadabilitySettings,
    ...overrides.readabilitySettings,
  };
  const storage: Record<string, unknown> = {
    [`notification~release/${RELEASE_VERSION}`]: true,
    recentColors: overrides.recentColors ?? [],
    'readability-settings': readabilitySettings,
    options,
    commands,
    // The popup reads a page's styles straight from storage.
    styles: Object.fromEntries(
      (overrides.styles ?? []).map(({ url, ...style }) => [url, style])
    ),
    ...overrides.storage,
  };
  const tab = {
    id: 1,
    active: true,
    url: overrides.tabUrl ?? 'https://example.com/article',
  };

  let account: AccountState = overrides.account ?? { status: 'signed-out' };

  const permissions = {
    granted: false,
    allowRequest: true,
    ...overrides.permissions,
  };

  const runtimeResponses: Record<
    string,
    (message: {
      name: string;
      optionName?: keyof StylebotOptions;
      color?: string;
    }) => unknown
  > = {
    GetStylesForPage: () => ({
      styles: overrides.styles ?? [],
      defaultStyle: overrides.defaultStyle,
    }),
    GetCommands: () => commands,
    SetCommands: message => (message as unknown as { value: unknown }).value,
    GetOption: message =>
      message.optionName ? options[message.optionName] : undefined,
    GetAllOptions: () => options,
    GetReadabilitySettings: () => readabilitySettings,
    // The background's own history, over the shim's storage.
    GetRecentColors: () => getAllRecentColors(),
    AddRecentColor: ({ color = '' }) => addRecentColor(color),

    ScanVersionHistory: () => {
      if (overrides.versionHistory === 'pending') {
        return new Promise(() => undefined);
      }

      return {
        scan: overrides.versionHistory ?? {
          versions: [],
          hasMore: false,
          sites: [],
        },
      };
    },

    RestoreVersion: () => ({ ok: true, entryId: 'restored' }),

    UndoRestore: () => ({ ok: true }),

    OpenEditorSidePanel: () => true,

    CreateProfile: () => ({ profileId: 'created' }),

    GetNoBadFontsCatalog: () => {
      const catalog =
        overrides.noBadFonts?.catalog === undefined
          ? NO_BAD_FONTS_CATALOG
          : overrides.noBadFonts.catalog;

      return catalog === 'pending' ? new Promise(() => undefined) : catalog;
    },
    GetNoBadFontsVariants: () => {
      const variants =
        overrides.noBadFonts?.variants === undefined
          ? NO_BAD_FONTS_VARIANTS
          : overrides.noBadFonts.variants;

      return variants === 'pending' ? new Promise(() => undefined) : variants;
    },

    GetNoBadFontsAccount: () => account,
    StartNoBadFontsSignIn: () => ({ opened: true }),
    NoBadFontsSignOut: () => {
      account = { status: 'signed-out' };
      return { ok: true };
    },
  };

  const tabResponses: Record<string, () => unknown> = {
    GetIsStylebotOpen: () => overrides.isOpen ?? false,
    GetIsPageReaderable: () => overrides.pageReaderable ?? true,
    GetCanStylePage: () => {
      const support = overrides.pageSupport ?? 'supported';
      return support === 'unreachable' ? undefined : support === 'supported';
    },
  };

  const shim = {
    runtime: {
      sendMessage: (message: { name: string }, callback?: Callback) =>
        respond(callback, runtimeResponses[message.name]?.(message)),
      getURL: (p: string) => `/${p}`,
      getManifest: () => ({ version: MANIFEST_VERSION }),
      onMessage: {
        addListener: () => undefined,
        removeListener: () => undefined,
      },
    },

    i18n: { getMessage, getUILanguage: () => 'en' },

    storage: {
      local: {
        get: (keys: string | Array<string>, callback?: Callback) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const items: Record<string, unknown> = {};

          list.forEach(key => {
            items[key] = storage[key];
          });

          return respond(callback, items);
        },
        set: (items: Record<string, unknown>, callback?: Callback) => {
          Object.assign(storage, items);
          return respond(callback, undefined);
        },
      },
      onChanged: {
        addListener: () => undefined,
        removeListener: () => undefined,
      },
    },

    tabs: {
      sendMessage: (
        _id: number,
        message: { name: string },
        callback?: Callback
      ) => respond(callback, tabResponses[message.name]?.()),
      create: () => respond(undefined, undefined),
      // The editor's page-bridge port; the stand-in page has no listener.
      connect: () => ({
        postMessage: () => undefined,
        disconnect: () => undefined,
      }),
      query: (_info: unknown, callback?: Callback) => respond(callback, [tab]),
    },

    windows: {
      getCurrent: (_info: unknown, callback?: Callback) =>
        respond(callback, { tabs: [tab] }),
    },

    sidePanel: {
      setOptions: () => Promise.resolve(),
      open: () => Promise.resolve(),
      close: () => Promise.resolve(),
    },

    permissions: {
      contains: fn((_permissions: unknown, callback?: Callback) =>
        respond(callback, permissions.granted)
      ),
      request: fn((_permissions: unknown, callback?: Callback) => {
        permissions.granted = permissions.allowRequest;
        return respond(callback, permissions.allowRequest);
      }),
      remove: fn((_permissions: unknown, callback?: Callback) => {
        permissions.granted = false;
        return respond(callback, true);
      }),
    },

    // The browser owns the global shortcuts; this one reports the seeded ones.
    commands: {
      getAll: () =>
        Promise.resolve(
          Object.entries(commands).map(([name, combo]) => ({
            name,
            shortcut: toBrowserShortcut(combo, isMac()) ?? '',
          }))
        ),
    },
  };

  (window as unknown as { chrome: typeof shim }).chrome = shim;
};
