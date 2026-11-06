import {
  set,
  disable,
  enable,
  getAll,
  setAll,
  move,
  getStylesForPage,
  setReadability,
  getImportCss,
  getGoogleWebFontExists,
  getWebFontFile,
  applyStylesToAllTabs,
  ensureCompiledStyles,
  setActiveProfile,
  createProfile,
  renameProfile,
  deleteProfile,
  deleteStyle,
} from './styles';
import * as styleStorage from './styles';

import {
  get as getOption,
  getAll as getAllOptions,
  set as setOption,
} from './options';

import type {
  GetOption as GetOptionType,
  SetOption as SetOptionType,
  DisableStyle as DisableStyleType,
  EnableStyle as EnableStyleType,
  SetStyle as SetStyleType,
  SetActiveProfile as SetActiveProfileType,
  CreateProfile as CreateProfileType,
  CreateProfileResponse,
  RenameProfile as RenameProfileType,
  DeleteProfile as DeleteProfileType,
  DeleteStyle as DeleteStyleType,
  MoveStyle as MoveStyleType,
  SetAllStyles as SetAllStylesType,
  SetReadability as SetReadabilityType,
  ReadabilityStateChanged,
  SetReadabilitySettings as SetReadabilitySettingsType,
  GetImportCss as GetImportCssType,
  GetNoBadFontsCatalogResponse,
  GetNoBadFontsVariantsResponse,
  GetCompiledStylesResponse,
  GetGoogleWebFontExists as GetGoogleWebFontExistsType,
  GetWebFontFile as GetWebFontFileType,
  ScanVersionHistory as ScanVersionHistoryType,
  RestoreVersion as RestoreVersionType,
  UndoRestore as UndoRestoreType,
  AddRecentColor as AddRecentColorType,
  OpenEditorWindow as OpenEditorWindowType,
  ToggleEditorWindow as ToggleEditorWindowType,
  CloseEditorWindow as CloseEditorWindowType,
  GetIsEditorWindowOpen as GetIsEditorWindowOpenType,
  GetIsEditorWindowOpenResponse,
  OpenEditorSidePanel as OpenEditorSidePanelType,
  CloseEditorSidePanel as CloseEditorSidePanelType,
  OpenEditorSidePanelResponse,
  GetCommandsResponse,
  GetAllOptionsResponse,
  GetAllStylesResponse,
  GetOptionResponse,
  GetStylesForPageResponse,
  GetReadabilitySettingsResponse,
  GetImportCssResponse,
  GetGoogleWebFontExistsResponse,
  GetWebFontFileResponse,
  ScanVersionHistoryResponse,
  RestoreVersionResponse,
  UndoRestoreResponse,
  SetAllStylesResponse,
  GetRecentColorsResponse,
  AddRecentColorResponse,
} from '@stylebot/types';

import {
  scanVersionHistory,
  restoreVersion,
  undoRestore,
} from '@stylebot/history';

import {
  get as getReadabilitySettings,
  set as setReadabilitySettings,
} from './readability-settings';

import { get as getCommands } from './commands';

import { getNoBadFontsCatalog, getNoBadFontsVariants } from './no-bad-fonts';

import {
  getAll as getAllRecentColors,
  add as addRecentColorToHistory,
} from './color-history';

import * as editorWindow from './editor-window';
import { openOptionsTab } from './options-tab';
import {
  canUseEditorSidePanel,
  openEditorSidePanelWithFallback,
} from './side-panel';
import {
  closeEditorSidePanel,
  isEditorSidePanelOpen,
} from '@stylebot/side-panel';

export const DisableStyle = async (
  message: DisableStyleType
): Promise<void> => {
  await disable(message.url);
  return applyStylesToAllTabs();
};

export const EnableStyle = async (message: EnableStyleType): Promise<void> => {
  await enable(message.url);
  return applyStylesToAllTabs();
};

export const SetStyle = (message: SetStyleType): Promise<void> =>
  set(
    message.url,
    message.css,
    message.readability,
    message.forceImportant,
    message.profileId
  );

export const SetActiveProfile = async (
  message: SetActiveProfileType
): Promise<void> => {
  await setActiveProfile(message.url, message.profileId);
  return applyStylesToAllTabs();
};

