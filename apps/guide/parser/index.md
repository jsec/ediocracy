---
title: Parser
---

`@ediocracy/parser` reads X12 text into typed interchanges, functional
groups and transaction sets, and reads 271 eligibility responses into
payers, providers, subscribers and benefits.

::: info
The package is not published to npm yet. The install command below is the
one to use once it is.
:::

## Install

```sh
pnpm add @ediocracy/parser
```

## Requirements

- Node.js 26 or later. The package is ESM only.
- The 271 reader follows the 005010X279A1 implementation guide. Responses
  under another version are read, and each one gets an `unexpected-version`
  finding.

## What it provides

- [`readX12`](/parser/api/functions/readX12) reads any X12 text into
  interchanges, groups, transaction sets and segments. See
  [Reading X12 envelopes](/parser/guides/low-level-reader).
- [`read271`](/parser/api/functions/read271) and
  [`read271s`](/parser/api/functions/read271s) read 271 transaction sets
  into the `Response271` type. See [Reading 271 responses](/parser/guides/reading-271s).
- [`X12SyntaxError`](/parser/api/classes/X12SyntaxError) is thrown for text
  that cannot be read. Smaller problems are returned as findings. See
  [Errors and findings](/parser/guides/errors-and-findings).

Start with the [quick start](/parser/quick-start).
