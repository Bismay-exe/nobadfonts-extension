<template>
  <div class="no-bad-fonts-view" @keydown.esc="onEscape">
    <subview-header :title="t('no_bad_fonts')" @back="close">
      <s-text size="caption" variant="muted" class="esc-hint">
        {{ t('esc_to_close') }}
      </s-text>
    </subview-header>

    <div class="picker-controls">
      <div class="control-row">
        <span class="control-label">{{ t('no_bad_fonts_apply_to') }}</span>
        <s-select
          class="target-select"
          full-width
          menu-size="small"
          :text="targetText"
        >
          <template #default="{ close: closeMenu }">
            <s-menu-item
              v-for="option in targetOptions"
              :key="option.value"
              :selected="option.value === target"
              @click="
                chooseTarget(option.value);
                closeMenu();
              "
            >
              <span class="target-option">
                <span>{{ option.label }}</span>
                <span class="target-detail">{{ option.detail }}</span>
              </span>
            </s-menu-item>
          </template>
        </s-select>
      </div>

      <div class="control-row search-row">
        <s-text-input
          v-model="query"
          type="search"
          class="search-field"
          :placeholder="t('no_bad_fonts_search')"
          :aria-label="t('no_bad_fonts_search')"
        />

        <s-select
          class="category-select"
          menu-size="small"
          :text="categoryText"
          :menu-min-width="160"
        >
          <template #default="{ close: closeMenu }">
            <s-menu-item
              :selected="!category"
              @click="
                chooseCategory('');
                closeMenu();
              "
            >
              {{ t('no_bad_fonts_categories') }}
            </s-menu-item>
            <s-menu-item
              v-for="option in categories"
              :key="option"
              :selected="option === category"
              @click="
                chooseCategory(option);
                closeMenu();
              "
            >
              {{ option }}
            </s-menu-item>
          </template>
        </s-select>
      </div>
    </div>

    <div class="view-body">
      <div v-if="loading" class="state">
        <s-spinner :size="14" />
        <span>{{ t('no_bad_fonts_loading') }}</span>
      </div>

      <s-callout v-else-if="error" tone="danger">
        <span>{{ t('no_bad_fonts_error') }}</span>
        <s-link-button class="retry" @click="retryCatalog">
          {{ t('retry') }}
        </s-link-button>
      </s-callout>

      <p v-else-if="!fonts.length" class="state">
        {{ query || category ? t('no_bad_fonts_no_results') : t('no_bad_fonts_empty') }}
      </p>

      <template v-else>
        <article
          v-for="font in fonts"
          :key="font.id"
          class="font"
          :class="{ open: expanded === font.id }"
        >
          <button
            type="button"
            class="font-header"
            :aria-expanded="expanded === font.id ? 'true' : 'false'"
            @click="toggle(font)"
          >
            <span class="font-heading">
              <span class="font-name">{{ font.name }}</span>
              <s-chip
                v-if="isRestricted(font)"
                variant="danger"
                size="small"
              >
                {{ t('no_bad_fonts_restricted') }}
              </s-chip>
              <s-chip
                v-else-if="font.license.redistribution === 'unverified'"
                variant="warning"
                size="small"
              >
                {{ t('no_bad_fonts_unverified') }}
              </s-chip>
            </span>

            <span class="font-meta">
              <span v-if="font.designer">{{ font.designer }}</span>
              <span v-if="font.designer && font.category" class="meta-separator">
                ·
              </span>
              <span v-if="font.category">{{ font.category }}</span>
            </span>

            <chevron-down-icon
              :size="11"
              class="font-chevron"
              :class="{ open: expanded === font.id }"
            />
          </button>

          <div v-if="expanded === font.id" class="font-details">
            <p v-if="isRestricted(font)" class="license-warning restricted-warning">
              {{ t('no_bad_fonts_restricted_notice') }}
            </p>
            <p
              v-else-if="font.license.redistribution === 'unverified'"
              class="license-warning"
            >
              {{ t('no_bad_fonts_unverified_notice') }}
            </p>

            <div class="license-row">
              <span v-if="font.license.type" class="license-type">
                {{ font.license.type }}
              </span>
              <s-external-link :href="fontPageUrl(font)" :underline="false">
                {{ t('no_bad_fonts_view') }}
              </s-external-link>
            </div>

            <template v-if="!isRestricted(font)">
              <div v-if="variantsLoading" class="state">
                <s-spinner :size="12" />
                <span>{{ t('no_bad_fonts_loading') }}</span>
              </div>

              <s-callout v-else-if="variantsError" tone="danger">
                <span>{{ t('no_bad_fonts_variants_error') }}</span>
                <s-link-button class="retry" @click="retryVariants">
                  {{ t('retry') }}
                </s-link-button>
              </s-callout>

              <template v-else>
                <p v-if="!hasVariants(font)" class="state">
                  {{ t('no_bad_fonts_no_variants') }}
                </p>

                <div v-if="faces(font).length" class="variants">
                  <button
                    v-for="variant in faces(font)"
                    :key="variant.id"
                    type="button"
                    class="variant"
                    :class="{ selected: isSelected(variant) }"
                    :aria-pressed="isSelected(variant) ? 'true' : 'false'"
                    @click="previewVariant(font, variant)"
                    @mouseenter="previewVariantSoon(font, variant)"
                    @focus="previewVariant(font, variant)"
                  >
                    <span class="variant-name">{{ variant.name }}</span>
                    <span class="variant-meta">{{ variantMeta(variant) }}</span>
                    <check-icon
                      v-if="isSelected(variant)"
                      :size="12"
                      class="variant-check"
                    />
                  </button>
                </div>

                <template v-if="customFaces(font).length">
                  <p class="group-label">{{ t('no_bad_fonts_other_faces') }}</p>
                  <div class="variants">
                    <button
                      v-for="variant in customFaces(font)"
                      :key="variant.id"
                      type="button"
                      class="variant"
                      :class="{ selected: isSelected(variant) }"
                      :aria-pressed="isSelected(variant) ? 'true' : 'false'"
                      @click="previewVariant(font, variant)"
                      @mouseenter="previewVariantSoon(font, variant)"
                      @focus="previewVariant(font, variant)"
                    >
                      <span class="variant-name">{{ variant.name }}</span>
                      <span class="variant-meta">
                        {{ t('no_bad_fonts_custom_face') }}
                      </span>
                      <check-icon
                        v-if="isSelected(variant)"
                        :size="12"
                        class="variant-check"
                      />
                    </button>
                  </div>
                </template>

                <details
                  v-if="unsupportedVariants(font).length"
                  class="unsupported"
                >
                  <summary>{{ t('no_bad_fonts_unsupported') }}</summary>
                  <ul>
                    <li
                      v-for="variant in unsupportedVariants(font)"
                      :key="variant.name"
                    >
                      <span class="unsupported-name">{{ variant.name }}</span>
                      <span class="unsupported-reason">
                        {{ unsupportedReason(variant.reason) }}
                      </span>
                    </li>
                  </ul>
                </details>
              </template>
            </template>
          </div>
        </article>
      </template>
    </div>

    <div v-if="choice" class="footer">
      <span class="footer-label">
        {{ choice.font.name }}
        <span class="footer-variant">{{ choice.variant.name }}</span>
      </span>
      <s-button @click="clearPreview">{{ t('cancel') }}</s-button>
      <s-button variant="primary" @click="apply">
        {{ t('no_bad_fonts_apply') }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import {
  SButton,
  SCallout,
  SChip,
  SExternalLink,
  SLinkButton,
  SMenuItem,
  SSelect,
  SSpinner,
  SText,
  STextInput,
} from '@stylebot/components';
import { ChevronDownIcon, CheckIcon } from '@stylebot/icons';
import type {
  NoBadFontsChoice,
  NoBadFontsCustomVariant,
  NoBadFontsFont,
  NoBadFontsStaticVariant,
  NoBadFontsUnsupportedReason,
  NoBadFontsVariant,
  NoBadFontsVariantSet,
  NoBadFontsVariableVariant,
} from '@stylebot/no-bad-fonts';
import {
  clearCatalogCache,
  clearVariantsCache,
  fontPageUrl,
  getCatalogCategories,
  getNoBadFontsCleanup,
  loadCatalog,
  loadVariants,
  searchCatalog,
} from '@stylebot/no-bad-fonts';

import SubviewHeader from '../SubviewHeader.vue';

type TargetOption = {
  value: string;
  label: string;
  detail: string;
};

const WEIGHT_KEYS: Record<number, string> = {
  100: 'thin',
  200: 'extra_light',
  300: 'light',
  400: 'regular',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
  800: 'extra_bold',
  900: 'black',
};

const REASON_KEYS: Record<NoBadFontsUnsupportedReason, string> = {
  'missing-file': 'no_bad_fonts_missing_file',
  'invalid-file': 'no_bad_fonts_invalid_file',
};

const PREVIEW_DELAY_MS = 80;

export default Vue.extend({
  name: 'NoBadFontsPicker',

  components: {
    SButton,
    SCallout,
    SChip,
    SExternalLink,
    SLinkButton,
    SMenuItem,
    SSelect,
    SSpinner,
    SText,
    STextInput,
    ChevronDownIcon,
    CheckIcon,
    SubviewHeader,
  },

  data(): {
    catalog: Array<NoBadFontsFont>;
    loading: boolean;
    error: boolean;
    variants: Map<string, NoBadFontsVariantSet>;
    variantsLoading: boolean;
    variantsError: boolean;
    query: string;
    category: string;
    target: string;
    expanded: string;
    choice: NoBadFontsChoice | null;
    previewTimer: number | null;
  } {
    return {
      catalog: [],
      loading: true,
      error: false,
      variants: new Map(),
      variantsLoading: true,
      variantsError: false,
      query: '',
      category: '',
      target: '',
      expanded: '',
      choice: null,
      previewTimer: null,
    };
  },

  computed: {
    fonts(): Array<NoBadFontsFont> {
      return searchCatalog(this.catalog, this.query, this.category);
    },

    categories(): Array<string> {
      return getCatalogCategories(this.catalog);
    },

    categoryText(): string {
      return this.category || this.t('no_bad_fonts_categories');
    },

    targetOptions(): Array<TargetOption> {
      const activeSelector = this.$store.state.activeSelector;
      const options: Array<TargetOption> = [];

      if (activeSelector && activeSelector !== '*') {
        options.push({
          value: activeSelector,
          label: this.t('no_bad_fonts_selected_element'),
          detail: activeSelector,
        });
      }

      const values = new Set(options.map(option => option.value));

      if (!values.has('body')) {
        options.push({
          value: 'body',
          label: this.t('no_bad_fonts_body'),
          detail: 'body',
        });
      }

      for (let level = 1; level <= 6; level++) {
        const value = `h${level}`;

        if (!values.has(value)) {
          options.push({
            value,
            label: this.t('no_bad_fonts_heading', [String(level)]),
            detail: value,
          });
        }
      }

      return options;
    },

    targetText(): string {
      const option = this.targetOptions.find(
        option => option.value === this.target
      );

      return option ? option.label : this.t('no_bad_fonts_selected_element');
    },
  },

  mounted() {
    const activeSelector = this.$store.state.activeSelector;
    this.target =
      activeSelector && activeSelector !== '*' ? activeSelector : 'body';

    void this.fetchCatalog();
    void this.fetchVariants();
  },

  beforeDestroy() {
    this.cancelPreview();
    this.$store.dispatch('clearNoBadFontsPreview');
  },

  methods: {
    fontPageUrl,

    async fetchCatalog(): Promise<void> {
      this.loading = true;
      this.error = false;

      try {
        this.catalog = await loadCatalog();
      } catch {
        this.error = true;
      } finally {
        this.loading = false;
      }
    },

    async fetchVariants(): Promise<void> {
      this.variantsLoading = true;
      this.variantsError = false;

      try {
        this.variants = await loadVariants();
      } catch {
        this.variantsError = true;
      } finally {
        this.variantsLoading = false;
      }
    },

    retryCatalog(): void {
      clearCatalogCache();
      void this.fetchCatalog();
    },

    retryVariants(): void {
      clearVariantsCache();
      void this.fetchVariants();
    },

    chooseTarget(value: string): void {
      if (value === this.target) {
        return;
      }

      this.target = value;
      this.clearPreview();
    },

    chooseCategory(value: string): void {
      this.category = value;
    },

    isRestricted(font: NoBadFontsFont): boolean {
      return font.license.redistribution === 'restricted';
    },

    variantSet(font: NoBadFontsFont): NoBadFontsVariantSet | null {
      return this.variants.get(font.id) ?? null;
    },

    faces(
      font: NoBadFontsFont
    ): Array<NoBadFontsStaticVariant | NoBadFontsVariableVariant> {
      const set = this.variantSet(font);

      if (!set) {
        return [];
      }

      return set.variable ? [...set.static, set.variable] : set.static;
    },

    customFaces(font: NoBadFontsFont): Array<NoBadFontsCustomVariant> {
      return this.variantSet(font)?.custom ?? [];
    },

    hasVariants(font: NoBadFontsFont): boolean {
      return this.faces(font).length > 0 || this.customFaces(font).length > 0;
    },

    unsupportedVariants(
      font: NoBadFontsFont
    ): NoBadFontsVariantSet['unsupported'] {
      return this.variantSet(font)?.unsupported ?? [];
    },

    isSelected(variant: NoBadFontsVariant): boolean {
      return this.choice !== null && this.choice.variant.id === variant.id;
    },

    toggle(font: NoBadFontsFont): void {
      if (this.expanded === font.id) {
        this.expanded = '';
        this.clearPreview();
        return;
      }

      this.expanded = font.id;
    },

    variantMeta(
      variant: NoBadFontsStaticVariant | NoBadFontsVariableVariant
    ): string {
      if (variant.kind === 'variable') {
        return this.t('no_bad_fonts_variable');
      }

      const weight = this.t(WEIGHT_KEYS[variant.weight] ?? 'regular');

      return variant.style === 'italic'
        ? `${weight} · ${this.t('italic')}`
        : weight;
    },

    unsupportedReason(reason: NoBadFontsUnsupportedReason): string {
      return this.t(REASON_KEYS[reason]);
    },

    previewVariantSoon(font: NoBadFontsFont, variant: NoBadFontsVariant): void {
      this.cancelPreview();

      this.previewTimer = window.setTimeout(() => {
        this.previewTimer = null;
        this.previewVariant(font, variant);
      }, PREVIEW_DELAY_MS);
    },

    previewVariant(font: NoBadFontsFont, variant: NoBadFontsVariant): void {
      this.cancelPreview();

      const set = this.variantSet(font);

      if (!set || this.isPreviewed(font, variant)) {
        return;
      }

      this.preview(font, set, variant);
    },

    isPreviewed(font: NoBadFontsFont, variant: NoBadFontsVariant): boolean {
      return (
        this.choice !== null &&
        this.choice.font.id === font.id &&
        this.choice.variant.id === variant.id &&
        this.choice.target === this.target
      );
    },

    preview(
      font: NoBadFontsFont,
      set: NoBadFontsVariantSet,
      variant: NoBadFontsVariant
    ): void {
      const cleanup = getNoBadFontsCleanup(font, set);
      let choice: NoBadFontsChoice;

      if (variant.kind === 'static') {
        choice = {
          target: this.target,
          kind: 'static',
          font,
          variant,
          faces: set.static,
          cleanup,
        };
      } else if (variant.kind === 'variable') {
        choice = {
          target: this.target,
          kind: 'variable',
          font,
          variant,
          cleanup,
        };
      } else {
        choice = {
          target: this.target,
          kind: 'custom',
          font,
          variant,
          cleanup,
        };
      }

      this.choice = choice;
      this.$store.dispatch('previewNoBadFontsFont', choice);
    },

    cancelPreview(): void {
      if (this.previewTimer !== null) {
        window.clearTimeout(this.previewTimer);
        this.previewTimer = null;
      }
    },

    clearPreview(): void {
      this.cancelPreview();
      this.choice = null;
      this.$store.dispatch('clearNoBadFontsPreview');
    },

    apply(): void {
      if (this.choice) {
        this.$store.dispatch('applyNoBadFontsFont', this.choice);
      }
    },

    close(): void {
      this.$store.dispatch('closeNoBadFontsPicker');
    },

    onEscape(): void {
      this.close();
    },
  },
});
</script>

<style lang="scss" scoped>
.no-bad-fonts-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--tab-surface);
}

