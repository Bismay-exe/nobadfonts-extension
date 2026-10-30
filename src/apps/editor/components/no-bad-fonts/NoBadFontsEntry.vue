<template>
  <property-row :label="t('no_bad_fonts')">
    <s-link-button class="open" @click="open">
      {{ t('no_bad_fonts_browse') }}
    </s-link-button>
  </property-row>
</template>

<script lang="ts">
import Vue from 'vue';
import { SLinkButton } from '@stylebot/components';

import PropertyRow from '../basic/PropertyRow.vue';

export default Vue.extend({
  name: 'NoBadFontsEntry',

  components: {
    PropertyRow,
    SLinkButton,
  },

  methods: {
    open(): void {
      this.$store.dispatch('openNoBadFontsPicker');
    },
  },
});
</script>

<style lang="scss" scoped>
.open {
  font-size: 12px;
}
</style>
