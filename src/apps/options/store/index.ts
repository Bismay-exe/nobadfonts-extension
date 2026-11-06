import Vue from 'vue';
import type { Store } from 'vuex';
import Vuex from 'vuex';

import * as postcss from 'postcss';

import { defaultCommands } from '@stylebot/settings';
import type {
  StyleMap,
  StyleWithoutUrl,
  StylebotOptions,
  StylebotCommands,
  RestoreOptions,
} from '@stylebot/types';
import { getCurrentTimestamp } from '@stylebot/utils';
import {
  activateProfile,
  addProfile,
  removeProfile,
  renameProfile,
  setProfileCss,
} from '@stylebot/saved-styles';

import {
  getAllStyles,
  setAllStyles,
  setOption,
  getAllOptions,
  getCommands,
  scanVersionHistory,
  restoreVersion,
  undoRestore,
} from '../utils';

type State = {
  styles: StyleMap;

  options: StylebotOptions | null;
  commands: StylebotCommands;
};

/**
 * Applies an edit to one stored style and saves every style, stamping the
 * edited one unless told not to. Does nothing when the style is missing or
 * the edit is a no-op.
 */
const updateStyle = (
  state: State,
  url: string,
  edit: (style: StyleWithoutUrl) => StyleWithoutUrl,
  { stamp = true }: { stamp?: boolean } = {}
) => {
  const style = state.styles[url];
  const edited = style && edit(style);

  if (!edited || edited === style) {
    return;
  }

  state.styles = {
    ...state.styles,
    [url]: stamp ? { ...edited, modifiedTime: getCurrentTimestamp() } : edited,
  };
  setAllStyles(state.styles);
};

/**
 * Creates the options page's store.
 */
export const createStore = (): Store<State> => {
  Vue.use(Vuex);

  return new Vuex.Store<State>({
    state: {
      styles: {},
      options: null,
      commands: defaultCommands,
    },

    actions: {
      async getAllStyles({ state }) {
        state.styles = await getAllStyles();
      },

      async getAllOptions({ state }) {
        state.options = await getAllOptions();
      },

      async getCommands({ state }) {
        state.commands = await getCommands();
      },

      scanVersionHistory(
        _context,
        options: { limit?: number; site?: string } = {}
      ) {
        return scanVersionHistory(options);
      },

      /**
       * The background page owns the write, so the restore rides the same chain
       * as any other edit — which is what records it in the history too, making
       * the restore itself something that can be put back.
       */
      async restoreVersion(
        { dispatch },
        { versionId, ...options }: { versionId: string } & RestoreOptions
      ) {
        const result = await restoreVersion(versionId, options);
        await dispatch('getAllStyles');
        return result;
      },

      async undoRestore(
        { dispatch },
        { entryId, profileId }: { entryId: string; profileId?: string }
      ) {
        const ok = await undoRestore(entryId, profileId);
        await dispatch('getAllStyles');
        return ok;
      },

      /**
       * Replaces every saved style with an imported set, keeping the page's
       * copy as it was when the background fails to store them.
       */
      async importStyles({ state }, styles: StyleMap): Promise<boolean> {
        const ok = await setAllStyles(styles);

        if (ok) {
          state.styles = styles;
        }

        return ok;
      },

      /**
       * Saves edited css for any of a style's profiles, keyed by profile id,
       * moving the style when its url changed.
       */
      saveStyle(
        { state },
        {
          initialUrl,
          url,
          drafts,
        }: { initialUrl?: string; url: string; drafts: Record<string, string> }
      ) {
        try {
          // validate by parsing
          Object.values(drafts).forEach(css => postcss.parse(css));
          const styles = { ...state.styles };

          const existing = styles[initialUrl || url] ?? styles[url];
          let style: StyleWithoutUrl = existing ?? {
            css: '',
            readability: false,
            enabled: true,
            modifiedTime: '',
          };

          for (const [id, css] of Object.entries(drafts)) {
            style = setProfileCss(style, id, css);
          }

          styles[url] = { ...style, modifiedTime: getCurrentTimestamp() };

          if (initialUrl && initialUrl !== url) {
            delete styles[initialUrl];
          }

          setAllStyles(styles);
          state.styles = styles;
        } catch {
          // todo
        }
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
        updateStyle(state, url, style =>
          addProfile(style, { id, name, css, activate: false })
        );
      },

      renameProfile(
        { state },
        { url, id, name }: { url: string; id: string; name: string }
      ) {
        updateStyle(state, url, style => renameProfile(style, id, name));
      },

      deleteProfile({ state }, { url, id }: { url: string; id: string }) {
        updateStyle(state, url, style => removeProfile(style, id));
      },

      setActiveProfile({ state }, { url, id }: { url: string; id: string }) {
        // Not an edit: which profile is applied stays on this device.
        updateStyle(state, url, style => activateProfile(style, id), {
          stamp: false,
        });
      },

      deleteStyle({ state }, url: string) {
        const styles = { ...state.styles };

        delete styles[url];
        setAllStyles(styles);

        state.styles = styles;
      },

      deleteAllStyles({ state }) {
        state.styles = {};
        setAllStyles(state.styles);
      },

      enableStyle({ state }, url: string) {
        if (state.styles[url]) {
          state.styles[url].enabled = true;
        }

        setAllStyles(state.styles);
      },

      disableStyle({ state }, url: string) {
        if (state.styles[url]) {
          state.styles[url].enabled = false;
        }

        setAllStyles(state.styles);
      },

      enableAllStyles({ state }) {
        for (const url in state.styles) {
          state.styles[url].enabled = true;
        }

        setAllStyles(state.styles);
      },

      disableAllStyles({ state }) {
        for (const url in state.styles) {
          state.styles[url].enabled = false;
        }
        setAllStyles(state.styles);
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
        // @ts-expect-error TS cannot correlate the key/value union members of StylebotOptions.
        state.options[name] = value;
        setOption(name, value);
      },
    },
  });
};
