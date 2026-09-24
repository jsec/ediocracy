---
title: How eligibility responses fit the workflow
description: The request, routing, acknowledgment, and response stages around a 271.
---

An eligibility workflow moves a request from a submitter through a route to a
payer and returns either a 271 response or a separate processing outcome.
Transport status is not a benefit result.

## Request and route

The submitter sends a 270 health care eligibility benefit inquiry. The route
may include a clearinghouse, which can apply its own connectivity, validation,
or translation behavior. The payer receives the inquiry only after the route's
requirements are met. [CMS describes the HIPAA 270/271 transaction](https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/transactions/health-plan-eligibility-benefit-inquiry-response)
at the program level; a payer companion guide supplies local details.

## Acknowledgments and response

The route can produce outcomes at several layers:

- A transport or connectivity error means the payload did not complete the
  intended exchange.
- A TA1 reports an interchange-level acknowledgment.
- A 999 reports functional-group or transaction-set syntax and implementation
  errors. X12's [RFI 1498](https://x12.org/resources/requests-for-interpretation/rfi-1498-trailing-delimiters-and-999)
  discusses named 999 error codes.
- A 271 is the application response that can carry benefit information or a
  request-level `AAA` error.

Handle each outcome at its own layer. A 999 reports validation results. A 271
reports the eligibility response, including request-level `AAA` errors when
applicable.

### TA1 and 999 fixture excerpts

Parser fixture `GX12-018` contains a TA1 directly inside its interchange:

```text
TA1*000000018*260914*1200*A*000~
```

Parser fixture `GX12-019` contains a 999 transaction set:

```text
ST*999*0019~
AK1*HS*19~
AK9*A*1*1*1~
```

These fixtures show segment placement only. Neither is a 271 response or a
claim about a payer's behavior.

## Payer-specific behavior

Payers and intermediaries can require enrollment, specific identifiers, date
windows, or connectivity options. For example, the [CMS HETS companion guide](https://www.cms.gov/files/document/current-hets-270/271-companion-guide.pdf)
defines HETS-specific operational requirements. Those requirements apply to
HETS traffic only.
