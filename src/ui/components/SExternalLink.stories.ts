import type { Meta } from '@storybook/vue';

import SExternalLink from './SExternalLink.vue';
import SText from './SText.vue';
import { fromTemplate, playground } from '@stylebot/storybook/story-helpers';

const meta: Meta = {
  title: 'Primitives/Links/SExternalLink',
  component: SExternalLink,
  argTypes: { label: { control: 'text' } },
  args: { label: 'NoBadFonts' },
};

export default meta;

const components = { SExternalLink, SText };

export const Playground = playground(
  components,
  `<s-external-link href="https://www.nobadfonts.in">{{ label }}</s-external-link>`
);

export const InContext = fromTemplate(
  components,
  `
  <s-text size="large">
    Browse the catalog at
    <s-external-link href="https://www.nobadfonts.in">NoBadFonts</s-external-link>,
    where every font is checked for complete language support.
  </s-text>
`
);
