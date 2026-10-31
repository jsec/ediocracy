---
title: Read 271 responses
---

The parser reads a 271 transaction set into a `Response271` object. The
object contains the payers that answered, the providers that asked, the
subscribers with their dependents, and the benefits reported for each person.

<<< @/parser/snippets/reading-271s.ts#example

## `read271` and `read271s`

The parser has two functions that read 271 transaction sets:

- `read271(transaction)` reads one transaction set. It doesn't check that
  the transaction set is a 271. Use it when you have already picked the
  transaction set.
- `read271s(document)` reads every transaction set whose ST01 is `271`, in
  the order that they appear. Each result includes the `interchange` and
  `group` that contain the transaction set, so you can read the sender,
  receiver, and control numbers from their header segments. It also adds an
  `unexpected-version` finding when GS08 isn't `005010X279A1`.

## The response

[`Response271`](/parser/api/type-aliases/Response271) has the following
fields:

- `sources`: the payers that answered (loop 2100A).
- `receivers`: the providers that asked (loop 2100B).
- `subscribers`: the subscribers (loop 2000C). Each subscriber has a
  `dependents` field (loop 2000D).
- `reference`: the reference identification from BHT03.
- `findings`: problems that the parser found while it read the response.

## Parties and people

A [`Party`](/parser/api/type-aliases/Party) has a `name` field that contains
the NM1 segment, the `id` and `idQualifier` fields (NM109 and NM108), and an
`errors` field that contains any errors that the payer reported for the party
in AAA segments.

A [`Person`](/parser/api/type-aliases/Person) is a party with `benefits`,
`dependents`, and `traces` (TRN segments).

## Benefits

Each [`Benefit`](/parser/api/type-aliases/Benefit) is one EB segment and the
segments that qualify it. The parser returns codes as they appear, without
translation. For example, `status` is EB01 and `serviceTypes` is the list of
EB03 repetitions. The `eb` field contains the EB segment itself, so you can
read elements that the type doesn't name.
