<template>
  <div v-if="optionsLoaded" class="basics-tab">
    <s-heading as="h1" size="xl">{{ t('basics_options') }}</s-heading>

    <s-list>
      <the-theme />
      <the-position />
      <the-context-menu />
    </s-list>

    <the-keyboard-shortcuts />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { SHeading, SList } from '@stylebot/components';
import TheTheme from './basics/TheTheme.vue';
import ThePosition from './basics/ThePosition.vue';
import TheContextMenu from './basics/TheContextMenu.vue';
import TheKeyboardShortcuts from './basics/TheKeyboardShortcuts.vue';

export default Vue.extend({
  name: 'TheBasicsTab',

  components: {
    SHeading,
    SList,
    TheTheme,
    ThePosition,
    TheContextMenu,
    TheKeyboardShortcuts,
  },

  computed: {
    optionsLoaded(): boolean {
      return !!this.$store.state.options;
    },
  },
});
</script>

<style lang="scss" scoped>
.basics-tab {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 860px;
  padding: 20px 22px 26px;
}
</style>
