<template>
  <div class="backup-tab">
    <s-callout
      v-if="importedCount !== null"
      class="banner"
      @dismiss="importedCount = null"
    >
      {{ importedMessage }}
    </s-callout>

    <s-callout
      v-if="showUpToDate"
      class="banner"
      @dismiss="showUpToDate = false"
    >
      {{ t('import_up_to_date') }}
    </s-callout>

    <s-callout
      v-if="importErrorKey"
      class="banner"
      tone="danger"
      @dismiss="importErrorKey = null"
    >
      {{ t('import_error', [t(importErrorKey)]) }}
    </s-callout>

    <div>
      <s-heading as="h1" size="xl">{{ t('backup_options') }}</s-heading>
      <s-text variant="muted" size="large" class="description">
        {{ t('backup_description') }}
      </s-text>

      <div class="buttons">
        <s-button :disabled="!hasStyles" @click="exportJson">
          {{ t('export') }}
        </s-button>
        <s-button @click="importJson">{{ t('import') }}</s-button>
      </div>
    </div>

    <import-backup-dialog
      v-if="pendingImport"
      :preview="pendingImport.preview"
      @cancel="pendingImport = null"
      @merge="applyImport('merge')"
      @replace="applyImport('replace')"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { SButton, SCallout, SHeading, SText } from '@stylebot/components';
import type { ImportPreview } from '@stylebot/saved-styles';
import {
  mergeBackup,
  parseBackup,
  previewImport,
} from '@stylebot/saved-styles';
import type { StyleMap } from '@stylebot/types';
import ImportBackupDialog from './sync/ImportBackupDialog.vue';

import { downloadBackup, pickBackupFile } from '../backup';

type PendingImport = {
  styles: StyleMap;
  preview: ImportPreview;
};

export default Vue.extend({
  name: 'TheBackupTab',

  components: {
    SCallout,
    SHeading,
    SText,
    SButton,
    ImportBackupDialog,
  },

  data(): {
    importErrorKey: string | null;
    importedCount: number | null;
    pendingImport: PendingImport | null;
    showUpToDate: boolean;
  } {
    return {
      importErrorKey: null,
      importedCount: null,
      pendingImport: null,
      showUpToDate: false,
    };
  },

  computed: {
    hasStyles(): boolean {
      return Object.keys(this.$store.state.styles).length > 0;
    },

    importedMessage(): string {
      const count = this.importedCount ?? 0;
      const imported = this.t(
        count === 1 ? 'imported_styles_one' : 'imported_styles_other',
        [String(count)]
      );

      return `${imported} ${this.t('import_undo_hint')}`;
    },
  },

  methods: {
    exportJson(): void {
      downloadBackup(this.$store.state.styles);
    },

    async importJson(): Promise<void> {
      this.clearImportStatus();

      let text: string | null;

      try {
        text = await pickBackupFile();
      } catch {
        this.showImportError('import_error_unreadable');
        return;
      }

      if (text === null) {
        return;
      }

      const parsed = parseBackup(text);

      if (!parsed.ok) {
        this.showImportError(parsed.errorKey);
        return;
      }

      const preview = previewImport(this.$store.state.styles, parsed.styles);

      if (preview.added + preview.updated === 0) {
        this.showUpToDate = true;
        return;
      }

      this.pendingImport = { styles: parsed.styles, preview };
    },

    async applyImport(mode: 'merge' | 'replace'): Promise<void> {
      if (!this.pendingImport) {
        return;
      }

      const { styles, preview } = this.pendingImport;
      this.pendingImport = null;

      const next =
        mode === 'merge'
          ? mergeBackup(this.$store.state.styles, styles)
          : styles;
      const ok: boolean = await this.$store.dispatch('importStyles', next);

      if (!ok) {
        this.showImportError('import_error_not_saved');
        return;
      }

      this.importedCount =
        mode === 'merge'
          ? preview.added + preview.updated
          : Object.keys(styles).length;
    },

    showImportError(key: string): void {
      this.clearImportStatus();
      this.importErrorKey = key;
    },

    clearImportStatus(): void {
      this.showUpToDate = false;
      this.importErrorKey = null;
      this.importedCount = null;
    },
  },
});
</script>

<style lang="scss" scoped>
.backup-tab .banner {
  margin-bottom: 16px;
}

.backup-tab {
  max-width: 760px;
  padding: 20px 22px 26px;
}

.description {
  margin-top: 4px;
  max-width: 520px;
}

.buttons {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
</style>
