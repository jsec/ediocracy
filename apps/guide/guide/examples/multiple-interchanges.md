---
title: Multiple interchanges in one payload
description: A complete payload containing two independent X12 interchanges.
---

## Scenario

This file contains two complete interchanges: the single-benefit example
followed by the Medicare Advantage example. Each has its own `ISA`/`IEA`,
functional group, and transaction set.

## Complete response

<X12Example file="multiple-interchanges.edi" />

## Sources

- [X12-RFI-1585](https://x12.org/resources/requests-for-interpretation/rfi-1585-reporting-multi-isas-999) supports multiple interchanges in one physical file.
- [X12-EXAMPLES-005010X279](https://x12.org/examples/005010x279) supports the public 271 interchange and hierarchy pattern.
- The [ISA](/guide/reference/segments#isa), [IEA](/guide/reference/segments#iea), [GS](/guide/reference/segments#gs), [GE](/guide/reference/segments#ge), [ST](/guide/reference/segments#st), [SE](/guide/reference/segments#se), and [EB](/guide/reference/segments#eb) field tables are in the segment reference.
