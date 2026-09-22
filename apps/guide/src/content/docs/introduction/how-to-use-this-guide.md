---
title: How to use this guide
description: Reading paths and source types for this X12 271 guide.
---

This guide explains a 271 through concepts, short excerpts, and complete
example files. Each page links to the public material behind its claims. The
licensed implementation guide supplies the complete standard.

## A first reading

Read the introduction pages in order. Then read syntax and message containers before
transaction context, party hierarchy, and eligibility benefits. This sequence
keeps the container and relationship terms in place before the guide discusses
an `EB` statement.

## A targeted reading

When investigating a response, identify the outer interchange first. Follow
the `GS`/`GE` functional group and `ST`/`SE` transaction set, then locate the
relevant `HL` hierarchy and `NM1` party. Read each `EB` with its surrounding
context.

The [single-benefit example](/examples/single-eb.edi) uses invented values.
The [X12 public examples](https://x12.org/examples/005010x279) and [Stedi 271
cross-reference](https://www.stedi.com/edi/hipaa/transaction-set/271-B1) provide
public orientation. Use the licensed X279A1 implementation guide when you need
the full transaction rules.

## Source types

The guide keeps four evidence types separate:

- Public X12 material supports named examples and published interpretations.
- Stedi pages provide public segment and element cross-references.
- CMS material describes Medicare HETS or program-level context.
- Payer and clearinghouse documents describe their own route requirements.

Use X279A1 for the standard rules, then use the companion guide for the payer
and route in use.
