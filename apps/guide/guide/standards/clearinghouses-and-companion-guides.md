---
title: Clearinghouses and companion guides
description: Learn how intermediaries and payer instructions change a 271, and how to tell standard behavior from local behavior.
---

A 271 often passes through a clearinghouse, and each payer can publish a
companion guide with its own instructions. Both can change what you receive
without changing the X12 standard.

## What a clearinghouse can do to a 271

A clearinghouse is an intermediary between the submitter and the payer.
Depending on the connection, it can:

- Pass the payer's X12 through unchanged.
- Replace the `ISA` and `GS` sender and receiver IDs and
  assign its own control numbers. The transaction set itself can stay the same.
- Translate the 271 into another format, such as JSON, and return the X12 only
  on request.
- Reject the request before it reaches the payer. That outcome can arrive as a
  999, an `AAA` segment, or an error in the clearinghouse's own format.

When you compare a 271 with a payer's examples, check whether the `ISA` and
`GS` values came from the payer or from the clearinghouse.

## What a companion guide adds

A companion guide adds a payer's instructions to the base transaction. It
typically covers:

- Connectivity, authentication, and batch or real-time submission.
- Which service types the payer answers, and which it ignores.
- Which situational segments the payer sends, such as `HSD`, `REF`, or the
  `2120` related-entity loop.
- The free text the payer puts in `MSG`.

A companion guide cannot change the X279A1 syntax. It chooses among the
options that X279A1 allows.

## Standard or local behavior

Treat a pattern as standard when X279A1 defines or allows it. Treat it as local
when it comes only from one payer or one connection: a specific `MSG` wording,
a service type that a payer always returns, or a sender ID in `ISA`.
Code that relies only on standard patterns works across payers. Handle local
patterns separately for each route.
