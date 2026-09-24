---
title: X12 and eligibility terminology
description: Definitions for the domain and X12 terms used throughout this guide.
---

Use this page as a glossary while reading the structure and complete-example
pages. The [sources page](/reference/sources) explains which documents apply
to implementation work.

## Terms

| Term | Definition |
| --- | --- |
| `270` | The X12 health care eligibility benefit inquiry sent before a response. |
| `271` | The X12 health care eligibility benefit response discussed in this guide. |
| `AAA` | A response-level request-validation or rejection segment; it is distinct from transport, TA1, and 999 outcomes. |
| `API` | Application programming interface. An API contract can add requirements beyond the X12 transaction. |
| Benefit | Eligibility, coverage, or service information returned in a response context. |
| `BHT` | Beginning of Hierarchical Transaction segment; it supplies transaction context after the transaction-set header. |
| Clearinghouse | An intermediary that can transport, validate, translate, or route a transaction. |
| Companion guide | Route-owner documentation that adds local trading-partner instructions to the implementation standard. |
| Component separator | The ISA-established character that separates components within a composite element. |
| Control number | An interchange, group, or transaction identifier paired between an opening segment and its closing segment. |
| `DTP` | A date or date-period segment interpreted with the hierarchy and benefit context around it. |
| `EB` | The Eligibility or Benefit Information segment. Read it as a qualified statement with its surrounding context. |
| Element | A positional data value after a segment identifier and element separator. |
| Envelope | A common name for the X12 header-and-trailer pairs around an interchange, functional group, or transaction set. |
| Functional group | The `GS` through `GE` container inside an interchange. |
| `GE` | Functional Group Trailer; it closes a `GS` group and declares its transaction count and control number. |
| `GS` | Functional Group Header; it opens a functional group inside an interchange. |
| `HL` | The Hierarchical Level segment that identifies a level and optional parent. |
| `HSD` | Health Care Services Delivery segment; it conveys service-delivery quantities or measures when the applicable profile uses it. See the [public HSD reference](https://www.stedi.com/edi/x12-005010/segment/HSD). |
| Implementation guide / TR3 | The licensed normative document that defines the complete transaction grammar and situational rules. |
| Interchange | The outermost X12 container, from `ISA` through `IEA`. Multiple interchanges can appear next to one another in a file. |
| Intermediary | A clearinghouse or other route participant between a submitter and payer. |
| `IEA` | Interchange Control Trailer; it closes an `ISA` interchange and declares the group count and interchange control number. |
| `ISA` | Interchange Control Header; it opens an outer interchange and establishes fixed-position control and delimiter values. |
| `JSON` | JavaScript Object Notation; an API can map X12 data into JSON response fields. |
| `LE` | Loop Trailer; it closes the additional-information loop opened by a matching `LS`. |
| `LS` | Loop Header; it starts an additional-information loop that `LE` closes. |
| `MSG` | A Message Text segment used for explanatory text in a profile-scoped context. |
| `NM1` | The Individual or Organizational Name segment that identifies a party. |
| Payer | The organization that administers or pays for coverage. |
| Repetition separator | The ISA-established character used to separate repeated values where the transaction permits them. |
| Route | The operational path, connectivity method, intermediary, and payer endpoint used for a transaction. |
| Segment | A record beginning with an identifier such as `ST`, `HL`, or `EB` and ending at the segment terminator. |
| `SE` | Transaction Set Trailer; it closes an `ST` transaction and declares its segment count and control number. |
| `SOAP` | Simple Object Access Protocol, which can carry an X12 message for routes that use it. |
| `ST` | Transaction Set Header; it opens one transaction set and identifies its type and control number. |
| Submitter | The organization or system sending an eligibility inquiry or response through a route. |
| `TA1` | An interchange-level acknowledgment outcome, separate from a 271 application response. |
| Transaction set | The `ST` through `SE` container carrying one business transaction. |
| `999` | A functional acknowledgment that reports named structural or implementation errors; it is separate from a 271. |
| `2120` | The entity-information loop context associated with the current hierarchy; its exact use remains profile-scoped. |
| `RFI` | Request for Interpretation; an X12 interpretation of a specifically published question, with scope limited to that question. See the [X12 RFI catalog](https://x12.org/resources/requests-for-interpretation). |
| X279 / X279A1 | The X12 implementation convention for the 270/271 health care eligibility transaction pair used in the public examples. |

## Program terms

**Medicare Secondary Payer (MSP)** describes a Medicare coordination concept.
The [CMS-MSP source](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer)
explains the program. X279A1 and route-specific guides supply the message rules.

**Medicare Advantage** describes a Medicare health-plan program context. The
[CMS-MA source](https://www.cms.gov/medicare/enrollment-renewal/health-plans)
explains the program. Each plan and route can use different payer identifiers
and benefit codes.