export const CreateProfile = async (
  message: CreateProfileType,
  sendResponse: (response: CreateProfileResponse) => void
): Promise<void> => {
  const profileId = await createProfile(message.url, {
    name: message.profileName,
    sourceProfileId: message.sourceProfileId,
    activate: message.activate,
  });

  sendResponse({ profileId });
  return applyStylesToAllTabs();
};

export const RenameProfile = async (
  message: RenameProfileType
): Promise<void> => {
  await renameProfile(message.url, message.profileId, message.profileName);
  return applyStylesToAllTabs();
};

export const DeleteProfile = async (
  message: DeleteProfileType
): Promise<void> => {
  await deleteProfile(message.url, message.profileId);
  return applyStylesToAllTabs();
};

export const DeleteStyle = async (message: DeleteStyleType): Promise<void> => {
  await deleteStyle(message.url);
  return applyStylesToAllTabs();
};

export const GetAllStyles = async (
  sendResponse: (response: GetAllStylesResponse) => void
): Promise<void> => {
  const styles = await getAll();
  sendResponse(styles);
};

export const SetAllStyles = async (
  message: SetAllStylesType,
  sendResponse: (response: SetAllStylesResponse) => void
): Promise<void> => {
  try {
    await setAll(message.styles);
  } catch {
    sendResponse({ ok: false });
    return;
  }

  sendResponse({ ok: true });
  return applyStylesToAllTabs();
};

export const GetStylesForPage = async (
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetStylesForPageResponse) => void
): Promise<void> => {
  const tab = sender.tab;

  if (!tab?.url) {
    sendResponse({ styles: [] });
    return;
  }

  const styles = await getAll();
  const response = getStylesForPage(tab.url, styles);

  sendResponse(response);
};

export const MoveStyle = (message: MoveStyleType): void => {
  move(message.sourceUrl, message.destinationUrl);
};

export const GetOption = async (
  message: GetOptionType,
  sendResponse: (response: GetOptionResponse) => void
): Promise<void> => {
  const option = await getOption(message.optionName);
  sendResponse(option);
};

export const GetAllOptions = async (
  sendResponse: (response: GetAllOptionsResponse) => void
): Promise<void> => {
  const options = await getAllOptions();
  sendResponse(options);
};

export const OpenOptionsPage = (message?: { route?: string }): Promise<void> =>
  openOptionsTab(message?.route);

/**
 * Opens the browser's own page for extension shortcuts, where they're
 * changed. Firefox has its page opened for the extension; the others by URL.
 */
export const OpenShortcutsPage = (): void => {
  if (chrome.commands.openShortcutSettings) {
    chrome.commands.openShortcutSettings();
    return;
  }

  const scheme = /\bEdg\//.test(navigator.userAgent) ? 'edge' : 'chrome';
  chrome.tabs.create({ url: `${scheme}://extensions/shortcuts` });
};

export const OpenReportIssuePage = (): void => {
  chrome.tabs.create({
    url: 'https://github.com/Bismay-exe/nobadfonts-extension/issues',
  });
};

export const SetOption = (message: SetOptionType): void => {
  setOption(message.option.name, message.option.value);
};

export const GetCommands = async (
  sendResponse: (response: GetCommandsResponse) => void
): Promise<void> => {
  const commands = await getCommands();
  sendResponse(commands);
};

export const SetReadability = async (
  message: SetReadabilityType,
  sender: chrome.runtime.MessageSender
): Promise<void> => {
  await setReadability(message.url, message.value);

  if (sender.tab?.id) {
    const relay: ReadabilityStateChanged = {
      name: 'ReadabilityStateChanged',
      value: message.value,
    };
    chrome.tabs.sendMessage(sender.tab.id, relay);
  }
};

export const GetReadabilitySettings = async (
  sendResponse: (response: GetReadabilitySettingsResponse) => void
): Promise<void> => {
  const settings = await getReadabilitySettings();
  sendResponse(settings);
};

export const SetReadabilitySettings = (
  message: SetReadabilitySettingsType
): void => {
  setReadabilitySettings(message.value);
};

export const GetImportCss = async (
  message: GetImportCssType,

  sendResponse: (response: GetImportCssResponse) => void
): Promise<void> => {
  const css = await getImportCss(message.url);
  sendResponse(css);
};

export const GetNoBadFontsCatalog = async (
  sendResponse: (response: GetNoBadFontsCatalogResponse) => void
): Promise<void> => {
  sendResponse(await getNoBadFontsCatalog());
};

