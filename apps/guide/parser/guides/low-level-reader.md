---
title: Read X12 envelopes
---

The `readX12` function reads any X12 text, including transaction sets other
than 271 responses. Use it on its own for other transaction sets, or to read
envelope details such as control numbers.

<<< @/parser/snippets/low-level-reader.ts#example

## The document

The [`readX12`](/parser/api/functions/readX12) function returns an
[`X12Document`](/parser/api/type-aliases/X12Document) object, which has the
following properties:

- `interchanges`: each ISA to IEA interchange, in order. One text can
  contain more than one interchange.
- `findings`: problems in text that the parser could still read, such as a
  control number in a trailer that doesn't match its header.

Each [`Interchange`](/parser/api/type-aliases/Interchange) has its `header`
(ISA), `trailer` (IEA), `delimiters`, `groups`, and any TA1 `segments` that
aren't in a group. Each
[`FunctionalGroup`](/parser/api/type-aliases/FunctionalGroup) has its
`header` (GS), `trailer` (GE), and `transactions`. Each
[`Transaction`](/parser/api/type-aliases/Transaction) has its `header` (ST),
`trailer` (SE), and the `segments` between them.

## Segments

A [`Segment`](/parser/api/interfaces/Segment) has a `tag`, such as `EB`, and
the `offset` where it starts in the text. It has the following methods:

- `element(position)` returns one element as written. Positions start at 1,
  so `element(1)` of `EB*1**30` is `1`. It returns `''` for a present but
  empty element, and `undefined` for a position after the last element.
- `repetitions(position)` splits one element on the interchange's
  repetition separator.

The reader doesn't split composite elements. To get the components, split
the result of the `element` method on `interchange.delimiters.component`.
