import { ContextMenu, handleContextMenuClick } from './contextmenu';
import { handleCommand } from './global-commands';
import { configureSidePanelTabs, initSidePanelTabs } from './side-panel-tabs';
import {
  onEditorSidePanelOpened,
  initSidePanel,
  reloadForSidePanelGrant,
} from './side-panel';
import * as editorWindow from './editor-window';
import { restoreOpenTabs, restoreTab } from './restore-tabs';

import {
  GetCommands,
  GetOption,
  SetOption,
  GetAllOptions,
  OpenOptionsPage,
  OpenShortcutsPage,
  OpenReportIssuePage,
  SetStyle,
  MoveStyle,
  GetAllStyles,
  SetAllStyles,
  GetStylesForPage,
  EnableStyle,
  DisableStyle,
  SetActiveProfile,
  CreateProfile,
  RenameProfile,
  DeleteProfile,
  DeleteStyle,
  SetReadability,
  GetReadabilitySettings,
  SetReadabilitySettings,
  GetImportCss,
  GetNoBadFontsCatalog,
  GetNoBadFontsVariants,
  GetCompiledStyles,
  GetGoogleWebFontExists,
  GetWebFontFile,
  ScanVersionHistory,
  RestoreVersion,
  UndoRestore,
  GetRecentColors,
  AddRecentColor,
  OpenEditorWindow,
  ToggleEditorWindow,
  CloseEditorWindow,
  GetIsEditorWindowOpen,
  OpenEditorSidePanel,
  CloseEditorSidePanel,
} from './messages';

import {
  GetNoBadFontsAccount,
  NoBadFontsSignInReady,
  NoBadFontsSignOut,
  StartNoBadFontsSignIn,
  isExtensionPage,
  sentFromAuthTab,
} from './account';
import { get as getOption, pruneRetired } from './options';

import type {
  TabUpdated,
  BackgroundPageMessage,
  BackgroundPageMessageResponse,
} from '@stylebot/types';

import {
  detectChromiumVariant,
  setNotification,
  getExtensionVersion,
  getReleaseNotificationId,
  getReleaseUrl,
  isMajorUpdate,
  recordInstallTime,
  getSiteUrl,
} from '@stylebot/utils';

/**
 * Registers the background's Chrome listeners. They must be registered
 * synchronously when the service worker starts, for Chrome to wake it for them.
 */
