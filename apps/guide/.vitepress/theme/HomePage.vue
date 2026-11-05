<script setup lang="ts">
import { guideSidebar } from '../sidebar-guide.mjs';
import CodePanel from './CodePanel.vue';

const LEGEND = [
  ['envelope', 'ISA GS ST', 'Envelope'],
  ['context', 'BHT TRN', 'Transaction context'],
  ['hierarchy', 'HL NM1 LS LE', 'Party hierarchy'],
  ['benefit', 'EB HSD DTP REF MSG', 'Benefit'],
];

const ANATOMY = [
  ['EB', 'Segment ID', 'Benefit'],
  ['1', 'EB01', 'Active coverage'],
  ['', 'EB02', 'Empty'],
  ['30', 'EB03', 'Health benefit plan coverage'],
  ['', 'EB04', 'Empty'],
  ['SILVER PPO', 'EB05', 'Plan description'],
];

const PARSER_ENTRIES = [
  ['readX12', '/parser/api/functions/readX12', 'Reads any X12 text into interchanges, groups, transaction sets, and segments.'],
  ['read271 · read271s', '/parser/api/271/functions/read271', 'Read 271 transaction sets into the Response271 type: payers, providers, subscribers, and benefits.'],
  ['X12SyntaxError', '/parser/api/classes/X12SyntaxError', 'Thrown for text the parser can’t read. Smaller problems come back as findings.'],
];
</script>

<template>
  <div class="edi-home">
    <section class="edi-hero">
      <div class="edi-hero-text">
        <p class="edi-eyebrow">X12 271 · 005010X279A1</p>
        <h1 class="edi-wordmark">edi<span class="edi-logo-star">*</span>ocracy<span class="edi-logo-tilde">~</span></h1>
        <p class="edi-tagline">X12 271 eligibility responses, explained, and a TypeScript parser to read them.</p>
        <div class="edi-hero-actions">
          <a class="edi-button edi-button-primary" href="/guide/">Understand 271 responses</a>
          <a class="edi-button" href="/parser/">Use the parser</a>
        </div>
      </div>
      <CodePanel file="quick-start.ts" install="pnpm add @ediocracy/parser" output="JORDAN REED: 1 benefits" output-label="$">
        <slot />
      </CodePanel>
    </section>

    <section class="edi-anatomy" aria-label="Anatomy of a segment">
      <div class="edi-anatomy-intro">
        <p>
          One line from a 271. Every segment starts with an ID, then elements separated by
          <code>*</code>, then ends with <code>~</code>.
        </p>
        <ul class="edi-legend">
          <li v-for="[role, ids, label] in LEGEND" :key="role" :class="`edi-role-${role}`">
            <span class="edi-legend-swatch" />
            <span class="edi-legend-ids">{{ ids }}</span>
            <span>{{ label }}</span>
          </li>
        </ul>
      </div>
      <div class="edi-anatomy-segment">
        <template v-for="([value, position, meaning], index) in ANATOMY" :key="position">
          <span v-if="index > 0" class="edi-anatomy-separator">*</span>
          <div class="edi-anatomy-element" :class="{ 'is-id': index === 0, 'is-empty': value === '' }">
            <span class="edi-anatomy-value">{{ value || ' ' }}</span>
            <span class="edi-anatomy-label">
              <span class="edi-anatomy-position">{{ position }}</span>
              <span>{{ meaning }}</span>
            </span>
          </div>
        </template>
        <span class="edi-anatomy-separator">~</span>
      </div>
    </section>

    <section class="edi-home-columns">
      <div>
        <div class="edi-home-heading">
          <h2>The guide</h2>
          <a href="/guide/">Start reading →</a>
        </div>
        <div class="edi-home-list">
          <div v-for="group in guideSidebar" :key="group.text" class="edi-home-row">
            <span class="edi-home-group">{{ group.text }}</span>
            <ul>
              <li v-for="item in group.items" :key="item.link">
                <a :href="item.link">{{ item.text }}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div>
        <div class="edi-home-heading">
          <h2>The parser</h2>
          <a href="/parser/quick-start">Quick start →</a>
        </div>
        <div class="edi-home-list">
          <a v-for="[name, link, description] in PARSER_ENTRIES" :key="name" class="edi-home-row" :href="link">
            <span class="edi-home-api">{{ name }}</span>
            <span>{{ description }}</span>
          </a>
        </div>
        <p class="edi-home-requirements">Node.js 26 or later · ESM only · not yet published to npm</p>
      </div>
    </section>
  </div>
</template>
