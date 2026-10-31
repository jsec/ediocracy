<script setup lang="ts">
import { data } from './examples.data';

const props = defineProps<{ file: string }>();
const walkthrough = data[props.file];
</script>

<template>
  <p>
    <a :href="`/examples/${file}`" :download="file">Download the EDI file</a>
  </p>
  <pre class="x12-complete-response"><code>{{ walkthrough.displaySource }}</code></pre>

  <section class="x12-walkthrough" :aria-labelledby="`breakdown-${file}`">
    <h3 :id="`breakdown-${file}`">Segment breakdown</h3>
    <p>
      The following entries are in source order. A field that is present but
      empty appears as <code>(empty)</code>. The breakdown doesn't add absent
      fields. Each segment links to its field table in the segment reference.
      For transaction rules, use the licensed X279A1 implementation guide.
    </p>

    <section
      v-for="interchange in walkthrough.interchanges"
      class="x12-interchange"
      :aria-labelledby="`interchange-${file}-${interchange.ordinal}`"
    >
      <h4 :id="`interchange-${file}-${interchange.ordinal}`">Interchange {{ interchange.ordinal }}</h4>
      <nav :aria-label="`Interchange ${interchange.ordinal} segment navigation`">
        <ul class="x12-segment-navigation">
          <li v-for="segment in interchange.segments">
            <a :href="`#segment-${file}-${interchange.ordinal}-${segment.ordinal}`">{{ segment.ordinal }}. {{ segment.name }}</a>
          </li>
        </ul>
      </nav>
      <ol class="x12-segments">
        <li v-for="segment in interchange.segments">
          <h5 :id="`segment-${file}-${interchange.ordinal}-${segment.ordinal}`">{{ segment.name }}</h5>
          <p><strong>Raw segment:</strong> <code>{{ segment.raw }}</code></p>
          <p>{{ segment.explanation }}</p>
          <div class="x12-field-table-wrap">
            <table class="x12-field-table" :aria-labelledby="`segment-table-${file}-${interchange.ordinal}-${segment.ordinal}`">
              <colgroup>
                <col class="x12-position-column" />
                <col class="x12-value-column" />
                <col class="x12-name-column" />
                <col />
              </colgroup>
              <caption :id="`segment-table-${file}-${interchange.ordinal}-${segment.ordinal}`">{{ segment.name }} fields</caption>
              <thead>
                <tr>
                  <th scope="col">Position</th>
                  <th scope="col">Raw value</th>
                  <th scope="col">Field name</th>
                  <th scope="col">Explanation</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in segment.fields">
                  <td><code>{{ field.position }}</code></td>
                  <td><code>{{ field.displayValue }}</code></td>
                  <td>{{ field.name }}</td>
                  <td>{{ field.explanation }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="x12-reference">
            Field reference: <a :href="`/guide/reference/segments#${segment.name.toLowerCase()}`">{{ segment.name }} fields</a>.
          </p>
        </li>
      </ol>
    </section>
  </section>
</template>
