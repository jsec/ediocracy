---
title: Reading 271 responses
---

A 271 transaction set is read into a `Response271`: the payers that
answered, the providers that asked, the subscribers with their dependents,
and the benefits reported for each person.

<<< @/parser/snippets/reading-271s.ts#example

## `read271` and `read271s`

- `read271(transaction)` reads one transaction set. It does not check that
  the transaction set is a 271, so use it when you have already picked the
  transaction set.
- `read271s(document)` reads every transaction set whose ST01 is `271`, in
  the order they appear. Each result includes the `interchange` and `group`
  it came from, so you can read the sender, receiver and control numbers from
  their header segments. It also adds an `unexpected-version` finding when
  GS08 is not `005010X279A1`.

## The response

[`Response271`](/parser/api/type-aliases/Response271) has these fields:

- `sources`: the payers that answered (loop 2100A).
- `receivers`: the providers that asked (loop 2100B).
- `subscribers`: the subscribers (loop 2000C). Each one lists its
  `dependents` (loop 2000D).
- `reference`: the reference identification from BHT03.
- `findings`: problems found while reading the response.

## Parties and people

A [`Party`](/parser/api/type-aliases/Party) has the `name` segment (NM1),
the `id` and `idQualifier` (NM109 and NM108), and any `errors` the payer
reported for it in AAA segments.

A [`Person`](/parser/api/type-aliases/Person) is a party with `benefits`,
`dependents` and `traces` (TRN segments).

## Benefits

Each [`Benefit`](/parser/api/type-aliases/Benefit) is one EB segment and the
segments that qualify it. Codes are returned as they appear, without
translation. For example, `status` is EB01 and `serviceTypes` is the list of
EB03 repetitions. The `eb` field holds the EB segment itself, for elements
the type does not name.
