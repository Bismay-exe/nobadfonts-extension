import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { Engine } from './engine';
import { test, expect, type Extension } from './fixtures';
import { startTestServer } from './helpers';

const RELEASE = '3.2.4';
// The build under test may still carry the old version number until release.
const NEXT_VERSION = '4.0.0';
const RELEASE_URL = `https://github.com/ankit/stylebot/releases/download/v${RELEASE}/stylebot-${RELEASE}.zip`;
const CACHE_DIR = path.resolve(__dirname, '.cache');
const DIST_PATH = path.resolve(__dirname, '..', 'dist');

const PAGE_HTML = `<!doctype html><html><body><h1>Test page</h1></body></html>`;

const stylesFrom324 = {
  localhost: {
    css: 'h1 { color: rgb(0, 128, 0); }',
    enabled: true,
    readability: false,
    modifiedTime: '2026-09-01T10:00:00.000+02:00',
  },
  'news.example.org': {
    css: '',
    enabled: false,
    readability: true,
    modifiedTime: '2026-09-02T10:00:00.000+02:00',
  },
};

/**
 * Storage as 3.2.4 leaves it on a profile that synced and changed settings:
 * the metadata as 3.2.4 writes it, settings 4.0 renamed or retired, and the
 * sync keys a later version no longer reads.
 */
const storageFrom324 = {
  styles: stylesFrom324,
  'styles-metadata': { modifiedTime: '2026-09-02T10:00:00.000+02:00' },
  options: {
    contextMenu: false,
    fonts: ['Georgia', 'Lora'],
    layout: { width: 420, adjustPageLayout: true, dockLocation: 'left' },
    mode: 'code',
    basicModeSections: {
      text: true,
      colors: false,
      layout: false,
      border: true,
    },
    colorPalette: 'material',
  },
  'google-drive-sync-enabled': true,
  'google-drive-sync': {
    id: 'drive-file',
    modifiedTime: '2026-09-02T09:00:00.000Z',
  },
};

/**
 * The shipped 3.2.4 zip, downloaded once into a gitignored cache.
 */
const getReleaseZip = async (): Promise<string> => {
  const zip = path.join(CACHE_DIR, `stylebot-${RELEASE}.zip`);

  if (!fs.existsSync(zip)) {
    const response = await fetch(RELEASE_URL);
    if (!response.ok) {
      throw new Error(`Could not download ${RELEASE_URL}: ${response.status}`);
    }

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(`${zip}.part`, Buffer.from(await response.arrayBuffer()));
    fs.renameSync(`${zip}.part`, zip);
  }

  return zip;
};

const stampVersion = (dir: string, version: string): void => {
  const file = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ ...manifest, version }));
};

/**
 * Waits for the background of the given version to answer, as the previous
 * one's worker may still be listed for a moment after a reload.
 */
const waitForVersion = (extension: Extension, version: string) =>
  expect
    .poll(
      () =>
        extension
          .evaluate(() => chrome.runtime.getManifest().version)
          .catch(() => ''),
      { timeout: 30_000 }
    )
    .toBe(version);

/**
 * Copies the current build over the release's folder with a newer version,
 * and loads it again, which reloads it from disk as an update, keeping its
 * id and storage.
 */
const updateToBuild = async (
  engine: Engine,
  context: BrowserContext,
  extensionDir: string,
  old: Extension
): Promise<Extension> => {
  fs.rmSync(extensionDir, { recursive: true, force: true });
  fs.cpSync(DIST_PATH, extensionDir, { recursive: true });
  stampVersion(extensionDir, NEXT_VERSION);

  const upgraded = await engine.loadExtension(context, extensionDir);
  expect(upgraded.id).toBe(old.id);
  await waitForVersion(upgraded, NEXT_VERSION);
  return upgraded;
};

