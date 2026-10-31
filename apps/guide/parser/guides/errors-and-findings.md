---
title: Errors and findings
---

The parser reports problems in two ways. Text it cannot read throws an
`X12SyntaxError`. Problems that leave the text readable are returned as
findings, and the rest of the text is still read.

<<< @/parser/snippets/errors-and-findings.ts#example

## `X12SyntaxError`

[`readX12`](/parser/api/functions/readX12) throws
[`X12SyntaxError`](/parser/api/classes/X12SyntaxError) when the text has no
ISA, an envelope has no trailer, or a segment is outside the envelope it
belongs to. The error has a `code` from
[`SyntaxErrorCode`](/parser/api/type-aliases/SyntaxErrorCode) and the
`offset` in the text where the problem was found.

## Findings

Each [`Finding`](/parser/api/type-aliases/Finding) has a `code`, a
`message` that names the elements involved, and the `segment` where the
problem was found.

- `X12Document.findings` uses
  [`ReaderFindingCode`](/parser/api/type-aliases/ReaderFindingCode): control
  numbers or counts in a trailer that do not match, a missing control
  number, or a segment that ends with a separator.
- `Response271.findings` uses
  [`Response271FindingCode`](/parser/api/type-aliases/Response271FindingCode):
  a segment the 005010X279A1 guide does not allow where it appears, a
  hierarchy problem in the HL segments, a list of related parties that does
  not end, or an unexpected version.

Findings do not stop the parser. Decide for each code whether your
application accepts the response, logs it, or rejects it.
