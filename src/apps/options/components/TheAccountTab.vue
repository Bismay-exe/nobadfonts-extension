<template>
  <div class="account-tab">
    <s-heading as="h1" size="xl">{{ t('account_options') }}</s-heading>
    <s-text variant="muted" size="large" class="description">
      {{ t('no_bad_fonts_account_description') }}
    </s-text>

    <s-callout v-if="failed" class="banner" tone="danger">
      {{ t('no_bad_fonts_sign_in_failed_action') }}
    </s-callout>

    <s-card v-if="account" class="card">
      <div class="header">
        <div class="status">
          <span class="title">{{ title }}</span>
          <s-text variant="muted" size="large" class="subtitle">
            {{ subtitle }}
          </s-text>
        </div>

        <s-button v-if="signedIn" :disabled="busy" @click="signOut">
          {{ t('sign_out') }}
        </s-button>
        <s-button
          v-else-if="canSignIn"
          variant="primary"
          :disabled="busy"
          @click="signIn"
        >
          {{ t('sign_in') }}
        </s-button>
      </div>

      <div class="row">
        <div class="row-text">
          <div class="row-title">{{ t('no_bad_fonts_connected_apps') }}</div>
          <s-text variant="muted" size="large">
            {{ t('no_bad_fonts_connected_apps_description') }}
          </s-text>
        </div>
        <s-button @click="manageConnectedApps">
          {{ t('no_bad_fonts_manage_connected_apps') }}
        </s-button>
      </div>

      <s-text v-if="signedIn" variant="muted" size="large" class="hint">
        {{ t('no_bad_fonts_sign_out_hint') }}
      </s-text>
    </s-card>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import {
  openConnectedAppsPage,
  requestAccountState,
  requestSignIn,
  requestSignOut,
  type AccountState,
} from '@stylebot/account';
import { SButton, SCallout, SCard, SHeading, SText } from '@stylebot/components';
import type { NoBadFontsAccountChanged } from '@stylebot/types';

export default Vue.extend({
  name: 'TheAccountTab',

  components: {
    SButton,
    SCallout,
    SCard,
    SHeading,
    SText,
  },

  data(): {
    account: AccountState | null;
    busy: boolean;
    failed: boolean;
  } {
    return {
      account: null,
      busy: false,
      failed: false,
    };
  },

  computed: {
    signedIn(): boolean {
      return this.account?.status === 'signed-in';
    },

    canSignIn(): boolean {
      return this.account?.status === 'signed-out';
    },

    title(): string {
      if (this.account?.status === 'signed-in') {
        return this.t('no_bad_fonts_signed_in_title');
      }

      if (this.account?.status === 'unavailable') {
        return this.t('no_bad_fonts_unavailable_title');
      }

      return this.t('no_bad_fonts_signed_out_title');
    },

    subtitle(): string {
      if (this.account?.status === 'signed-in') {
        return this.account.user.email || this.account.user.name || '';
      }

      if (this.account?.status === 'unavailable') {
        return this.account.reason === 'unsupported'
          ? this.t('no_bad_fonts_unavailable')
          : this.t('no_bad_fonts_not_configured');
      }

      return this.t('no_bad_fonts_sign_in_hint');
    },
  },

  created() {
    this.load();
    chrome.runtime.onMessage.addListener(this.onMessage);
  },

  beforeDestroy() {
    chrome.runtime.onMessage.removeListener(this.onMessage);
  },

  methods: {
    async load(): Promise<void> {
      try {
        this.account = (await requestAccountState()) ?? {
          status: 'signed-out',
        };
      } catch {
        this.account = { status: 'signed-out' };
      }
    },

    onMessage(message: NoBadFontsAccountChanged): void {
      if (message?.name === 'NoBadFontsAccountChanged') {
        this.load();
      }
    },

    async signIn(): Promise<void> {
      this.failed = false;
      this.busy = true;

      try {
        if (!(await requestSignIn())) {
          this.failed = true;
        }
      } catch {
        this.failed = true;
      } finally {
        this.busy = false;
      }
    },

    /**
     * Ends the session in this browser, leaving the account and its other
     * devices as they are.
     */
    async signOut(): Promise<void> {
      this.failed = false;
      this.busy = true;

      try {
        if (await requestSignOut()) {
          await this.load();
        } else {
          this.failed = true;
        }
      } catch {
        this.failed = true;
      } finally {
        this.busy = false;
      }
    },

    manageConnectedApps(): void {
      openConnectedAppsPage();
    },
  },
});
</script>

<style lang="scss" scoped>
.account-tab {
  max-width: 760px;
  padding: 20px 22px 26px;
}

.account-tab .banner {
  margin-top: 16px;
}

.description {
  margin-top: 4px;
  max-width: 520px;
}

.card {
  margin-top: 20px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--hover-tint);
  border-bottom: 1px solid var(--panel-border);
}

.status {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.subtitle {
  @include truncate;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title {
  font-size: 14px;
  font-weight: 600;
}

.hint {
  display: block;
  padding: 0 18px 16px;
}
</style>
