---
title: Quick start
---

This page reads a 271 response from a file and prints each subscriber with
the number of benefits the payer reported.

Save a 271 response as `response.x12`, or download the
[single benefit example](/examples/single-eb.edi) and rename it. Then run:

<<< @/parser/snippets/quick-start.ts#example

For the single benefit example, it prints:

```text
JORDAN REED: 1 benefits
```

## What the code does

1. `readX12` splits the text into interchanges, functional groups and
   transaction sets. It throws `X12SyntaxError` if the text is not X12.
2. `read271s` reads every 271 transaction set in the document and skips any
   other transaction set.
3. Each subscriber's `name` is the NM1 segment that names them.
   `element(3)` is the last name (NM103) and `element(4)` is the first name
   (NM104).

## Next steps

- [Reading 271 responses](/parser/guides/reading-271s) describes the fields
  of a response.
- [Errors and findings](/parser/guides/errors-and-findings) describes what
  happens with malformed input.
