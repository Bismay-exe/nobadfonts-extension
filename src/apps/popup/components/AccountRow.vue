<template>
  <popup-row
    v-if="account"
    class="account-row"
    :button="actionable"
    :disabled="!actionable"
    @click="onClick"
  >
    <span class="account-avatar" :class="{ 'account-avatar--signed-in': signedIn }">
      {{ initial }}
    </span>

    <span class="row-label account-label">
      <s-text as="span" size="large" medium>{{ label }}</s-text>
      <s-text as="span" size="caption" variant="muted">{{ detail }}</s-text>
    </span>

    <s-text v-if="actionLabel" as="span" size="label" variant="primary">
      {{ actionLabel }}
    </s-text>
  </popup-row>
</template>

<script lang="ts">
import Vue from 'vue';

import type { AccountState } from '@stylebot/account';
import { requestAccountState, requestSignIn } from '@stylebot/account';
import { SText } from '@stylebot/components';
import type { NoBadFontsAccountChanged } from '@stylebot/types';

import PopupRow from './PopupRow.vue';
import { openAccountOptions } from '../utils';

export default Vue.extend({
  name: 'AccountRow',

  components: {
    PopupRow,
    SText,
  },

  data(): {
    account: AccountState | null;
    signInFailed: boolean;
  } {
    return {
      account: null,
      signInFailed: false,
    };
  },

  computed: {
    signedIn(): boolean {
      return this.account?.status === 'signed-in';
    },

    actionable(): boolean {
      return this.account?.status !== 'unavailable';
    },

    initial(): string {
      if (this.account?.status !== 'signed-in') {
        return '?';
      }

      return (this.account.user.email || this.account.user.name || '?')
        .charAt(0)
        .toUpperCase();
    },

    label(): string {
      if (this.account?.status === 'signed-in') {
        return (
          this.account.user.email ||
          this.account.user.name ||
          this.t('no_bad_fonts_account')
        );
      }

      return this.t('no_bad_fonts_account');
    },

    detail(): string {
      if (this.signInFailed) {
        return this.t('no_bad_fonts_sign_in_failed');
      }

      if (this.account?.status === 'signed-in') {
        return this.t('no_bad_fonts_signed_in');
      }

      if (this.account?.status === 'unavailable') {
        return this.account.reason === 'unsupported'
          ? this.t('no_bad_fonts_unavailable')
          : this.t('no_bad_fonts_not_configured');
      }

      return this.t('no_bad_fonts_sign_in_hint');
    },

    actionLabel(): string {
      if (!this.actionable) {
        return '';
      }

      return this.t(this.signedIn ? 'manage' : 'sign_in');
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
        const account = await requestAccountState();
        this.account = account ?? { status: 'signed-out' };
      } catch {
        this.account = { status: 'signed-out' };
      }
    },

    onMessage(message: NoBadFontsAccountChanged): void {
      if (message?.name === 'NoBadFontsAccountChanged') {
        this.load();
      }
    },

    async onClick(): Promise<void> {
      if (this.signedIn) {
        openAccountOptions();
        return;
      }

      this.signInFailed = false;

      try {
        if (await requestSignIn()) {
          window.close();
          return;
        }
      } catch {
        // Falls through to the failure text.
      }

      this.signInFailed = true;
    },
  },
});
</script>

<style lang="scss" scoped>
.account-row {
  margin: 0 6px 6px;
}

.account-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--hover-tint);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.account-avatar--signed-in {
  background: var(--accent);
  color: var(--accent-ink);
}

.account-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.account-label > :first-child {
  @include truncate;
}
</style>