test('upgrading from 3.2.4 keeps styles and settings', async ({
  engine,
}, testInfo) => {
  test.skip(
    process.env.STYLEBOT_BROWSER === 'firefox',
    `The ${RELEASE} release zip is the Chrome and Edge build`
  );
  test.setTimeout(120_000);

  const zip = await getReleaseZip();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stylebot-upgrade-'));
  const extensionDir = path.join(root, 'extension');
  execFileSync('unzip', ['-q', zip, '-d', extensionDir]);

  const server = await startTestServer({ '/': PAGE_HTML });
  const context = await engine.launch(path.join(root, 'profile'), {
    headless: testInfo.project.use.headless ?? true,
    viewport: null,
    colorScheme: null,
  });

  try {
    await context.route(
      /https:\/\/(www\.)?(nobadfonts\.in|stylebot\.dev)\/.*/,
      route => route.fulfill({ contentType: 'text/html', body: '' })
    );

    const old = await engine.loadExtension(context, extensionDir);

    await test.step(`${RELEASE} applies the seeded styles`, async () => {
      await waitForVersion(old, RELEASE);
      await old.evaluate(
        items => chrome.storage.local.set(items),
        storageFrom324
      );

      const page = await context.newPage();
      await page.goto(server.baseUrl);
      await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');
      await page.close();
    });

    const extension =
      await test.step('swap in the new build at the same path', () =>
        updateToBuild(engine, context, extensionDir, old));

    await test.step('the migrations finish cleanly', async () => {
      await expect
        .poll(() =>
          extension.evaluate(async () => {
            const items = await chrome.storage.local.get('migration_errors');
            return { errors: items.migration_errors ?? null };
          })
        )
        .toEqual({ errors: null });
    });

    await test.step('the settings are kept and the retired ones dropped', async () => {
      const {
        basicModeSections: _basicModeSections,
        colorPalette: _colorPalette,
        ...kept
      } = storageFrom324.options;

      await expect
        .poll(() =>
          extension.evaluate(async () => {
            const items = await chrome.storage.local.get('options');
            return items.options;
          })
        )
        .toEqual(kept);
    });

    await test.step('the styles are kept and applied', async () => {
      const styles = await extension.evaluate(async () => {
        const items = await chrome.storage.local.get('styles');
        return items.styles;
      });
      expect(Object.keys(styles).sort()).toEqual(
        Object.keys(stylesFrom324).sort()
      );
      expect(styles.localhost.css).toBe(stylesFrom324.localhost.css);

      const page = await context.newPage();
      await page.goto(server.baseUrl);
      await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');
      await page.close();
    });
  } finally {
    await context.close().catch(() => {});
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('updating from 3.2.4 brings Stylebot back to a tab left open with the editor showing, without reloading it', async ({
  engine,
}, testInfo) => {
  test.skip(
    process.env.STYLEBOT_BROWSER === 'firefox',
    `The ${RELEASE} release zip is the Chrome and Edge build`
  );
  test.setTimeout(120_000);

  const zip = await getReleaseZip();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stylebot-update-'));
  const extensionDir = path.join(root, 'extension');
  execFileSync('unzip', ['-q', zip, '-d', extensionDir]);

  const server = await startTestServer({ '/': PAGE_HTML });
  const context = await engine.launch(path.join(root, 'profile'), {
    headless: testInfo.project.use.headless ?? true,
    viewport: null,
    colorScheme: null,
  });

  try {
    await context.route(
      /https:\/\/(www\.)?(nobadfonts\.in|stylebot\.dev)\/.*/,
      route => route.fulfill({ contentType: 'text/html', body: '' })
    );

    const old = await engine.loadExtension(context, extensionDir);
    await waitForVersion(old, RELEASE);
    await old.evaluate(styles => chrome.storage.local.set({ styles }), {
      localhost: stylesFrom324.localhost,
    });

    const page = await context.newPage();
    await page.goto(server.baseUrl);
    await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');

    const editorRoot = page.locator('#stylebot');
    // Its overlay is an unnamed div on the body, drawn while inspecting.
    const oldOverlays = page.locator('body > div:not([id])');

    await test.step(`open the ${RELEASE} editor, inspecting`, async () => {
      // Sent until the page's listener is up to hear it.
      await expect(async () => {
        await old.evaluate(async () => {
          const [tab] = await chrome.tabs.query({ url: 'http://localhost/*' });
          await chrome.tabs.sendMessage(tab.id!, { name: 'OpenStylebot' });
        });
        await expect(editorRoot.locator('.stylebot')).toBeVisible({
          timeout: 1000,
        });
      }).toPass();
      await page.locator('h1').hover();
      await expect(oldOverlays).not.toHaveCount(0);
      await page.mouse.move(0, 0);
    });

    const extension = await updateToBuild(engine, context, extensionDir, old);
    const openPopup = () => engine.openPopup(context, extension);

    await test.step("the new editor takes the old one's place", async () => {
      await expect(editorRoot.locator('.stylebot-content')).toBeVisible();
      await expect(editorRoot).toHaveCount(1);
    });

    await test.step(`the ${RELEASE} inspector stops`, async () => {
      await expect(oldOverlays).toHaveCount(0);
      await page.locator('h1').hover();
      await page.mouse.move(0, 0);
      await expect(oldOverlays).toHaveCount(0);
    });

    await test.step('the page answers the new version', async () => {
      await expect
        .poll(() =>
          extension.evaluate(async () => {
            const [tab] = await chrome.tabs.query({
              url: 'http://localhost/*',
            });
            return chrome.tabs
              .sendMessage(tab.id!, { name: 'GetCanStylePage' })
              .catch(() => undefined);
          })
        )
        .toBe(true);
    });

    await test.step('style changes still reach the page', async () => {
      const popup = await openPopup();
      // Not awaited: the background never answers these.
      await popup.evaluate(() => {
        chrome.runtime.sendMessage({ name: 'DisableStyle', url: 'localhost' });
      });
      await expect(page.locator('h1')).not.toHaveCSS('color', 'rgb(0, 128, 0)');

      await popup.evaluate(() => {
        chrome.runtime.sendMessage({ name: 'EnableStyle', url: 'localhost' });
      });
      await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');
      await popup.close();
    });
  } finally {
    await context.close().catch(() => {});
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('updating from 3.2.4 puts Stylebot back into background tabs as they are shown', async ({
  engine,
}, testInfo) => {
  test.skip(
    process.env.STYLEBOT_BROWSER === 'firefox',
    `The ${RELEASE} release zip is the Chrome and Edge build`
  );
  test.setTimeout(120_000);

  const zip = await getReleaseZip();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stylebot-lazy-'));
  const extensionDir = path.join(root, 'extension');
  execFileSync('unzip', ['-q', zip, '-d', extensionDir]);

  const paths = ['/editor', '/background', '/popup', '/message', '/active'];
  const server = await startTestServer(
    Object.fromEntries(paths.map(p => [p, PAGE_HTML]))
  );
  const context = await engine.launch(path.join(root, 'profile'), {
    headless: testInfo.project.use.headless ?? true,
    viewport: null,
    colorScheme: null,
  });

  /**
   * The id of the tab showing the page at `pagePath`.
   */
  const tabId = (extension: Extension, pagePath: string) =>
    extension.evaluate(async url => {
      const tabs = await chrome.tabs.query({});
      return tabs.find(tab => tab.url === url)!.id!;
    }, `${server.baseUrl}${pagePath}`);

  /**
   * Whether the page at `pagePath` answers this copy of Stylebot.
   */
  const answers = (extension: Extension, pagePath: string) =>
    tabId(extension, pagePath).then(id =>
      extension.evaluate(
        id =>
          chrome.tabs
            .sendMessage(id, { name: 'GetCanStylePage' })
            .then(canStyle => canStyle === true)
            .catch(() => false),
        id
      )
    );

  const activate = (extension: Extension, pagePath: string) =>
    tabId(extension, pagePath).then(id =>
      extension.evaluate(id => chrome.tabs.update(id, { active: true }), id)
    );

  try {
    await context.route(
      /https:\/\/(www\.)?(nobadfonts\.in|stylebot\.dev)\/.*/,
      route => route.fulfill({ contentType: 'text/html', body: '' })
    );

    const old = await engine.loadExtension(context, extensionDir);
    await waitForVersion(old, RELEASE);
    await old.evaluate(styles => chrome.storage.local.set({ styles }), {
      localhost: stylesFrom324.localhost,
    });

    const pages = Object.fromEntries(
      await Promise.all(
        paths.map(async pagePath => {
          const page = await context.newPage();
          await page.goto(`${server.baseUrl}${pagePath}`);
          await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 128, 0)');
          return [pagePath, page] as const;
        })
      )
    );
    const editorRoot = pages['/editor'].locator('#stylebot');

    await test.step(`open the ${RELEASE} editor in a tab, then show another`, async () => {
      const id = await tabId(old, '/editor');
      await expect(async () => {
        await old.evaluate(
          id => chrome.tabs.sendMessage(id, { name: 'OpenStylebot' }),
          id
        );
        await expect(editorRoot.locator('.stylebot')).toBeVisible({
          timeout: 1000,
        });
      }).toPass();
      await activate(old, '/active');
    });

    const extension = await updateToBuild(engine, context, extensionDir, old);

    await test.step('the active tab and the tab with the editor are restored right away', async () => {
      await expect.poll(() => answers(extension, '/active')).toBe(true);
      await expect.poll(() => answers(extension, '/editor')).toBe(true);
      await expect(editorRoot.locator('.stylebot-content')).toBeVisible();
    });

    await test.step('a background tab is left alone until it is shown', async () => {
      expect(await answers(extension, '/background')).toBe(false);
      await expect(pages['/background'].locator('h1')).toHaveCSS(
        'color',
        'rgb(0, 128, 0)'
      );

      await activate(extension, '/background');
      await expect.poll(() => answers(extension, '/background')).toBe(true);
    });

    await test.step('the popup restores a tab it is asked about', async () => {
      const popup = await engine.openPopup(context, extension);
      const id = await tabId(extension, '/message');

      await popup.evaluate(
        id => chrome.runtime.sendMessage({ name: 'RestoreTab', tabId: id }),
        id
      );
      expect(await answers(extension, '/message')).toBe(true);
      await popup.close();
    });

    await test.step('the popup on a tab shown for the first time offers to style it', async () => {
      await activate(extension, '/popup');
      const popup = await engine.openPopup(context, extension);

      await expect
        .poll(() =>
          popup.locator('button', { hasText: 'Edit style' }).isVisible()
        )
        .toBe(true);
      expect(await popup.locator('.unsupported-page').isVisible()).toBe(false);
      await popup.close();
    });
  } finally {
    await context.close().catch(() => {});
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
