import { t } from '@stylebot/i18n';
import type { AccountErrorCode } from '@stylebot/account';
import type {
  NoBadFontsSignInReady,
  NoBadFontsSignInResponse,
} from '@stylebot/types';

const ERROR_KEYS: Record<AccountErrorCode, string> = {
  cancelled: 'no_bad_fonts_sign_in_cancelled',
  denied: 'no_bad_fonts_sign_in_denied',
  unavailable: 'no_bad_fonts_unavailable',
  'not-configured': 'no_bad_fonts_not_configured',
  'state-mismatch': 'no_bad_fonts_sign_in_expired',
  'exchange-failed': 'no_bad_fonts_sign_in_failed',
  network: 'no_bad_fonts_sign_in_network',
  storage: 'no_bad_fonts_sign_in_failed',
};

const status = document.getElementById('status') as HTMLParagraphElement;
const detail = document.getElementById('detail') as HTMLParagraphElement;
const closeButton = document.getElementById('close') as HTMLButtonElement;

document.documentElement.lang = t('language_code');
document.title = t('no_bad_fonts_account');
status.textContent = t('no_bad_fonts_connecting');
closeButton.textContent = t('no_bad_fonts_close_tab');
closeButton.addEventListener('click', () => window.close());

const showError = (code: AccountErrorCode): void => {
  document.body.dataset.state = 'error';
  document.title = t('no_bad_fonts_sign_in_error_title');
  status.textContent = t('no_bad_fonts_sign_in_failed');
  detail.textContent = t(ERROR_KEYS[code]);
  detail.hidden = false;
  closeButton.hidden = false;
};

const showAccount = (email: string): void => {
  document.body.dataset.state = 'done';
  document.title = t('no_bad_fonts_signed_in_title');
  status.textContent = t('no_bad_fonts_connected_title');
  detail.textContent = email ? t('no_bad_fonts_signed_in_as', [email]) : '';
  detail.hidden = !email;
  closeButton.hidden = false;
};

// The background owns the flow and the tokens; this tab only reports it.
const message: NoBadFontsSignInReady = { name: 'NoBadFontsSignInReady' };

chrome.runtime
  .sendMessage<NoBadFontsSignInReady, NoBadFontsSignInResponse>(message)
  .then(response => {
    if (!response) {
      showError('exchange-failed');
      return;
    }

    if (!response.ok) {
      showError(response.error);
      return;
    }

    if (response.account.status === 'signed-in') {
      showAccount(response.account.user.email);
      return;
    }

    showError(
      response.account.status === 'unavailable' &&
        response.account.reason === 'unsupported'
        ? 'unavailable'
        : 'not-configured'
    );
  })
  .catch(() => showError('exchange-failed'));
