---
title: Parser
---

The `@ediocracy/parser` package reads X12 text into typed interchanges,
functional groups, and transaction sets. It also reads 271 eligibility
responses into payers, providers, subscribers, and benefits.

::: info
The package isn't published to npm yet. After it's published, install it
with the command in the following section.
:::

## Install the package

```sh
pnpm add @ediocracy/parser
```

## Requirements

The package has the following requirements:

- Node.js 26 or later. The package is ECMAScript modules (ESM) only.
- The 005010X279A1 implementation guide. The 271 reader follows this guide.
  It also reads responses that use another version, and adds an
  `unexpected-version` finding to each one.

## What the package provides

The package provides the following functions and classes:

- The [`readX12`](/parser/api/functions/readX12) function reads any X12 text
  into interchanges, groups, transaction sets, and segments. For more
  information, see [Read X12 envelopes](/parser/guides/low-level-reader).
- The [`read271`](/parser/api/functions/read271) and
  [`read271s`](/parser/api/functions/read271s) functions read 271
  transaction sets into the `Response271` type. For more information, see
  [Read 271 responses](/parser/guides/reading-271s).
- The [`X12SyntaxError`](/parser/api/classes/X12SyntaxError) class is the
  error that the parser throws for text that it can't read. The parser
  returns smaller problems as findings. For more information, see
  [Errors and findings](/parser/guides/errors-and-findings).

To get started, see the [quick start](/parser/quick-start).
