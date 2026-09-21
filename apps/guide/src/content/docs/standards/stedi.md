---
title: Stedi as a clearinghouse example
description: What Stedi's published APIs show about translation, validation, and routing.
---

Stedi publishes two useful views of eligibility data: a raw X12 API and a JSON
API. Each has its own contract. Their behavior describes Stedi's service and
should be applied only when you use that service. The [Raw X12 endpoint](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility-raw-x12)
and [JSON eligibility endpoint](https://www.stedi.com/docs/healthcare/api-reference/post-eligibility-check)
show two different product contracts.

## Raw X12 and JSON projection

The Raw X12 product exposes an X12-oriented payload contract. The JSON product
projects eligibility data into Stedi's API response shape. A projection can
rename, combine, omit, or add fields for the API consumer. Consult the raw
transaction when field placement matters, and use the licensed X279A1 guide
for the transaction rules.

Stedi's public [271 transaction cross-reference](https://www.stedi.com/edi/hipaa/transaction-set/271-B1)
and [EB segment reference](https://www.stedi.com/edi/x12-005010/segment/EB)
help map published field names to segment context. Those pages are public
cross-references. They do not list every X279A1 rule.

## Interchange and validation behavior

An API can generate or manage the `ISA` through `IEA` interchange, validate fields,
repair input, and return a route-specific error. Stedi documents submission
modes and documented repair behavior in [Send eligibility checks](https://www.stedi.com/docs/healthcare/send-eligibility-checks).
Those actions are part of Stedi's product contract. Other clearinghouses can
handle validation and repair differently.

An intermediary response can differ by layer: a 999 can report a functional
validation outcome, while a 271 can carry eligibility information or `AAA`
request-level error context. The [Stedi SOAP documentation](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility-soap)
describes its wrapper and response branching. Interpret each outcome with its
applicable X12 standard or implementation guide and the route owner's
instructions.

## Routing and enrollment

Stedi documents enrollment, test-data, authentication, batch submission, and
polling as product workflow concerns. Its [batch API](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-batch-eligibility)
and [payer API](https://www.stedi.com/docs/healthcare/api-reference/get-payer)
describe route metadata and operational choices. Check the receiving payer's
companion guide as well as Stedi's route instructions before implementation.
