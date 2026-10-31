---
title: Errors and findings
---

The parser reports problems in two ways. If the parser can't read the text,
it throws an `X12SyntaxError` error. If a problem leaves the text readable,
the parser returns the problem as a finding and reads the rest of the text.

<<< @/parser/snippets/errors-and-findings.ts#example

## `X12SyntaxError`

The [`readX12`](/parser/api/functions/readX12) function throws an
[`X12SyntaxError`](/parser/api/classes/X12SyntaxError) error when the text
has no ISA segment, an envelope has no trailer, or a segment is outside the
envelope that it belongs to. The error has a `code` property, which contains
a value from [`SyntaxErrorCode`](/parser/api/type-aliases/SyntaxErrorCode),
and an `offset` property, which contains the position in the text where the
parser found the problem.

## Findings

Each [`Finding`](/parser/api/type-aliases/Finding) has a `code`, a
`message` that names the elements involved, and the `segment` where the
parser found the problem.

The parser returns findings in the following properties:

- The `X12Document.findings` property uses codes from
  [`ReaderFindingCode`](/parser/api/type-aliases/ReaderFindingCode). These
  codes report control numbers or counts in a trailer that don't match, a
  missing control number, or a segment that ends with a separator.
- The `Response271.findings` property uses codes from
  [`Response271FindingCode`](/parser/api/type-aliases/Response271FindingCode).
  These codes report a segment that the 005010X279A1 guide doesn't allow
  where it appears, a hierarchy problem in the HL segments, a list of related
  parties that doesn't end, or an unexpected version.

Findings don't stop the parser. For each code, decide whether your
application accepts the response, logs it, or rejects it.
