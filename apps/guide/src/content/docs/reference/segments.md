---
title: Segment and field index
description: Lookup table for the X12 segments and fields used in the complete examples.
---

Use this table to locate a segment in a complete example. Field names and
relationships come from public cross-references. Use the X279A1
implementation guide for complete grammar and situational rules.

## Segment index

| Segment | Purpose | Important fields in this guide | Example pages | Primary reference |
| --- | --- | --- | --- | --- |
| `ISA` | Opens an interchange and establishes its control values and fixed-position delimiters. | `ISA13` interchange control, fixed separator positions. | [Single](/examples/single-eb), [Multiple](/examples/multiple-interchanges) | [STEDI-ISA](https://www.stedi.com/edi/x12-005010/segment/ISA) |
| `IEA` | Closes an interchange and declares its group count and matching control. | `IEA01` group count, `IEA02` control value. | [Single](/examples/single-eb), [Multiple](/examples/multiple-interchanges) | [STEDI-IEA](https://www.stedi.com/edi/x12-005010/segment/IEA) |
| `GS` | Opens a functional group inside an interchange. | `GS06` group control value, functional-group identity. | [Single](/examples/single-eb), [Medicare secondary](/examples/medicare-secondary-payer) | [STEDI-GS](https://www.stedi.com/edi/x12-005010/segment/GS) |
| `GE` | Closes a functional group and declares its transaction count. | `GE01` transaction count, `GE02` matching control value. | [Single](/examples/single-eb), [Multiple](/examples/multiple-interchanges) | [STEDI-GE](https://www.stedi.com/edi/x12-005010/segment/GE) |
| `ST` | Opens a transaction set. | `ST01=271`, `ST02` transaction control, `ST03=005010X279A1`. | [Single](/examples/single-eb), [Medicare Advantage](/examples/medicare-advantage) | [STEDI-ST](https://www.stedi.com/edi/x12-005010/segment/ST) |
| `SE` | Closes a transaction set and declares its segment count. | `SE01` count from `ST` through `SE`, `SE02` matching control. | [Single](/examples/single-eb), [Multiple](/examples/multiple-interchanges) | [STEDI-SE](https://www.stedi.com/edi/x12-005010/segment/SE) |
| `BHT` | Supplies beginning-of-hierarchical-transaction context. | Transaction purpose, reference, date, and time values. | [Single](/examples/single-eb), [Medicare secondary](/examples/medicare-secondary-payer) | [STEDI-BHT](https://www.stedi.com/edi/x12-005010/segment/BHT) |
| `HL` | Establishes a hierarchical level and optional parent relationship. | `HL01` level ID, `HL02` parent ID, `HL03` level code, `HL04` child indicator. | [Single](/examples/single-eb), [Multiple](/examples/multiple-interchanges) | [STEDI-HL](https://www.stedi.com/edi/x12-005010/segment/HL) |
| `NM1` | Identifies the party attached to the current hierarchy. | Entity identifier, entity type, name, and example identifier values. | [Single](/examples/single-eb), [Medicare Advantage](/examples/medicare-advantage) | [STEDI-NM1](https://www.stedi.com/edi/x12-005010/segment/NM1) |
| `EB` | Reports a qualified eligibility or benefit statement. | `EB01` status, `EB03` service type, and nearby plan/context values. | [Single](/examples/single-eb), [All complete examples](/reference/examples) | [STEDI-EB](https://www.stedi.com/edi/x12-005010/segment/EB) |
| `DTP` | Supplies a date or date-period related to the current context. | Date qualifier, format qualifier, and example date value. | [Medicare secondary](/examples/medicare-secondary-payer), [Medicare Advantage](/examples/medicare-advantage) | [STEDI-DTP](https://www.stedi.com/edi/x12-005010/segment/DTP) |
| `MSG` | Carries explanatory text where the example uses a message value. | Example message text read with its surrounding `EB` and hierarchy. | [Primary/secondary](/examples/medicare-primary-commercial-secondary), [Medicare Advantage](/examples/medicare-advantage) | [STEDI-MSG](https://www.stedi.com/edi/x12-005010/segment/MSG); related case: [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) |

## Control-pair lookup

Read opening and closing segments together: `ISA13` with `IEA02`, `GS06` with
`GE02`, and `ST02` with `SE02`. The complete examples also declare group,
transaction, and segment counts. Validate those relationships first, then
apply the remaining X279A1 rules.
