---
title: Medicare Advantage context
description: A complete 271 response for a Medicare Advantage scenario.
---

## Scenario

In this Medicare Advantage (MA) scenario, one subscriber has an `EB`
statement, a `DTP` date, and `MSG` text. The values were written for this
guide.

## Complete response

<X12Example file="medicare-advantage.edi" />

## Sources

- [CMS-MA](https://www.cms.gov/medicare/enrollment-renewal/health-plans) supports the program-level MA context.
- [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) explains the `MSG` case that this page describes.
- The segment reference has field tables for [`EB`](/guide/reference/segments#eb), [`DTP`](/guide/reference/segments#dtp), [`MSG`](/guide/reference/segments#msg), [`ISA`](/guide/reference/segments#isa), [`IEA`](/guide/reference/segments#iea), [`GS`](/guide/reference/segments#gs), and [`GE`](/guide/reference/segments#ge).
