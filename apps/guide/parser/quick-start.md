---
title: Quick start
---

In this quick start, you read a 271 response from a file and print each
subscriber with the number of benefits that the payer reported.

Save a 271 response as `response.x12`, or download the
[single benefit example](/examples/single-eb.edi) and rename it. Then run the
following code:

<<< @/parser/snippets/quick-start.ts#example

For the single benefit example, the code prints the following output:

```text
JORDAN REED: 1 benefits
```

## What the code does

1. The `readX12` function splits the text into interchanges, functional
   groups, and transaction sets. If the text isn't X12, it throws an
   `X12SyntaxError` error.
2. The `read271s` function reads every 271 transaction set in the document
   and skips any other transaction set.
3. Each subscriber's `name` property is the NM1 segment that names the
   subscriber. `element(3)` returns the last name (NM103) and `element(4)`
   returns the first name (NM104).

## Next steps

For more information, see the following pages:

- [Read 271 responses](/parser/guides/reading-271s) describes the fields of
  a response.
- [Errors and findings](/parser/guides/errors-and-findings) describes what
  happens with malformed input.