export const initListeners = (): void => {
  // Runs on install and on every update.
  chrome.runtime.onInstalled.addListener(
    async ({ reason, previousVersion }) => {
      configureSidePanelTabs();
      detectChromiumVariant().catch(() => undefined);

      if (reason === 'install' || reason === 'update') {
        recordInstallTime();
      }

      if (reason === 'install') {
        chrome.tabs.create({
          url: getSiteUrl('/'),
        });

        setNotification(getReleaseNotificationId(), true);
      }

      if (reason === 'update') {
        pruneRetired();
        // Before the release page opens, which gets the new content scripts.
        restoreOpenTabs();

        if (isMajorUpdate(previousVersion, getExtensionVersion())) {
          chrome.tabs.create({ url: getReleaseUrl(), active: false });
          setNotification(getReleaseNotificationId(), true);
        }
      }
    }
  );

  chrome.commands.onCommand.addListener(handleCommand);
  initSidePanelTabs();
  initSidePanel();

  // Pick up side-panel tabs on startup.
  chrome.runtime.onStartup.addListener(async () => {
    configureSidePanelTabs();
  });

  // When an existing tab is updated, refresh the context-menu.
  // A closed tab takes its editor window with it; a closed window is forgotten.
  chrome.tabs.onRemoved.addListener(tabId => {
    editorWindow.close(tabId);
  });

  chrome.windows.onRemoved.addListener(windowId => {
    editorWindow.forgetWindow(windowId);
  });

  // Only loads and URL changes: title, favicon and audio updates on a loaded
  // tab fire this too, and chatty tabs would keep waking the worker.
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (
      (changeInfo.status !== 'complete' && !changeInfo.url) ||
      tab.status !== 'complete'
    ) {
      return;
    }

    const option = await getOption('contextMenu');

    if (option) {
      if (tab.active) {
        ContextMenu.update(tab);
      }

      const message: TabUpdated = {
        name: 'TabUpdated',
      };

      if (!tab.url?.includes('chrome-extension://')) {
        chrome.tabs.sendMessage(tabId, message);
      }
    }
  });

  // A tab shown for the first time since an update gets Stylebot back, then
  // its context menu is refreshed, unless another tab was shown meanwhile.
  chrome.tabs.onActivated.addListener(async activeInfo => {
    await restoreTab(activeInfo.tabId);
    const option = await getOption('contextMenu');

    if (option) {
      const tab = await chrome.tabs
        .get(activeInfo.tabId)
        .catch(() => undefined);

      if (tab?.active) {
        ContextMenu.update(tab);
      }
    }
  });

  // Only messages that get an answer keep their channel open: one left open
  // rejects the sender's promise once the worker stops (#1211).
  chrome.runtime.onMessage.addListener(
    (
      message: BackgroundPageMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: BackgroundPageMessageResponse) => void
    ) => {
      switch (message.name) {
        case 'GetCommands':
          GetCommands(sendResponse);
          return true;

        case 'GetOption':
          GetOption(message, sendResponse);
          return true;
        case 'SetOption':
          SetOption(message);
          break;
        case 'GetAllOptions':
          GetAllOptions(sendResponse);
          return true;

        case 'OpenOptionsPage':
          OpenOptionsPage(message);
          break;
        case 'OpenShortcutsPage':
          OpenShortcutsPage();
          break;
        case 'OpenReportIssuePage':
          OpenReportIssuePage();
          break;

        case 'SetStyle':
          SetStyle(message);
          break;
        case 'MoveStyle':
          MoveStyle(message);
          break;
        case 'GetAllStyles':
          GetAllStyles(sendResponse);
          return true;
        case 'SetAllStyles':
          SetAllStyles(message, sendResponse);
          return true;
        case 'GetStylesForPage':
          GetStylesForPage(sender, sendResponse);
          return true;
        case 'EnableStyle':
          EnableStyle(message);
          break;
        case 'DisableStyle':
          DisableStyle(message);
          break;
        case 'SetActiveProfile':
          SetActiveProfile(message);
          break;
        case 'CreateProfile':
          CreateProfile(message, sendResponse);
          return true;
        case 'RenameProfile':
          RenameProfile(message);
          break;
        case 'DeleteProfile':
          DeleteProfile(message);
          break;
        case 'DeleteStyle':
          DeleteStyle(message);
          break;

        case 'SetReadability':
          SetReadability(message, sender);
          break;
        case 'GetReadabilitySettings':
          GetReadabilitySettings(sendResponse);
          return true;
        case 'SetReadabilitySettings':
          SetReadabilitySettings(message);
          break;

        case 'GetImportCss':
          GetImportCss(message, sendResponse);
          return true;
        case 'GetNoBadFontsCatalog':
          GetNoBadFontsCatalog(sendResponse);
          return true;
        case 'GetNoBadFontsVariants':
          GetNoBadFontsVariants(sendResponse);
          return true;

        case 'GetNoBadFontsAccount':
          if (isExtensionPage(sender)) {
            GetNoBadFontsAccount(sendResponse);
            return true;
          }
          break;
        case 'StartNoBadFontsSignIn':
          if (isExtensionPage(sender)) {
            StartNoBadFontsSignIn(sendResponse);
            return true;
          }
          break;
        case 'NoBadFontsSignInReady':
          if (sentFromAuthTab(sender)) {
            NoBadFontsSignInReady(sendResponse);
            return true;
          }
          break;
        case 'NoBadFontsSignOut':
          if (isExtensionPage(sender)) {
            NoBadFontsSignOut(sendResponse);
            return true;
          }
          break;
        case 'GetCompiledStyles':
          GetCompiledStyles(sendResponse);
          return true;
        case 'GetGoogleWebFontExists':
          GetGoogleWebFontExists(message, sendResponse);
          return true;
        case 'GetWebFontFile':
          GetWebFontFile(message, sendResponse);
          return true;
        case 'ScanVersionHistory':
          ScanVersionHistory(message, sendResponse);
          return true;
        case 'RestoreVersion':
          RestoreVersion(message, sendResponse);
          return true;
        case 'UndoRestore':
          UndoRestore(message, sendResponse);
          return true;

        case 'GetRecentColors':
          GetRecentColors(sendResponse);
          return true;
        case 'AddRecentColor':
          AddRecentColor(message, sendResponse);
          return true;

        case 'OpenEditorWindow':
          OpenEditorWindow(message, sender);
          break;
        case 'ToggleEditorWindow':
          ToggleEditorWindow(message, sender);
          break;
        case 'CloseEditorWindow':
          CloseEditorWindow(message, sender);
          break;
        case 'GetIsEditorWindowOpen':
          GetIsEditorWindowOpen(message, sender, sendResponse);
          return true;
        case 'OpenEditorSidePanel':
          OpenEditorSidePanel(message, sender, sendResponse);
          return true;
        case 'CloseEditorSidePanel':
          CloseEditorSidePanel(message, sender);
          break;
        case 'EditorSidePanelOpened':
          onEditorSidePanelOpened(message.tabId);
          break;
        case 'ReloadForSidePanelGrant':
          reloadForSidePanelGrant();
          break;
        case 'RunPageCommand':
          handleCommand(message.command, sender.tab);
          break;
        case 'RestoreTab':
          restoreTab(message.tabId).then(() => sendResponse({ ok: true }));
          return true;
      }

      return false;
    }
  );

  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
};