export const GetNoBadFontsVariants = async (
  sendResponse: (response: GetNoBadFontsVariantsResponse) => void
): Promise<void> => {
  sendResponse(await getNoBadFontsVariants());
};

export const GetCompiledStyles = async (
  sendResponse: (response: GetCompiledStylesResponse) => void
): Promise<void> => {
  sendResponse(await ensureCompiledStyles());
};

export const GetGoogleWebFontExists = async (
  message: GetGoogleWebFontExistsType,

  sendResponse: (response: GetGoogleWebFontExistsResponse) => void
): Promise<void> => {
  const exists = await getGoogleWebFontExists(message.url);
  sendResponse(exists);
};

export const GetWebFontFile = async (
  message: GetWebFontFileType,

  sendResponse: (response: GetWebFontFileResponse) => void
): Promise<void> => {
  sendResponse(await getWebFontFile(message.url));
};

export const ScanVersionHistory = async (
  message: ScanVersionHistoryType,
  sendResponse: (response: ScanVersionHistoryResponse) => void
): Promise<void> => {
  sendResponse({
    scan: await scanVersionHistory(styleStorage, {
      limit: message.limit,
      site: message.site,
    }),
  });
};

export const RestoreVersion = async (
  message: RestoreVersionType,
  sendResponse: (response: RestoreVersionResponse) => void
): Promise<void> => {
  sendResponse(
    await restoreVersion(styleStorage, message.versionId, {
      urls: message.urls,
      before: message.before,
      profileId: message.profileId,
    })
  );
};

export const UndoRestore = async (
  message: UndoRestoreType,
  sendResponse: (response: UndoRestoreResponse) => void
): Promise<void> => {
  sendResponse({
    ok: await undoRestore(styleStorage, message.entryId, message.profileId),
  });
};

export const GetRecentColors = async (
  sendResponse: (response: GetRecentColorsResponse) => void
): Promise<void> => {
  const colors = await getAllRecentColors();
  sendResponse(colors);
};

export const AddRecentColor = async (
  message: AddRecentColorType,
  sendResponse: (response: AddRecentColorResponse) => void
): Promise<void> => {
  const colors = await addRecentColorToHistory(message.color);
  sendResponse(colors);
};

export const OpenEditorWindow = async (
  message: OpenEditorWindowType,
  sender: chrome.runtime.MessageSender
): Promise<void> => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId !== undefined) {
    await editorWindow.open(tabId);
  }
};

export const ToggleEditorWindow = async (
  message: ToggleEditorWindowType,
  sender: chrome.runtime.MessageSender
): Promise<void> => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId === undefined) {
    return;
  }

  // The page also counts a connected side panel as its editor window.
  const isSidePanelOpen = await isEditorSidePanelOpen(tabId);
  if (isSidePanelOpen) {
    await closeEditorSidePanel(tabId);
  } else {
    await editorWindow.toggle(tabId);
  }
};

export const CloseEditorWindow = async (
  message: CloseEditorWindowType,
  sender: chrome.runtime.MessageSender
): Promise<void> => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId !== undefined) {
    await editorWindow.close(tabId);
  }
};

/**
 * Opens the side panel straight away, while the gesture of the page's
 * keypress or click that sent this still counts. Answers whether it opened,
 * so the page can fall back to its own panel.
 */
export const OpenEditorSidePanel = (
  message: OpenEditorSidePanelType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: OpenEditorSidePanelResponse) => void
): void => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId === undefined || !canUseEditorSidePanel()) {
    sendResponse(false);
    return;
  }

  openEditorSidePanelWithFallback(tabId).then(
    () => sendResponse(true),
    () => sendResponse(false)
  );
};

export const CloseEditorSidePanel = async (
  message: CloseEditorSidePanelType,
  sender: chrome.runtime.MessageSender
): Promise<void> => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId !== undefined) {
    await closeEditorSidePanel(tabId);
  }
};

export const GetIsEditorWindowOpen = async (
  message: GetIsEditorWindowOpenType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetIsEditorWindowOpenResponse) => void
): Promise<void> => {
  const tabId = message.tabId ?? sender.tab?.id;
  if (tabId === undefined) {
    sendResponse(false);
    return;
  }

  const isWindowOpen = await editorWindow.isOpen(tabId);
  const isSidePanelOpen = await isEditorSidePanelOpen(tabId);

  sendResponse(isWindowOpen || isSidePanelOpen);
};
