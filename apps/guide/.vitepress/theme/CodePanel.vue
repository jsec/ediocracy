<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue';

import { activeStepLines } from './code-steps';

const COPIED_DURATION = 1400;

const props = defineProps<{
  file: string;
  output: string;
  outputLabel?: string;
  install?: string;
  highlightsSteps?: boolean;
}>();

const body = useTemplateRef('body');
const isCopied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  const code = body.value?.querySelector('pre')?.textContent ?? '';

  await navigator.clipboard.writeText(code);

  isCopied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    isCopied.value = false;
  }, COPIED_DURATION);
}

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
      <button v-else type="button" class="edi-copy" :class="{ 'is-copied': isCopied }" @click="copy">
        {{ isCopied ? 'Copied' : 'Copy' }}
      </button>
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
