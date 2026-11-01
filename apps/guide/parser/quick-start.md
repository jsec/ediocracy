---
title: Quick start
pageClass: edi-numbered
---

Read a 271 response from a file and print each subscriber with the number of
benefits that the payer reported.

## Run it

::: aside Install
`pnpm add @ediocracy/parser`

The package isn't published to npm yet.
:::

::: aside Requires
Node.js 26 or later. ESM only.
:::

Save a 271 response as `response.x12`, or download the
[single benefit example](/examples/single-eb.edi) and rename it. Then run the
following code:

<CodePanel file="quick-start.ts" output="JORDAN REED: 1 benefits" highlights-steps>

<<< @/parser/snippets/quick-start.ts#example

</CodePanel>

## What the code does

Select a step to highlight its lines.

<CodeSteps :lines="[[7], [7, 8], [9, 10, 11]]">

1. The `readX12` function splits the text into interchanges, functional
   groups, and transaction sets. If the text isn't X12, it throws an
   `X12SyntaxError` error.
2. The `read271s` function reads every 271 transaction set in the document
   and skips any other transaction set.
3. Each subscriber's `name` property is the `NM1` segment that names the
   subscriber. `element(3)` returns the last name (`NM103`) and `element(4)`
   returns the first name (`NM104`).

</CodeSteps>

## Next steps

<div class="edi-cards">

- [Read 271 responses →](/parser/guides/reading-271s)

  Describes the fields of a response.

- [Errors and findings →](/parser/guides/errors-and-findings)

  Describes what happens with malformed input.

</div>
