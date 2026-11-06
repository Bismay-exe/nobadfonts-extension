export type AccountErrorCode =
  | 'cancelled'
  | 'denied'
  | 'unavailable'
  | 'not-configured'
  | 'state-mismatch'
  | 'exchange-failed'
  | 'network'
  | 'storage';

export type AccountErrorDetails = {
  // The OAuth error code the token endpoint returned, such as invalid_grant.
  oauthError?: string;
  httpStatus?: number;
};

export class AccountError extends Error {
  readonly code: AccountErrorCode;
  readonly oauthError?: string;
  readonly httpStatus?: number;

  constructor(
    code: AccountErrorCode,
    message: string,
    details: AccountErrorDetails = {}
  ) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
    this.oauthError = details.oauthError;
    this.httpStatus = details.httpStatus;
  }
}

export const isAccountError = (error: unknown): error is AccountError =>
  error instanceof AccountError;

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
