---
title: Medicare Secondary Payer context
description: A complete 271 response for a Medicare Secondary Payer scenario.
---

## Scenario

This example uses a Medicare Secondary Payer (MSP) scenario with a subscriber,
a benefit statement, and a date. The values were written for this guide to
illustrate MSP terms.

Scenario labels do not establish payer order. To determine coverage order, use
the actual response, payer or plan records, and applicable route rules.

## Complete response

<X12Example file="medicare-secondary-payer.edi" />

## Sources

- [CMS-MSP](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer) supports the MSP program context.
- [X12-EXAMPLES-005010X279](https://x12.org/examples/005010x279) supports the public 271 pattern and hierarchy examples.
- The segment reference has field tables for [`EB`](/guide/reference/segments#eb), [`DTP`](/guide/reference/segments#dtp), and [`NM1`](/guide/reference/segments#nm1).
