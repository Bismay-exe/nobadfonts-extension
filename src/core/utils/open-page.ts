import type {
  OpenOptionsPage,
  OpenShortcutsPage,
  OpenReportIssuePage,
} from '@stylebot/types';

export const openOptionsPage = (route?: string): void => {
  const message: OpenOptionsPage = {
    name: 'OpenOptionsPage',
    ...(route ? { route } : {}),
  };

  chrome.runtime.sendMessage(message);
};

export const openShortcutsPage = (): void => {
  const message: OpenShortcutsPage = { name: 'OpenShortcutsPage' };
  chrome.runtime.sendMessage(message);
};

export const openReportIssuePage = (): void => {
  const message: OpenReportIssuePage = {
    name: 'OpenReportIssuePage',
  };

  chrome.runtime.sendMessage(message);
};
