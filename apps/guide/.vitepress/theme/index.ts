import type { Theme } from 'vitepress';

import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import DefaultTheme from 'vitepress/theme';

import './custom.css';
import CodePanel from './CodePanel.vue';
import CodeSteps from './CodeSteps.vue';
import ControlPairs from './ControlPairs.vue';
import HomePage from './HomePage.vue';
import Layout from './Layout.vue';
import SegmentIndex from './SegmentIndex.vue';
import X12Annotated from './X12Annotated.vue';
import X12Example from './X12Example.vue';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CodePanel', CodePanel);
    app.component('CodeSteps', CodeSteps);
    app.component('ControlPairs', ControlPairs);
    app.component('HomePage', HomePage);
    app.component('SegmentIndex', SegmentIndex);
    app.component('X12Annotated', X12Annotated);
    app.component('X12Example', X12Example);
  },
} satisfies Theme;
