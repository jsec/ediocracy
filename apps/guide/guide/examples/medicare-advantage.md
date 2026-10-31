---
title: Medicare Advantage context
description: A complete response illustrating Medicare Advantage program context.
---

## Scenario

This example places an `EB` statement, a `DTP` date, and `MSG` text under one
subscriber in a Medicare Advantage scenario. The values were written for this
guide.

## Complete response

<X12Example file="medicare-advantage.edi" />

## Sources

- [CMS-MA](https://www.cms.gov/medicare/enrollment-renewal/health-plans) supports program-level Medicare Advantage context.
- [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) explains the `MSG` case described on the page.
- The [EB](/guide/reference/segments#eb), [DTP](/guide/reference/segments#dtp), [MSG](/guide/reference/segments#msg), [ISA](/guide/reference/segments#isa), [IEA](/guide/reference/segments#iea), [GS](/guide/reference/segments#gs), and [GE](/guide/reference/segments#ge) field tables are in the segment reference.
