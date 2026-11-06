import type { StyleMap } from './styles';
import type { StylebotOptions } from './options';
import type { ReadabilitySettings } from './readability';
import type { StylebotCommandName } from './commands';

export type SetStyle = {
  name: 'SetStyle';
  url: string;
  css: string;
  readability: boolean;
  // Left out, the stored style keeps its current value.
  forceImportant?: boolean;
  // Left out, the css goes to the active profile.
  profileId?: string;
};

export type SetActiveProfile = {
  name: 'SetActiveProfile';
  url: string;
  profileId: string;
};

export type CreateProfile = {
  name: 'CreateProfile';
  url: string;
  profileName: string;
  // Left out, the new profile starts blank.
  sourceProfileId?: string;
  activate: boolean;
};

export type RenameProfile = {
  name: 'RenameProfile';
  url: string;
  profileId: string;
  profileName: string;
};

export type DeleteProfile = {
  name: 'DeleteProfile';
  url: string;
  profileId: string;
};

export type DeleteStyle = {
  name: 'DeleteStyle';
  url: string;
};

export type EnableStyle = {
  name: 'EnableStyle';
  url: string;
};

export type DisableStyle = {
  name: 'DisableStyle';
  url: string;
};

export type GetAllStyles = {
  name: 'GetAllStyles';
};

export type SetAllStyles = {
  name: 'SetAllStyles';
  styles: StyleMap;
  shouldPersist?: boolean;
};

export type MoveStyle = {
  name: 'MoveStyle';
  sourceUrl: string;
  destinationUrl: string;
};

export type GetStylesForPage = {
  name: 'GetStylesForPage';
};

export type GetAllOptions = {
  name: 'GetAllOptions';
};

export type GetOption = {
  name: 'GetOption';
  optionName: keyof StylebotOptions;
};

export type SetOption = {
  name: 'SetOption';
  option: {
    name: keyof StylebotOptions;
    value: StylebotOptions[keyof StylebotOptions]; // todo
  };
};

export type OpenOptionsPage = {
  name: 'OpenOptionsPage';
  route?: string;
};

export type OpenShortcutsPage = {
  name: 'OpenShortcutsPage';
};

export type OpenReportIssuePage = {
  name: 'OpenReportIssuePage';
};

export type SetReadability = {
  name: 'SetReadability';
  url: string;
  value: boolean;
};

export type GetCommands = {
  name: 'GetCommands';
};

export type GetReadabilitySettings = {
  name: 'GetReadabilitySettings';
};

export type SetReadabilitySettings = {
  name: 'SetReadabilitySettings';
  value: ReadabilitySettings;
};

export type GetImportCss = {
  name: 'GetImportCss';
  url: string;
};

export type GetNoBadFontsCatalog = {
  name: 'GetNoBadFontsCatalog';
};

export type GetNoBadFontsVariants = {
  name: 'GetNoBadFontsVariants';
};

// The NoBadFonts account this browser is signed in as, if any.
export type GetNoBadFontsAccount = {
  name: 'GetNoBadFontsAccount';
};

// Opens the tab that runs the NoBadFonts sign-in.
export type StartNoBadFontsSignIn = {
  name: 'StartNoBadFontsSignIn';
};

// Sent by that tab once it is loaded and can run the sign-in.
export type NoBadFontsSignInReady = {
  name: 'NoBadFontsSignInReady';
};

// Ends this browser's NoBadFonts session.
export type NoBadFontsSignOut = {
  name: 'NoBadFontsSignOut';
};

// Sent by the background to the extension's pages when the account changes.
export type NoBadFontsAccountChanged = {
  name: 'NoBadFontsAccountChanged';
};

export type GetCompiledStyles = {
  name: 'GetCompiledStyles';
};

export type GetGoogleWebFontExists = {
  name: 'GetGoogleWebFontExists';
  url: string;
};

export type GetWebFontFile = {
  name: 'GetWebFontFile';
  url: string;
};

export type ScanVersionHistory = {
  name: 'ScanVersionHistory';
  // Absent asks for every version held.
  limit?: number;
  // Only versions that touched this site.
  site?: string;
};

export type UndoRestore = {
  name: 'UndoRestore';
  // The history entry the restore recorded.
  entryId: string;
  // The one profile the restore put back, if it was one.
  profileId?: string;
};

export type RestoreVersion = {
  name: 'RestoreVersion';
  versionId: string;
  // Absent restores the whole version; a list restores only those sites.
  urls?: Array<string>;
  // Restores the styles as they were just before this version's change.
  before?: boolean;
  // Restores only this profile of the one site in `urls`.
  profileId?: string;
};

export type GetRecentColors = {
  name: 'GetRecentColors';
};

export type AddRecentColor = {
  name: 'AddRecentColor';
  color: string;
};

// tabId defaults to the sending tab, for messages from a content script.
export type OpenEditorWindow = {
  name: 'OpenEditorWindow';
  tabId?: number;
};

export type ToggleEditorWindow = {
  name: 'ToggleEditorWindow';
  tabId?: number;
};

export type CloseEditorWindow = {
  name: 'CloseEditorWindow';
  tabId?: number;
};

export type OpenEditorSidePanel = {
  name: 'OpenEditorSidePanel';
  tabId?: number;
};

// Options got the sidePanel permission, which takes a reload to use.
export type ReloadForSidePanelGrant = {
  name: 'ReloadForSidePanelGrant';
};

export type EditorSidePanelOpened = {
  name: 'EditorSidePanelOpened';
  tabId: number;
};

// A global shortcut the page caught itself, where the browser doesn't pass
// it on (Arc).
export type RunPageCommand = {
  name: 'RunPageCommand';
  command: StylebotCommandName;
};

export type CloseEditorSidePanel = {
  name: 'CloseEditorSidePanel';
  tabId?: number;
};

export type GetIsEditorWindowOpen = {
  name: 'GetIsEditorWindowOpen';
  tabId?: number;
};

export type RestoreTab = {
  name: 'RestoreTab';
  tabId: number;
};

type BackgroundPageMessage =
  | SetStyle
  | EnableStyle
  | DisableStyle
  | GetAllStyles
  | SetAllStyles
  | MoveStyle
  | GetStylesForPage
  | SetActiveProfile
  | CreateProfile
  | RenameProfile
  | DeleteProfile
  | DeleteStyle
  | GetAllOptions
  | GetOption
  | SetOption
  | OpenOptionsPage
  | OpenShortcutsPage
  | OpenReportIssuePage
  | SetReadability
  | GetCommands
  | GetReadabilitySettings
  | SetReadabilitySettings
  | GetImportCss
  | GetNoBadFontsCatalog
  | GetNoBadFontsVariants
  | GetNoBadFontsAccount
  | StartNoBadFontsSignIn
  | NoBadFontsSignInReady
  | NoBadFontsSignOut
  | GetCompiledStyles
  | GetGoogleWebFontExists
  | GetWebFontFile
  | ScanVersionHistory
  | RestoreVersion
  | UndoRestore
  | GetRecentColors
  | AddRecentColor
  | OpenEditorWindow
  | ToggleEditorWindow
  | CloseEditorWindow
  | GetIsEditorWindowOpen
  | OpenEditorSidePanel
  | CloseEditorSidePanel
  | EditorSidePanelOpened
  | ReloadForSidePanelGrant
  | RunPageCommand
  | RestoreTab;

export default BackgroundPageMessage;