.esc-hint {
  margin-right: 4px;
}

.picker-controls {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding: 10px var(--panel-gutter) 12px;
  border-bottom: 1px solid var(--panel-border);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.control-label {
  flex: none;
  font-size: 13px;
  color: var(--text-body);
}

.target-select {
  flex: 1;
  min-width: 0;
}

.target-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.target-detail {
  @include truncate;

  min-width: 0;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.search-row {
  align-items: stretch;
}

.search-field {
  flex: 1;
  min-width: 0;
}

.category-select {
  flex: none;
  max-width: 45%;
}

.view-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px var(--panel-gutter) 16px;

  @include thin-scrollbar;
}

.state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-muted);
}

.retry {
  margin-left: auto;
}

.font {
  flex: none;
  border-radius: 10px;
  background: var(--card-surface);
  overflow: hidden;
}

.font-header {
  @include button-reset;

  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;

  @include focus-ring(-2px);
}

.font-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-right: 18px;
}

.font-name {
  @include truncate;

  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.font-meta {
  @include truncate;

  font-size: 12px;
  color: var(--text-muted);
}

.meta-separator {
  margin: 0 4px;
}

.font-chevron {
  position: absolute;
  top: 14px;
  right: 12px;
  color: var(--text-muted);
  transition: transform 0.15s ease;

  &.open {
    transform: rotate(180deg);
  }
}

.font {
  position: relative;
}

.font-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
}

.license-warning {
  margin: 0;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--warning);
  background: var(--warning-background);
}

.restricted-warning {
  color: var(--danger);
  background: var(--danger-background);
}

.license-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.license-type {
  @include truncate;

  min-width: 0;
}

.group-label {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.variants {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.variant {
  @include button-reset;

  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);

  &:hover,
  &.selected {
    background: var(--hover-tint);
  }

  @include focus-ring;
}

.variant-name {
  @include truncate;

  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.variant-meta {
  flex: none;
  font-size: 12px;
  color: var(--text-muted);
}

.variant-check {
  flex: none;
  color: var(--accent-text);
}

.unsupported {
  font-size: 12px;
  color: var(--text-muted);

  summary {
    cursor: pointer;
  }

  ul {
    margin: 6px 0 0;
    padding-left: 16px;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-bottom: 4px;
  }
}

.unsupported-name {
  color: var(--text-body);
}

.footer {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 10px var(--panel-gutter);
  border-top: 1px solid var(--panel-border);
  background: var(--panel-surface);
}

.footer-label {
  @include truncate;

  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
}

.footer-variant {
  margin-left: 6px;
  font-weight: 400;
  color: var(--text-muted);
}
</style>
