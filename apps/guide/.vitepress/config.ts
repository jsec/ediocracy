import { defineConfig } from 'vitepress';

import typedocSidebar from '../parser/api/typedoc-sidebar.json';
import { ediocracyMarkdown } from './markdown';
import { renderForSearch } from './search-render.mjs';
import { guideSidebar } from './sidebar-guide.mjs';

// Links to .edi files in public/ are downloads. Without this, VitePress treats them as
// page links: it reports them as dead and appends .html.
process.env.VITE_EXTRA_EXTENSIONS = 'edi';

function apiItems(...groupNames: string[]) {
  return typedocSidebar
    .filter((group) => groupNames.includes(group.text))
    .flatMap((group) => group.items);
}

export default defineConfig({
  title: 'Ediocracy',
  description:
    'A source-backed introduction to X12 271 eligibility responses for readers who understand the insurance eligibility check process but do not know the X12 data format.',
  outDir: 'dist',
  srcExclude: ['README.md', 'tests/**', 'scripts/**', 'src/**'],
  appearance: 'dark',
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    lineNumbers: true,
    config: ediocracyMarkdown,
  },
  themeConfig: {
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '^/guide/' },
      { text: 'Parser', link: '/parser/', activeMatch: '^/parser/' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jsec/ediocracy' },
    ],
    sidebar: {
      '/guide/': guideSidebar,
      '/parser/': [
        {
          text: 'Parser',
          items: [
            { text: 'Overview', link: '/parser/' },
            { text: 'Quick start', link: '/parser/quick-start' },
            { text: 'API reference', link: '/parser/api/' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Read 271 responses', link: '/parser/guides/reading-271s' },
            { text: 'Read CMS HETS responses', link: '/parser/guides/reading-hets-responses' },
            {
                text: 'Read UnitedHealthcare responses',
                link: '/parser/guides/reading-uhc-responses',
            },
            {
                text: 'Read 999 and TA1 acknowledgments',
                link: '/parser/guides/reading-acknowledgments',
            },
            { text: 'Read X12 envelopes', link: '/parser/guides/low-level-reader' },
            { text: 'Errors and findings', link: '/parser/guides/errors-and-findings' },
          ],
        },
        { text: 'API · Functions', items: apiItems('Functions') },
        { text: 'API · Classes & interfaces', items: apiItems('Classes', 'Interfaces') },
        {
          text: 'API · Types',
          collapsed: true,
          items: apiItems('Type Aliases', 'Variables'),
        },
      ],
    },
    outline: { label: 'On this page' },
    search: {
      provider: 'local',
      options: { _render: renderForSearch },
    },
  },
});
