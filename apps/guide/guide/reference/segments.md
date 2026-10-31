---
title: Segment and field index
description: Lookup table for the X12 segments and fields used in the complete examples.
---

Use this table to locate a segment in a complete example. Field names are the
X12 005010 element names. Use the X279A1
implementation guide for complete grammar and situational rules.

## Segment index

| Segment | Purpose | Important fields in this guide | Example pages | Fields |
| --- | --- | --- | --- | --- |
| `ISA` | Opens an interchange and establishes its control values and fixed-position delimiters. | `ISA13` interchange control, fixed separator positions. | [Single](/guide/examples/single-eb), [Multiple](/guide/examples/multiple-interchanges) | [ISA fields](#isa) |
| `IEA` | Closes an interchange and declares its group count and matching control. | `IEA01` group count, `IEA02` control value. | [Single](/guide/examples/single-eb), [Multiple](/guide/examples/multiple-interchanges) | [IEA fields](#iea) |
| `GS` | Opens a functional group inside an interchange. | `GS06` group control value, functional-group identity. | [Single](/guide/examples/single-eb), [Medicare secondary](/guide/examples/medicare-secondary-payer) | [GS fields](#gs) |
| `GE` | Closes a functional group and declares its transaction count. | `GE01` transaction count, `GE02` matching control value. | [Single](/guide/examples/single-eb), [Multiple](/guide/examples/multiple-interchanges) | [GE fields](#ge) |
| `ST` | Opens a transaction set. | `ST01=271`, `ST02` transaction control, `ST03=005010X279A1`. | [Single](/guide/examples/single-eb), [Medicare Advantage](/guide/examples/medicare-advantage) | [ST fields](#st) |
| `SE` | Closes a transaction set and declares its segment count. | `SE01` count from `ST` through `SE`, `SE02` matching control. | [Single](/guide/examples/single-eb), [Multiple](/guide/examples/multiple-interchanges) | [SE fields](#se) |
| `BHT` | Supplies beginning-of-hierarchical-transaction context. | Transaction purpose, reference, date, and time values. | [Single](/guide/examples/single-eb), [Medicare secondary](/guide/examples/medicare-secondary-payer) | [BHT fields](#bht) |
| `HL` | Establishes a hierarchical level and optional parent relationship. | `HL01` level ID, `HL02` parent ID, `HL03` level code, `HL04` child indicator. | [Single](/guide/examples/single-eb), [Multiple](/guide/examples/multiple-interchanges) | [HL fields](#hl) |
| `NM1` | Identifies the party attached to the current hierarchy. | Entity identifier, entity type, name, and example identifier values. | [Single](/guide/examples/single-eb), [Medicare Advantage](/guide/examples/medicare-advantage) | [NM1 fields](#nm1) |
| `TRN` | Returns the trace numbers sent in the 270 so the response can be matched to its request. | `TRN01=2` referenced trace, `TRN02` trace number, `TRN03` originating company. | Not used in the examples; see [Transaction context](/guide/structure/transaction-context) | [TRN fields](#trn) |
| `EB` | Reports a qualified eligibility or benefit statement. | `EB01` status, `EB03` service type, and nearby plan/context values. | [Single](/guide/examples/single-eb), [All complete examples](/guide/reference/examples) | [EB fields](#eb) |
| `DTP` | Supplies a date or date-period related to the current context. | Date qualifier, format qualifier, and example date value. | [Medicare secondary](/guide/examples/medicare-secondary-payer), [Medicare Advantage](/guide/examples/medicare-advantage) | [DTP fields](#dtp) |
| `MSG` | Contains explanatory text where the example uses a message value. | Example message text read with its surrounding `EB` and hierarchy. | [Primary/secondary](/guide/examples/medicare-primary-commercial-secondary), [Medicare Advantage](/guide/examples/medicare-advantage) | [MSG fields](#msg); related case: [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) |

## Control-pair lookup

Read opening and closing segments together: `ISA13` with `IEA02`, `GS06` with
`GE02`, and `ST02` with `SE02`. The complete examples also declare group,
transaction, and segment counts. Validate those relationships first, then
apply the remaining X279A1 rules.

## Segment fields

The tables list the fields this guide explains, in position order.

<SegmentFields />
