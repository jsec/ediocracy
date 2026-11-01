<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import { ROLE_LABELS, segmentRole } from '../../src/lib/walkthrough.mjs';
import { data } from './examples.data';
import X12Segment from './X12Segment.vue';

const SEGMENT_STEPS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };
const FIELD_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

const props = defineProps<{ file: string }>();

const walkthrough = data[props.file];
const segments = walkthrough.interchanges.flatMap((interchange) => interchange.segments.map((segment) => ({
  ...segment,
  interchange: interchange.ordinal,
  role: segmentRole(segment.name),
})));
const interchangeCount = walkthrough.interchanges.length;
const version = segments.find((segment) => segment.name === 'ST')?.fields[2]?.rawValue;
const firstBenefit = segments.findIndex((segment) => segment.name === 'EB');

const list = useTemplateRef('list');
const selectedSegment = ref(Math.max(firstBenefit, 0));
const selectedField = ref(0);

const segment = computed(() => segments[selectedSegment.value]);

function selectSegment(index: number) {
  selectedSegment.value = Math.min(Math.max(index, 0), segments.length - 1);
  selectedField.value = 0;
}

function selectField(index: number) {
  selectedField.value = Math.min(Math.max(index, 0), segment.value.fields.length - 1);
}

async function moveSelection(event: KeyboardEvent) {
  const segmentStep = SEGMENT_STEPS[event.key];
  const fieldStep = FIELD_STEPS[event.key];

  if (fieldStep) {
    event.preventDefault();
    selectField(selectedField.value + fieldStep);

    return;
  }

  if (!segmentStep) {
    return;
  }

  event.preventDefault();
  selectSegment(selectedSegment.value + segmentStep);

  await nextTick();
  list.value?.querySelector<HTMLElement>('.is-selected')?.focus();
}
</script>

<template>
  <div class="edi-example">
    <div class="edi-pills">
      <span class="edi-pill">{{ segments.length }} segments</span>
      <span class="edi-pill">{{ interchangeCount }} {{ interchangeCount === 1 ? 'interchange' : 'interchanges' }}</span>
      <span v-if="version" class="edi-pill">{{ version }}</span>
      <a class="edi-pill edi-pill-download" :href="`/examples/${file}`" :download="file">↓ {{ file }}</a>
    </div>

    <div class="edi-inspector" @keydown="moveSelection">
      <div class="edi-inspector-source">
        <div class="edi-panel-bar">
          <span>{{ file }}</span>
          <span>click a segment</span>
        </div>
        <div ref="list" class="edi-inspector-list">
          <template v-for="(row, index) in segments" :key="index">
            <p
              v-if="interchangeCount > 1 && (index === 0 || segments[index - 1].interchange !== row.interchange)"
              class="edi-inspector-interchange"
            >
              Interchange {{ row.interchange }}
            </p>
            <button
              type="button"
              class="edi-inspector-row"
              :class="[row.role && `edi-role-${row.role}`, { 'is-selected': index === selectedSegment }]"
              :aria-pressed="index === selectedSegment"
              @click="selectSegment(index)"
            >
              <span class="edi-inspector-ordinal">{{ index + 1 }}</span>
              <span class="edi-inspector-id">{{ row.name }}</span>
              <span class="edi-inspector-rest">{{ row.raw.slice(row.name.length) }}</span>
            </button>
          </template>
        </div>
      </div>

      <div class="edi-inspector-detail" :class="segment.role && `edi-role-${segment.role}`">
        <div class="edi-inspector-nav">
          <span>Segment {{ selectedSegment + 1 }} of {{ segments.length }}</span>
          <div>
            <button type="button" class="edi-button-small" @click="selectSegment(selectedSegment - 1)">← Prev</button>
            <button type="button" class="edi-button-small" @click="selectSegment(selectedSegment + 1)">Next →</button>
          </div>
        </div>

        <div class="edi-inspector-heading">
          <div>
            <span class="edi-inspector-name">{{ segment.name }}</span>
            <span v-if="segment.role" class="edi-pill edi-inspector-role">{{ ROLE_LABELS[segment.role] }}</span>
          </div>
          <p>{{ segment.explanation }}</p>
        </div>

        <div class="edi-inspector-raw">
          <X12Segment :raw="segment.raw" :selected="selectedField + 1" is-clickable @select="(position) => selectField(position - 1)" />
        </div>

        <div class="edi-inspector-fields">
          <button
            v-for="(field, index) in segment.fields"
            :key="field.position"
            type="button"
            class="edi-field-card"
            :class="{ 'is-selected': index === selectedField }"
            :aria-pressed="index === selectedField"
            @click="selectField(index)"
          >
            <span class="edi-field-card-top">
              <span class="edi-field-card-position">{{ field.position }}</span>
              <span class="edi-field-card-value" :class="{ 'is-empty': field.rawValue.trim() === '' }">{{ field.displayValue }}</span>
            </span>
            <span class="edi-field-card-name">{{ field.name }}</span>
            <span class="edi-field-card-text">{{ field.explanation }}</span>
          </button>
        </div>

        <a :href="`/guide/reference/segments#${segment.name.toLowerCase()}`">Full {{ segment.name }} field reference →</a>
      </div>
    </div>
  </div>
</template>
