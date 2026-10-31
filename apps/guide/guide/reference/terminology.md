---
title: X12 and eligibility terminology
description: Definitions for the domain and X12 terms that this guide uses.
---

Use this page as a glossary while you read the structure and complete-example
pages. For the documents that apply to implementation work, see
[Sources](/guide/reference/sources).

## Terms

| Term | Definition |
| --- | --- |
| `270` | The X12 health care eligibility benefit inquiry that is sent before a response. |
| `271` | The X12 health care eligibility benefit response that this guide explains. |
| `AAA` | A response-level request-validation or rejection segment. `AAA` outcomes are distinct from transport, `TA1`, and `999` outcomes. |
| `API` | Application programming interface. An API contract can add requirements beyond the X12 transaction. |
| Benefit | Eligibility, coverage, or service information that a response context returns. |
| `BHT` | The Beginning of Hierarchical Transaction segment. It supplies transaction context after the transaction-set header. |
| Clearinghouse | An intermediary that can transport, validate, translate, or route a transaction. |
| Companion guide | Route-owner documentation that adds local trading-partner instructions to the implementation standard. |
| Component separator | The character, set in `ISA`, that separates components within a composite element. |
| Control number | An interchange, group, or transaction identifier that an opening segment and its closing segment both include. |
| `DTP` | A date or date-period segment. Interpret it with the hierarchy and benefit context around it. |
| `EB` | The Eligibility or Benefit Information segment. Read it as a qualified statement with its surrounding context. |
| Element | A positional data value after a segment identifier and element separator. |
| Envelope | A common name for the X12 header-and-trailer pairs around an interchange, functional group, or transaction set. |
| Functional group | The `GS` through `GE` container in an interchange. |
| `GE` | The Functional Group Trailer segment. It closes a `GS` group and declares its transaction count and control number. |
| `GS` | The Functional Group Header segment. It opens a functional group in an interchange. |
| `HL` | The Hierarchical Level segment. It identifies a level and an optional parent. |
| `HSD` | The Health Care Services Delivery segment. It contains service-delivery quantities or measures when the applicable profile uses it. For its fields, see [`HSD` fields](/guide/reference/segments#hsd). |
| Implementation guide / TR3 | The licensed normative document, also called a Technical Report Type 3 (TR3), that defines the complete transaction grammar and situational rules. |
| Interchange | The outermost X12 container, from `ISA` through `IEA`. Multiple interchanges can appear next to one another in a file. |
| Intermediary | A clearinghouse or other route participant between a submitter and payer. |
| `IEA` | The Interchange Control Trailer segment. It closes an `ISA` interchange and declares the group count and interchange control number. |
| `ISA` | The Interchange Control Header segment. It opens the outermost interchange and establishes fixed-position control and delimiter values. |
| `JSON` | JavaScript Object Notation. An API can map X12 data into JSON response fields. |
| `LE` | The Loop Trailer segment. It closes the `2120` benefit-related entity loop that a matching `LS` opens. |
| `LS` | The Loop Header segment. It starts the `2120C` or `2120D` benefit-related entity loop that `LE` closes. |
| `MSG` | The Message Text segment. It contains explanatory text in a profile-scoped context. |
| `NM1` | The Individual or Organizational Name segment. It identifies a party. |
| Payer | The organization that administers or pays for coverage. |
| Repetition separator | The character, set in `ISA`, that separates repeated values where the transaction permits them. |
| `RFI` | Request for Interpretation. An RFI is an X12 interpretation of a specific published question, and its scope is limited to that question. For published RFIs, see the [X12 RFI catalog](https://x12.org/resources/requests-for-interpretation). |
| Route | The operational path, connectivity method, intermediary, and payer endpoint for a transaction. |
| Segment | A record that begins with an identifier such as `ST`, `HL`, or `EB` and ends at the segment terminator. |
| `SE` | The Transaction Set Trailer segment. It closes an `ST` transaction and declares its segment count and control number. |
| `ST` | The Transaction Set Header segment. It opens one transaction set and identifies its type and control number. |
| Submitter | The organization or system that sends an eligibility inquiry or response through a route. |
| `TA1` | An interchange-level acknowledgment outcome, separate from a 271 application response. |
| `TRN` | The Trace segment. In a 271 subscriber or dependent loop, it returns the trace numbers sent in the 270 so that you can match a response to its request. |
| Transaction set | The `ST` through `SE` container for one business transaction. |
| `999` | A functional acknowledgment that reports named structural or implementation errors. A `999` is separate from a 271. |
| `2120` | The benefit-related entity loop in a `2110C` or `2110D` benefit loop. It names a party, such as another payer, for the preceding `EB`. |
| X279 / X279A1 | The X12 implementation convention for the 270/271 health care eligibility transaction pair that the public examples use. |

## Program terms

**Medicare Secondary Payer (MSP)** describes a Medicare coordination concept.
The [CMS-MSP source](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer)
explains the program. X279A1 and route-specific guides supply the message rules.

**Medicare Advantage (MA)** describes a Medicare health-plan program context.
The [CMS-MA source](https://www.cms.gov/medicare/enrollment-renewal/health-plans)
explains the program. Each plan and route can use different payer identifiers
and benefit codes.
