import { defineConfig } from 'vitepress';

import typedocSidebar from '../parser/api/typedoc-sidebar.json';
import { renderForSearch } from './search-render.mjs';
import { guideSidebar } from './sidebar-guide.mjs';

// Links to .edi files in public/ are downloads. Without this, VitePress treats them as
// page links: it reports them as dead and appends .html.
process.env.VITE_EXTRA_EXTENSIONS = 'edi';

export default defineConfig({
  title: 'Ediocracy',
  description:
    'A source-backed introduction to X12 271 eligibility responses for readers who understand the insurance eligibility check process but do not know the X12 data format.',
  outDir: 'dist',
  srcExclude: ['README.md', 'tests/**', 'scripts/**', 'src/**'],
  markdown: {
    theme: {
      light: 'catppuccin-latte',
      dark: 'catppuccin-mocha',
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Parser', link: '/parser/' },
    ],
    sidebar: {
      '/guide/': guideSidebar,
      '/parser/': [
        { text: 'Overview', link: '/parser/' },
        { text: 'Quick start', link: '/parser/quick-start' },
        {
          text: 'Guides',
          items: [
            { text: 'Reading 271 responses', link: '/parser/guides/reading-271s' },
            { text: 'Reading X12 envelopes', link: '/parser/guides/low-level-reader' },
            { text: 'Errors and findings', link: '/parser/guides/errors-and-findings' },
          ],
        },
        { text: 'API reference', link: '/parser/api/', items: typedocSidebar },
      ],
    },
    search: {
      provider: 'local',
      options: { _render: renderForSearch },
    },
  },
});
