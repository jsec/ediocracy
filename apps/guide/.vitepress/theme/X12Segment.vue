<script setup lang="ts">
import { computed } from 'vue';

import { segmentRole } from '../../src/lib/walkthrough.mjs';

const TERMINATOR = /~$/;
const EN_SPACE = ' ';

const props = defineProps<{
  raw: string;
  selected?: number;
  isClickable?: boolean;
}>();

const emit = defineEmits<{ select: [position: number] }>();

const parts = computed(() => props.raw.replace(TERMINATOR, '').split('*'));
const role = computed(() => segmentRole(parts.value[0]));
</script>

<template>
  <span class="edi-x12-segment" :class="role && `edi-role-${role}`">
    <span class="edi-x12-id">{{ parts[0] }}</span>
    <template v-for="(element, index) in parts.slice(1)" :key="index">
      <span class="edi-x12-separator">*</span>
      <span
        class="edi-x12-element"
        :class="{ 'is-selected': selected === index + 1, 'is-clickable': isClickable }"
        @click="emit('select', index + 1)"
      >{{ element === '' && selected === index + 1 ? EN_SPACE : element }}</span>
    </template>
    <span class="edi-x12-separator">~</span>
  </span>
</template>
