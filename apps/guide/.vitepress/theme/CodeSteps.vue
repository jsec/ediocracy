<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue';

import { activeStepLines } from './code-steps';

const props = defineProps<{ lines: number[][] }>();

const root = useTemplateRef('root');
const activeStep = ref(0);

function stepItems() {
  return [...(root.value?.querySelectorAll(':scope > ol > li') ?? [])];
}

function showActiveStep() {
  for (const [index, item] of stepItems().entries()) {
    item.classList.toggle('is-active', index === activeStep.value);
  }

  activeStepLines.value = props.lines[activeStep.value] ?? [];
}

function select(event: Event) {
  const item = event.target instanceof Element ? event.target.closest('li') : null;
  const index = item ? stepItems().indexOf(item) : -1;

  if (index !== -1) {
    activeStep.value = index;
  }
}

onMounted(() => {
  for (const [index, item] of stepItems().entries()) {
    const lines = props.lines[index] ?? [];
    const range = lines.length > 1 ? `${lines[0]}–${lines[lines.length - 1]}` : `${lines[0]}`;

    item.setAttribute('tabindex', '0');
    item.setAttribute('data-lines', `line ${range}`);
  }

  showActiveStep();
});

watch(activeStep, showActiveStep);
</script>

<template>
  <div ref="root" class="edi-code-steps" @click="select" @keydown.enter="select" @keydown.space.prevent="select">
    <slot />
  </div>
</template>
