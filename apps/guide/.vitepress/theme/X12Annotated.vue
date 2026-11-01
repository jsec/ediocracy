<script lang="ts">
import { ref } from 'vue';

const selection = ref<{ block: string; field: number }>();
</script>

<script setup lang="ts">
import { useRoute } from 'vitepress';
import { computed, useId } from 'vue';

import { segmentRole } from '../../src/lib/walkthrough.mjs';
import X12Segment from './X12Segment.vue';

const TERMINATOR = /~$/;

const props = defineProps<{
  lines: string[];
  fields: Array<[string, string]>;
}>();

const route = useRoute();
const block = `${route.path}#${useId()}`;

const rows = computed(() => props.fields.map(([position, text]) => {
  const segmentId = position.slice(0, -2);
  const elementPosition = Number(position.slice(-2));
  const lineIndex = props.lines.findIndex((line) => line.startsWith(`${segmentId}*`));
  const value = props.lines[lineIndex]?.replace(TERMINATOR, '').split('*')[elementPosition] ?? '';

  return {
    position,
    text,
    value,
    lineIndex,
    elementPosition,
    role: segmentRole(position),
  };
}));

const selectedField = computed(() => (selection.value?.block === block ? selection.value.field : -1));
const selectedRow = computed(() => rows.value[selectedField.value]);
</script>

<template>
  <div class="edi-annotated">
    <div class="edi-annotated-source">
      <div v-for="(line, lineIndex) in lines" :key="lineIndex">
        <X12Segment :raw="line" :selected="selectedRow?.lineIndex === lineIndex ? selectedRow.elementPosition : undefined" />
      </div>
    </div>
    <button
      v-for="(row, index) in rows"
      :key="row.position"
      type="button"
      class="edi-annotated-field"
      :class="[row.role && `edi-role-${row.role}`, { 'is-selected': index === selectedField }]"
      :aria-pressed="index === selectedField"
      @click="selection = { block, field: index }"
    >
      <span class="edi-chip">{{ row.position }}</span>
      <span class="edi-annotated-value" :class="{ 'is-empty': row.value === '' }">{{ row.value === '' ? '(empty)' : row.value }}</span>
      <span class="edi-annotated-text">{{ row.text }}</span>
    </button>
  </div>
</template>
