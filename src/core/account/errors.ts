export type AccountErrorCode =
  | 'cancelled'
  | 'denied'
  | 'unavailable'
  | 'not-configured'
  | 'state-mismatch'
  | 'exchange-failed'
  | 'network'
  | 'storage';

export class AccountError extends Error {
  readonly code: AccountErrorCode;

  constructor(code: AccountErrorCode, message: string) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
  }
}

export const isAccountError = (error: unknown): error is AccountError =>
  error instanceof AccountError;

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
