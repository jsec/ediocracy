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
The [X12 public examples](https://x12.org/examples/005010x279) provide public
orientation, and the [segment reference](/guide/reference/segments) lists the
fields used in this guide. Use the licensed X279A1 implementation guide when you need
the full transaction rules.

## Source types

The guide keeps three evidence types separate:

- Public X12 material supports named examples and published interpretations.
- CMS material describes Medicare program-level context.
- The licensed X279A1 implementation guide defines the standard rules.

Payers and clearinghouses add their own rules for each connection. See
[Clearinghouses and companion guides](/guide/standards/clearinghouses-and-companion-guides).
