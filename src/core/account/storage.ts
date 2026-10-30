import { AccountError, errorMessage } from './errors';
import type { SessionStore, StoredSession } from './types';

const DATABASE_NAME = 'nobadfonts-account';
const STORE_NAME = 'session';
const SESSION_KEY = 'session';

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);

      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {
      connection = null;
      throw new AccountError('storage', errorMessage(error));
    });
  }

  return connection;
};

const run = async <T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const database = await open();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = work(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new AccountError('storage', errorMessage(request.error)));
  });
};

/**
 * Keeps the session in the extension's own IndexedDB, which belongs to the
 * background's origin: a content script's IndexedDB is the page's, so no page
 * can read the tokens.
 */
export const sessionStore: SessionStore = {
  read: async () =>
    (await run<StoredSession | undefined>('readonly', store =>
      store.get(SESSION_KEY)
    )) ?? null,

  write: async session => {
    await run('readwrite', store => store.put(session, SESSION_KEY));
  },

  clear: async () => {
    await run('readwrite', store => store.delete(SESSION_KEY));
  },
};
