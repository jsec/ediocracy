<script setup lang="ts">
import { SEGMENT_DEFINITIONS } from '../../src/lib/walkthrough.mjs';
</script>

<template>
  <section v-for="(definition, name) in SEGMENT_DEFINITIONS" class="x12-segment-fields">
    <h3 :id="name.toLowerCase()">{{ name }}</h3>
    <p>{{ definition.purpose }}</p>
    <div class="x12-field-table-wrap">
      <table class="x12-field-table">
        <caption>{{ name }} fields</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Field name</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="([fieldName, meaning], index) in definition.fields">
            <td><code>{{ name }}{{ String(index + 1).padStart(2, '0') }}</code></td>
            <td>{{ fieldName }}</td>
            <td>{{ meaning }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
