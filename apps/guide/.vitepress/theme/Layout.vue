<script setup lang="ts">
import type { DefaultTheme as Theme } from 'vitepress';

import { useData, useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';

const API_PAGE = /^\/parser\/api\/([^/]+)\//;
const PAGE_SUFFIX = /(?:index)?(?:\.html|\.md)?$/;
const API_KINDS: Record<string, string> = {
  'functions': 'function',
  'classes': 'class',
  'interfaces': 'interface',
  'type-aliases': 'type',
  'variables': 'variable',
};

const { frontmatter, theme } = useData<Theme.Config>();
const route = useRoute();

const apiSection = computed(() => route.path.match(API_PAGE)?.[1]);

const crumb = computed(() => {
  if (apiSection.value) {
    return `@ediocracy/parser / ${apiSection.value.replace('-', ' ')}`;
  }

  const section = route.path.split('/')[1];
  const sidebar = theme.value.sidebar as Theme.SidebarMulti;
  const groups = sidebar[`/${section}/`] as Theme.SidebarItem[] | undefined;
  const currentPath = route.path.replace(PAGE_SUFFIX, '');

  for (const group of groups ?? []) {
    const index = (group.items ?? []).findIndex((item) => item.link?.replace(PAGE_SUFFIX, '') === currentPath);

    if (index === -1) {
      continue;
    }

    const groupName = group.text?.toLowerCase();
    const position = String(index + 1).padStart(2, '0');

    return [section, groupName === section ? undefined : groupName, position]
      .filter(Boolean)
      .join(' / ');
  }

  return section;
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <span class="edi-logo">edi<span class="edi-logo-star">*</span>ocracy<span class="edi-logo-tilde">~</span></span>
    </template>
    <template #doc-before>
      <div class="vp-doc edi-page-header">
        <p class="edi-crumb">{{ crumb }}</p>
        <span v-if="apiSection" class="edi-kind">{{ API_KINDS[apiSection] }}</span>
        <h1 v-if="frontmatter.title">{{ frontmatter.title }}</h1>
      </div>
    </template>
  </DefaultTheme.Layout>
</template>
