---
title: X12 syntax in a 271
description: Segments, elements, separators, and control values in an X12 message.
---

X12 syntax represents a message as segments separated by a terminator, with
data elements separated by an element separator and composite components
separated by a component separator. The [Stedi 005010 references](https://www.stedi.com/edi/x12-005010/segment/ISA)
are useful for looking up fields. X279A1 defines the full grammar.

## Segments and elements

A segment starts with an identifier such as `ST` or `EB`. Its elements follow
in order, as in this short excerpt from `single-eb.edi`:

```text
ST*271*0101*005010X279A1~
EB*1**30**SILVER PPO~
```

The `*` separates elements in this example, and `~` ends each segment. A
composite element contains component values separated by the component
separator. Repetition separators can represent repeated values where the
transaction permits them. Adjacent separators mark an empty element without
changing the position of the elements that follow. In this example, the
separator pair after `EB*1` marks an empty `EB02`.

## Delimiters and control values

The interchange header supplies delimiter characters at defined positions for
that interchange. Read them from each `ISA`: trading partners can use
different characters.
Control values identify and count containers: `ISA13` pairs with `IEA02`,
`GS06` with `GE02`, and `ST02` with `SE02`. Matching values tie each trailer
to its header.

These observations describe the public examples and [Stedi's ISA reference](https://www.stedi.com/edi/x12-005010/segment/ISA).
Use the implementation and partner guides for situational rules and parser
requirements.
