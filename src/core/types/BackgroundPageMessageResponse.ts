import type { CompiledStyles, Style, StyleMap } from './styles';
import type { AccountErrorCode, AccountState } from '@stylebot/account';
import type {
  NoBadFontsFontsResponse,
  NoBadFontsVariantsResponse,
} from './NoBadFonts';
import type { StylebotOptions } from './options';
import type { StylebotCommands } from './commands';
import type { ReadabilitySettings } from './readability';
import type { RestoreResult, VersionHistory } from './history';

export type GetAllOptionsResponse = StylebotOptions;
export type GetOptionResponse = StylebotOptions[keyof StylebotOptions];

export type GetAllStylesResponse = StyleMap;

export type SetAllStylesResponse = { ok: boolean };

export type CreateProfileResponse = {
  profileId: string;
};

export type GetStylesForPageResponse = {
  styles: Array<Style>;
  defaultStyle?: Style;
};

export type GetCommandsResponse = StylebotCommands;
export type GetReadabilitySettingsResponse = ReadabilitySettings;

export type GetImportCssResponse = string;
export type GetNoBadFontsCatalogResponse = NoBadFontsFontsResponse;
export type GetNoBadFontsVariantsResponse = NoBadFontsVariantsResponse;
export type GetNoBadFontsAccountResponse = AccountState;

export type StartNoBadFontsSignInResponse = {
  opened: boolean;
};

export type NoBadFontsSignInResponse =
  | { ok: true; account: AccountState }
  | { ok: false; error: AccountErrorCode };

export type NoBadFontsSignOutResponse = {
  ok: boolean;
};

export type GetCompiledStylesResponse = CompiledStyles;
export type GetGoogleWebFontExistsResponse = boolean;
// The font file as base64, or empty when it couldn't be fetched.
export type GetWebFontFileResponse = string;

export type ScanVersionHistoryResponse = { scan: VersionHistory };

export type RestoreVersionResponse = RestoreResult;

export type UndoRestoreResponse = { ok: boolean };

export type GetRecentColorsResponse = Array<string>;
export type AddRecentColorResponse = Array<string>;
export type GetIsEditorWindowOpenResponse = boolean;
export type OpenEditorSidePanelResponse = boolean;
export type RestoreTabResponse = { ok: true };

type BackgroundPageMessageResponse =
  | GetAllOptionsResponse
  | GetOptionResponse
  | GetAllStylesResponse
  | GetStylesForPageResponse
  | CreateProfileResponse
  | GetCommandsResponse
  | GetReadabilitySettingsResponse
  | GetImportCssResponse
  | GetNoBadFontsCatalogResponse
  | GetNoBadFontsVariantsResponse
  | GetNoBadFontsAccountResponse
  | StartNoBadFontsSignInResponse
  | NoBadFontsSignInResponse
  | NoBadFontsSignOutResponse
  | GetCompiledStylesResponse
  | GetGoogleWebFontExistsResponse
  | GetWebFontFileResponse
  | ScanVersionHistoryResponse
  | RestoreVersionResponse
  | UndoRestoreResponse
  | SetAllStylesResponse
  | GetRecentColorsResponse
  | AddRecentColorResponse
  | GetIsEditorWindowOpenResponse
  | OpenEditorSidePanelResponse
  | RestoreTabResponse;

export default BackgroundPageMessageResponse;
