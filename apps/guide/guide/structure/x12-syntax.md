---
title: X12 syntax in a 271
description: Segments, elements, separators, and control values in an X12 message.
---

X12 syntax represents a message as segments separated by a terminator, with
data elements separated by an element separator and composite components
separated by a component separator. The [segment reference](/guide/reference/segments)
lists the fields used in this guide. X279A1 defines the full grammar.

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

### Empty and trailing elements

Parser fixture `GX12-003` shows both an interior empty element and an empty
element at the end of a segment:

```text
N1*ALPHA**GAMMA~
REF*ZZ*VALUE*~
```

The doubled separator in `N1` marks an empty `N102`, which X12 syntax allows.
The separator before `~` in `REF` is different: X12 treats a separator
directly before the segment terminator as incorrect usage. A receiver can
report it in a 999 with `IK403=3` (Too Many Data Elements); see
[RFI 1498](https://x12.org/resources/requests-for-interpretation/rfi-1498-trailing-delimiters-and-999).
The fixture includes it so that a reader can be tested on keeping the raw
position when a sender makes this error.

## Delimiters and control values

The interchange header supplies delimiter characters at defined positions for
that interchange. Read them from each `ISA`: trading partners can use
different characters.

### Alternate delimiters

Parser fixture `GX12-002` uses `|` as its element separator and `` ` `` as its
segment terminator. Its `ISA11` repetition separator is `!`, and its `ISA16`
component separator is `;`. The fixture demonstrates that one interchange can
use a different delimiter set; it is not an eligibility-benefit example.

Control values identify and count containers: `ISA13` pairs with `IEA02`,
`GS06` with `GE02`, and `ST02` with `SE02`. Matching values tie each trailer
to its header.

The public examples and the [ISA fields](/guide/reference/segments#isa)
show the syntax used here. X279A1 and partner guides set the transaction and
route rules.
