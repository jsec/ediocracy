---
title: UnitedHealthcare companion guide
description: How to apply UnitedHealthcare's 005010X279A1 companion guide.
---

UnitedHealthcare's public Version 9.0 companion guide describes the products
and routes named in that document. Use the [guide PDF](https://www.uhcprovider.com/content/dam/provider/docs/public/resources/edi/EDI-270-271-Companion-Guide-005010X279A1.pdf)
for its interchange values, connectivity instructions, and examples. Its cover
date is 2025-02-02, and its change log is dated 2025-02-04.

## Profile details

Within that named guide, UHC documents interchange values, delimiter requests,
scoped payer identifiers, and differences between batch and real-time flows.

The guide's examples also provide profile-scoped context for repeated `EB`
benefit statements, `HSD` service-delivery details, `MSG` text, and `2120`
entity information. X279A1 supplies the complete loop rules.

## Outcome layers

Keep the acknowledgment and application layers distinct:

- TA1 concerns interchange acknowledgment.
- 999 concerns functional validation and acknowledgment.
- 271 carries the eligibility or benefit response.
- `AAA` supplies request-level response-error context inside the applicable
  transaction.

The profile describes batch and real-time handling for its own routes. If an
Optum product or another clearinghouse sits in the path, follow that service's
instructions too.

## Version and route checks

Before implementation, verify that Version 9.0 covers the payer, product, and
connection you plan to use. Obtain payer lists and current route details from
UHC or the route owner. Use X279A1 for the base transaction.
