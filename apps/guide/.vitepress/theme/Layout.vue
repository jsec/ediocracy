<script setup lang="ts">
import { useData } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

const { frontmatter } = useData();
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <div v-if="frontmatter.title" class="vp-doc">
        <h1>{{ frontmatter.title }}</h1>
      </div>
    </template>
  </DefaultTheme.Layout>
</template>
