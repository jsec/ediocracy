<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { ROLE_LABELS, SEGMENT_DEFINITIONS, SEGMENT_INDEX, SEGMENT_ROLES, segmentRole } from '../../src/lib/walkthrough.mjs';

const ROLE_FILTERS = [['all', 'All'], ...Object.entries(ROLE_LABELS)];

const roleFilter = ref('all');
const openSegment = ref<string>();

const rows = computed(() => Object.entries(SEGMENT_INDEX)
  .filter(([name]) => roleFilter.value === 'all' || SEGMENT_ROLES[name] === roleFilter.value)
  .map(([name, entry]) => ({
    name,
    role: SEGMENT_ROLES[name],
    definition: SEGMENT_DEFINITIONS[name],
    entry,
  })));

function textParts(text: string) {
  return text.split('`').map((part, index) => ({
    text: part,
    isCode: index % 2 === 1,
    role: segmentRole(part),
  }));
}

function openFromHash() {
  openSegment.value = location.hash.slice(1).toUpperCase() || undefined;
}

function toggle(name: string) {
  const isOpen = openSegment.value === name;
  openSegment.value = isOpen ? undefined : name;

  history.replaceState(history.state, '', isOpen ? location.pathname : `#${name.toLowerCase()}`);
}

onMounted(() => {
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', openFromHash);
});
</script>

<template>
  <div class="edi-segment-index">
    <div class="edi-filters" role="group" aria-label="Filter by segment role">
      <button
        v-for="[role, label] in ROLE_FILTERS"
        :key="role"
        type="button"
        class="edi-filter"
        :class="[`edi-role-${role}`, { 'is-selected': roleFilter === role }]"
        :aria-pressed="roleFilter === role"
        @click="roleFilter = role"
      >
        <span class="edi-filter-dot" />{{ label }}
      </button>
    </div>

    <div class="edi-index-table">
      <div class="edi-index-grid">
        <div class="edi-index-row edi-index-header">
          <span>Segment</span>
          <span>Purpose</span>
          <span>Key fields</span>
          <span>Used in</span>
          <span />
        </div>
        <div
          v-for="row in rows"
          :id="row.name.toLowerCase()"
          :key="row.name"
          class="edi-index-segment"
          :class="[`edi-role-${row.role}`, { 'is-open': openSegment === row.name }]"
        >
          <div class="edi-index-row" role="button" tabindex="0" :aria-expanded="openSegment === row.name" @click="toggle(row.name)" @keydown.enter="toggle(row.name)">
            <span class="edi-index-name">{{ row.name }}</span>
            <span class="edi-index-purpose">{{ row.definition.purpose }}</span>
            <span class="edi-index-key">
              <template v-for="(part, index) in textParts(row.entry.keyFields)" :key="index">
                <code v-if="part.isCode" :class="part.role && `edi-role-${part.role}`">{{ part.text }}</code>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span class="edi-index-used">
              <template v-for="([label, link], index) in row.entry.usedIn" :key="link">
                <template v-if="index > 0">, </template>
                <a :href="link" @click.stop>{{ label }}</a>
              </template>
            </span>
            <span class="edi-index-toggle">{{ openSegment === row.name ? '−' : '+' }}</span>
          </div>
          <div v-if="openSegment === row.name" class="edi-index-fields">
            <div v-for="([fieldName, meaning], index) in row.definition.fields" :key="index" class="edi-index-field">
              <span class="edi-index-position">{{ row.name }}{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="edi-index-field-name">{{ fieldName }}</span>
              <span>{{ meaning }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
