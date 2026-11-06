import type { ActionTree, Store } from 'vuex';
import Vuex from 'vuex';

import { defaultOptions, defaultCommands } from '@stylebot/settings';
import { getCurrentTimestamp } from '@stylebot/utils';
import {
  activateProfile,
  addProfile,
  removeProfile,
  renameProfile,
  setProfileCss,
} from '@stylebot/saved-styles';
import type {
  StyleMap,
  StyleWithoutUrl,
  StylebotOptions,
  StylebotCommands,
  RestoreOptions,
} from '@stylebot/types';
import {
  scanVersionHistory,
  restoreVersion,
  undoRestore,
} from '@/apps/options/utils';

export type OptionsState = {
  styles: StyleMap;
  options: StylebotOptions | null;
  commands: StylebotCommands;
};

export type OptionsStateOverrides = Partial<Omit<OptionsState, 'options'>> & {
  options?: Partial<StylebotOptions>;
};

const NOOP_ACTIONS = [
  'getAllStyles',
  'getAllOptions',
  'getCommands',
  'deleteStyle',
  'deleteAllStyles',
  'enableStyle',
  'disableStyle',
  'enableAllStyles',
  'disableAllStyles',
];

const noop = () => undefined;

/**
 * Applies an edit to one seeded style, as the real store does without
 * messaging the background.
 */
const editStyle = (
  state: OptionsState,
  url: string,
  edit: (style: StyleWithoutUrl) => StyleWithoutUrl
) => {
  if (state.styles[url]) {
    state.styles = { ...state.styles, [url]: edit(state.styles[url]) };
  }
};

const actions: ActionTree<OptionsState, OptionsState> = {
  ...Object.fromEntries(NOOP_ACTIONS.map(name => [name, noop])),

  saveStyle(
    { state },
    {
      initialUrl,
      url,
      drafts,
    }: { initialUrl?: string; url: string; drafts: Record<string, string> }
  ) {
    let style: StyleWithoutUrl = state.styles[initialUrl || url] ?? {
      css: '',
      enabled: true,
      readability: false,
      modifiedTime: '',
    };

    for (const [id, css] of Object.entries(drafts)) {
      style = setProfileCss(style, id, css);
    }

    const styles = {
      ...state.styles,
      [url]: { ...style, modifiedTime: getCurrentTimestamp() },
    };

    if (initialUrl && initialUrl !== url) {
      delete styles[initialUrl];
    }

    state.styles = styles;
  },

  importStyles({ state }, styles: StyleMap) {
    state.styles = styles;
    return true;
  },

  createProfile(
    { state },
    {
      url,
      id,
      name,
      css,
    }: { url: string; id: string; name: string; css: string }
  ) {
    editStyle(state, url, style =>
      addProfile(style, { id, name, css, activate: false })
    );
  },

  renameProfile(
    { state },
    { url, id, name }: { url: string; id: string; name: string }
  ) {
    editStyle(state, url, style => renameProfile(style, id, name));
  },

  deleteProfile({ state }, { url, id }: { url: string; id: string }) {
    editStyle(state, url, style => removeProfile(style, id));
  },

  setActiveProfile({ state }, { url, id }: { url: string; id: string }) {
    editStyle(state, url, style => activateProfile(style, id));
  },

  setOption(
    { state },
    {
      name,
      value,
    }: {
      name: keyof StylebotOptions;
      value: StylebotOptions[keyof StylebotOptions];
    }
  ) {
    state.options = { ...(state.options as StylebotOptions), [name]: value };
  },

  scanVersionHistory(
    _context,
    options: { limit?: number; site?: string } = {}
  ) {
    return scanVersionHistory(options);
  },

  restoreVersion(
    _context,
    { versionId, ...options }: { versionId: string } & RestoreOptions
  ) {
    return restoreVersion(versionId, options);
  },

  undoRestore(
    _context,
    { entryId, profileId }: { entryId: string; profileId?: string }
  ) {
    return undoRestore(entryId, profileId);
  },
};

/**
 * Options-page store seeded up front; the fetch actions App.vue's created()
 * calls are no-ops so the seeded state survives mount.
 */
export const createOptionsStore = (
  overrides: OptionsStateOverrides = {}
): Store<OptionsState> =>
  new Vuex.Store<OptionsState>({
    state: {
      styles: {},
      commands: defaultCommands,
      ...overrides,
      options: { ...defaultOptions, ...overrides.options },
    },
    actions,
  });
