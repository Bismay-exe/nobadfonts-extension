import { getGoodbyeUrl } from '@stylebot/utils';

import { ContextMenu } from './contextmenu';
import { initListeners } from './listeners';
import { runMigrations } from './migrations';
import { ensureCompiledStyles, holdWritesUntil } from './styles';

initListeners();

// Before any event is dispatched, so no write reads styles a migration has
// yet to repair. runMigrations never rejects, so startup always continues.
holdWritesUntil(runMigrations());
ensureCompiledStyles();

chrome.runtime.setUninstallURL(getGoodbyeUrl());

ContextMenu.init();
