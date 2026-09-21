---
title: What a 271 response is
description: The role of an X12 271 health care eligibility benefit response.
---

An X12 271 is a response transaction that reports the result of a health care
eligibility and benefit inquiry. It answers a preceding 270 request defined by
the [005010 X279 product](https://ecommerce.x12.org/products/health-care-eligibility-benefit-inquiry-and-response-005010-x279).

## The terms in the name

X12 is the standards organization and data format family used for structured
business transactions. A transaction is a message with a defined
purpose. In this guide, a response is the message returned after a sender's
inquiry reaches the responding organization.

A payer is the organization that administers or pays for coverage. A
clearinghouse is an intermediary that can transport, validate, translate, or
route transactions between a sender and a payer. A payer's companion guide is
its local trading-partner documentation. An implementation guide is the
licensed standard that defines the transaction's full requirements. A public
example or cross-reference, such as [X12's 005010 X279 examples](https://x12.org/examples/005010x279), helps explain the format. The implementation guide contains the complete requirements.

## What a 271 can communicate

A 271 can contain eligibility and benefit information, such as an active
coverage statement, a service type, or a qualified amount. It can also contain
request-level error information. X12's [RFI 2821 interpretation](https://x12.org/resources/requests-for-interpretation/rfi-2821-eb01-code-use-aaa-270271)
explains when a response reports benefit information and when it reports a
validation problem with `AAA`.

An `EB` segment reports a qualified statement. Its meaning depends on the
person, service, coverage, and time information around it, so read it with the
surrounding hierarchy and related segments.

## Outcomes outside the 271

Transport failures, a TA1 interchange acknowledgment, and a 999 functional
acknowledgment are separate outcomes. They describe delivery or structural
processing. A 271 carries the eligibility and benefit response. A payer or
clearinghouse can also apply route-specific rules documented in its companion
guide.

X279A1 defines the complete transaction. Payer and clearinghouse documents add
instructions for a named connection.
