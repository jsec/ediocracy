import type { Theme } from 'vitepress';

import DefaultTheme from 'vitepress/theme';
import '@catppuccin/vitepress/theme/mocha/mauve.css';

import './custom.css';
import Layout from './Layout.vue';
import X12Example from './X12Example.vue';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('X12Example', X12Example);
  },
} satisfies Theme;
