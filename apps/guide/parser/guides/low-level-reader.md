---
title: Reading X12 envelopes
---

`readX12` reads any X12 text, not only 271 responses. Use it on its own for
other transaction sets, or to read envelope details such as control
numbers.

<<< @/parser/snippets/low-level-reader.ts#example

## The document

[`readX12`](/parser/api/functions/readX12) returns an
[`X12Document`](/parser/api/type-aliases/X12Document):

- `interchanges`: each ISA to IEA interchange, in order. One text can hold
  more than one interchange.
- `findings`: problems in text that could still be read, such as a control
  number in a trailer that does not match its header.

Each [`Interchange`](/parser/api/type-aliases/Interchange) has its `header`
(ISA), `trailer` (IEA), `delimiters`, `groups`, and any TA1 `segments`
outside a group. Each [`FunctionalGroup`](/parser/api/type-aliases/FunctionalGroup)
has its `header` (GS), `trailer` (GE) and `transactions`. Each
[`Transaction`](/parser/api/type-aliases/Transaction) has its `header` (ST),
`trailer` (SE) and the `segments` between them.

## Segments

A [`Segment`](/parser/api/interfaces/Segment) has a `tag`, such as `EB`, and
the `offset` where it starts in the text.

- `element(position)` returns one element as written. Positions start at 1,
  so `element(1)` of `EB*1**30` is `1`. It returns `''` for a present but
  empty element and `undefined` past the last element.
- `repetitions(position)` splits one element on the interchange's
  repetition separator.

The reader does not split composite elements. Split the result of
`element` on `interchange.delimiters.component` when you need the
components.
