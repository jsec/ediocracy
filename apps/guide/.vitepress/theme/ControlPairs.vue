<script setup lang="ts">
import { data } from './examples.data';

const fields = data['single-eb.edi'].interchanges
  .flatMap((interchange) => interchange.segments)
  .flatMap((segment) => segment.fields);

function valueAt(position: string) {
  return fields.find((field) => field.position === position)?.rawValue;
}

const pairs = [
  ['ISA13', 'IEA02', valueAt('ISA13')],
  ['GS06', 'GE02', valueAt('GS06')],
  ['ST02', 'SE02', `${valueAt('ST02')} · SE01 counts ${valueAt('SE01')} segments`],
];
</script>

<template>
  <div class="edi-control-pairs">
    <div v-for="[opening, closing, value] in pairs" :key="opening" class="edi-control-pair">
      <div class="edi-control-pair-ids">
        <span>{{ opening }}</span>
        <span class="edi-control-pair-arrow">⇄</span>
        <span>{{ closing }}</span>
      </div>
      <div class="edi-control-pair-value">
        <span>In the single-benefit example</span>
        <span>{{ value }}</span>
      </div>
    </div>
  </div>
</template>
