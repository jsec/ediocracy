---
title: Medicare primary and commercial secondary context
description: A complete 271 response for a Medicare-primary and commercial-secondary scenario.
---

## Scenario

This example follows a subscriber with Medicare-primary and commercial-secondary
coverage labels. Two `EB` statements and a `MSG` message show how related
details can appear in one subscriber context.

Scenario labels do not establish payer order. To determine coverage order, use
the actual response, payer or plan records, and applicable route rules.

## Complete response

<X12Example file="medicare-primary-commercial-secondary.edi" />

## Sources

- [CMS-MSP](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer) supports the program-level coordination context.
- [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) explains a published use of `MSG` in a 271.
- The segment reference has field tables for [`EB`](/guide/reference/segments#eb), [`MSG`](/guide/reference/segments#msg), [`HL`](/guide/reference/segments#hl), and [`NM1`](/guide/reference/segments#nm1).
