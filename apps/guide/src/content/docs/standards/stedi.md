---
title: Stedi as a clearinghouse example
description: What Stedi's published APIs show about translation, validation, and routing.
---

Stedi's [Raw X12 endpoint](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility-raw-x12)
is one example of a clearinghouse X12 contract. Its behavior applies to Stedi
routes, not to every 271 route.

## Raw X12 transaction

Consult the raw transaction when segment placement matters. Use the licensed
X279A1 guide for transaction rules.

Stedi's public [271 transaction cross-reference](https://www.stedi.com/edi/hipaa/transaction-set/271-B1)
and [EB segment reference](https://www.stedi.com/edi/x12-005010/segment/EB)
help map published field names to segment context. Those pages are public
cross-references. They do not list every X279A1 rule.

## Interchange and validation behavior

Stedi documents submission modes and repair behavior in [Send eligibility checks](https://www.stedi.com/docs/healthcare/send-eligibility-checks).
Other clearinghouses can handle validation, repair, and route errors
differently.

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
