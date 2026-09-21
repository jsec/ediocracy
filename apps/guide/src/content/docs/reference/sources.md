---
title: Sources
description: Reader-facing source register for the public X12, segment, CMS, and profile references used by this guide.
---

This register points to the public sources used by the guide.
The links are cross-references and program or route documentation; the
licensed 005010X279A1 implementation guide remains the normative source for
complete grammar and situational requirements.

## X12 standards and public interpretations

| Source | Use in this guide |
| --- | --- |
| [X12-X279-PRODUCT](https://ecommerce.x12.org/products/health-care-eligibility-benefit-inquiry-and-response-005010-x279) | Identifies the licensed 270/271 X279 product and where to obtain it. |
| [X12-EXAMPLES-005010X279](https://x12.org/examples/005010x279) | Public 270/271 interchange, hierarchy, subscriber/dependent, and `AAA` examples. |
| [X12-RFI-1498](https://x12.org/resources/requests-for-interpretation/rfi-1498-trailing-delimiters-and-999) | Interpretation of trailing delimiters and named 999 errors for the case described. |
| [X12-RFI-1585](https://x12.org/resources/requests-for-interpretation/rfi-1585-reporting-multi-isas-999) | Supports multiple interchanges in one physical file and separate acknowledgment scope. |
| [X12-RFI-2821](https://x12.org/resources/requests-for-interpretation/rfi-2821-eb01-code-use-aaa-270271) | Explains `EB` and `AAA` use in the case described by the RFI. |
| [X12-RFI-2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271) | Explains `MSG` use in the case described by the RFI. |

## Segment and transaction cross-references

| Source | Use in this guide |
| --- | --- |
| [STEDI-271-GUIDE](https://www.stedi.com/edi/hipaa/transaction-set/271-B1) | Public cross-reference for 271 segments, elements, loops, and example shapes. |
| [STEDI-ISA](https://www.stedi.com/edi/x12-005010/segment/ISA) and [STEDI-IEA](https://www.stedi.com/edi/x12-005010/segment/IEA) | Public field references for the interchange header and trailer. |
| [STEDI-GS](https://www.stedi.com/edi/x12-005010/segment/GS) and [STEDI-GE](https://www.stedi.com/edi/x12-005010/segment/GE) | Public field references for functional-group headers, trailers, and counts. |
| [STEDI-ST](https://www.stedi.com/edi/x12-005010/segment/ST) and [STEDI-SE](https://www.stedi.com/edi/x12-005010/segment/SE) | Public field references for transaction-set headers, trailers, and counts. |
| [STEDI-BHT](https://www.stedi.com/edi/x12-005010/segment/BHT), [STEDI-HL](https://www.stedi.com/edi/x12-005010/segment/HL), and [STEDI-NM1](https://www.stedi.com/edi/x12-005010/segment/NM1) | Public cross-references for transaction context, hierarchy, and party names. |
| [STEDI-EB](https://www.stedi.com/edi/x12-005010/segment/EB) | Public field reference for qualified eligibility and benefit statements. |
| [STEDI-DTP](https://www.stedi.com/edi/x12-005010/segment/DTP) | Public field reference for date or date-period context. |
| [STEDI-MSG](https://www.stedi.com/edi/x12-005010/segment/MSG) | Public field reference for message text; X12 RFI 2628 addresses one specific use. |

## CMS program context

| Source | Use in this guide |
| --- | --- |
| [CMS-ELIGIBILITY](https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/transactions/health-plan-eligibility-benefit-inquiry-response) | Program-level description of the HIPAA 270/271 transaction. |
| [CMS-MSP](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer) | Program-level Medicare Secondary Payer and coordination concepts. |
| [CMS-MA](https://www.cms.gov/medicare/enrollment-renewal/health-plans) | Program-level Medicare Advantage context. |
| [CMS-HETS-GUIDE](https://www.cms.gov/files/document/current-hets-270/271-companion-guide.pdf) | CMS HETS-specific operational and trading-partner requirements. |
| [CMS-HETS-EXAMPLE](https://www.cms.gov/files/document/hets2024-4-271-response-example.pdf) | A CMS-authored illustrative HETS 271 response and its exercised segment families. |

## Route and profile documents

| Source | Use in this guide |
| --- | --- |
| [UHC-270271](https://www.uhcprovider.com/content/dam/provider/docs/public/resources/edi/EDI-270-271-Companion-Guide-005010X279A1.pdf) | UnitedHealthcare's instructions for the products and routes named in the guide. |
| [UHC-EDI](https://www.uhcprovider.com/en/resource-library/edi/edi-transactions) | UnitedHealthcare EDI entry point and connectivity methods. |
| [STEDI-SEND](https://www.stedi.com/docs/healthcare/send-eligibility-checks) | Stedi submission modes and test-data or enrollment warnings. |
| [STEDI-RAW](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility-raw-x12) | Stedi's contract for its raw-X12 endpoint. |

Route-owner material applies to its named route. None of these public pages
replaces the licensed TR3 or proves universal payer behavior.
