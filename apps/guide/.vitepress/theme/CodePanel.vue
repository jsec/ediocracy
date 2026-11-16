<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';

import { activeStepLines } from './code-steps';

const props = defineProps<{
  file: string;
  output: string;
  outputLabel?: string;
  install?: string;
  highlightsSteps?: boolean;
}>();

const body = useTemplateRef('body');
function highlightStep() {
  const stepLines = activeStepLines.value;

  if (!props.highlightsSteps || stepLines.length === 0 || !body.value) {
    return;
  }

  const codeLines = body.value.querySelectorAll('.line');
  const lineNumbers = body.value.querySelectorAll('.line-number');

  for (const [index, line] of codeLines.entries()) {
    const isStepLine = stepLines.includes(index + 1);

    line.classList.toggle('highlighted', isStepLine);
    line.classList.toggle('is-dimmed', !isStepLine);
    lineNumbers[index]?.classList.toggle('is-highlighted', isStepLine);
  }
}

onMounted(highlightStep);
watch(activeStepLines, highlightStep);
</script>

<template>
  <div class="edi-code-panel">
    <div class="edi-panel-bar">
      <span class="edi-code-panel-file">{{ file }}</span>
      <span v-if="install">{{ install }}</span>
    </div>
    <div ref="body" class="edi-code-panel-body vp-doc">
      <slot />
    </div>
    <div class="edi-code-panel-output">
      <span>{{ outputLabel ?? 'output' }}</span>
      <span class="edi-code-panel-result">{{ output }}</span>
    </div>
  </div>
</template>
