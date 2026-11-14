---
title: Read 271 responses
---

The parser reads a 271 transaction set into a `Response271` object. The
object contains the payers that answered, the providers that asked, the
subscribers and their dependents, and the benefits for each person.

The following example reads the first transaction set in a file and prints
its payers, providers, and benefits:

<<< @/parser/snippets/reading-271s.ts#example

## Read functions

The parser has two functions that read 271 transaction sets:

- `read271(transaction)` reads one transaction set. It doesn't check that
  the transaction set is a 271. Use it when you have already picked the
  transaction set.
- `read271s(document)` reads every transaction set whose `ST01` is `271`, in
  the order that they appear. Each result includes the `interchange` and
  `group` that contain the transaction set, so you can read the sender,
  receiver, and control numbers from their header segments. It also adds an
  `unexpected-version` finding when `GS08` isn't `005010X279A1`.

## Response fields

[`Response271`](/parser/api/271/type-aliases/Response271) has the following
fields:

- `sources`: the payers that answered (the `2100A` loop).
- `receivers`: the providers that asked (the `2100B` loop).
- `subscribers`: the subscribers (the `2000C` loop). Each subscriber has a
  `dependents` field (the `2000D` loop).
- `reference`: the reference identification from `BHT03`.
- `findings`: the problems that the parser found while it read the response.

## Parties and people

A [`Party`](/parser/api/271/type-aliases/Party) has the following fields:

- `name`: the `NM1` segment.
- `id` and `idQualifier`: `NM109` and `NM108`.
- `errors`: the errors that the payer reported for the party in `AAA`
  segments.

A [`Person`](/parser/api/271/type-aliases/Person) is a party that also has
`benefits`, `dependents`, and `traces` (`TRN` segments).

## Benefits

Each [`Benefit`](/parser/api/271/type-aliases/Benefit) is one `EB` segment and
the segments that qualify it. The parser returns codes as they appear in the
response, without translation. For example, `status` is `EB01`, and
`serviceTypes` is the list of `EB03` repetitions. The `eb` field contains the
`EB` segment itself, so you can read elements that the type doesn't name.

## Apply the payer's rules {#apply-the-payers-rules}

Some payers publish companion guides with rules for their 271 responses. The
library has route profiles for five of these payers: CMS HETS,
UnitedHealthcare, Humana, Cigna, and Health Care Service Corporation (HCSC).

To apply the right profile, call
[`interpretRoute(entry)`](/parser/api/271/routes/functions/interpretRoute)
with an item that `read271s` returns. The function reads `NM109` of the first
`2100A` loop that has an `NM1` segment, and then applies the profile that
lists that payer ID. The following table shows the payer IDs for each route:

| `route` | Profile | Payer IDs (`NM109`) |
| --- | --- | --- |
| `hets` | [`hetsProfile`](/parser/guides/reading-hets-responses) | `CMS` |
| `uhc` | [`uhcProfile`](/parser/guides/reading-uhc-responses) | `87726`, `52133`, `00773`, `94265` |
| `humana` | [`humanaProfile`](/parser/guides/reading-humana-responses) | `61101`, `61115`, `65065`, `CX021` |
| `cigna` | [`cignaProfile`](/parser/guides/reading-cigna-responses) | 13 IDs. For the list, see [Payer checks](/parser/guides/reading-cigna-responses#payer-checks). |
| `hcsc` | [`hcscProfile`](/parser/guides/reading-hcsc-responses) | Nine IDs. For the list, see [Payer checks](/parser/guides/reading-hcsc-responses#payer-checks). |

The function returns a
[`DetectedRoute`](/parser/api/271/routes/type-aliases/DetectedRoute) object:

- When a profile lists the payer ID, `route` names the route, and `result`
  contains the profile's result.
- When no profile lists the payer ID, `route` is `undefined`, and
  `eligibility` contains the result of `interpret271`.

UnitedHealthcare responses with other payer IDs also return `route` set to
`undefined`, because the UnitedHealthcare companion guide applies only to the
four payer IDs in the table.

The following example prints a different field for each route:

<<< @/parser/snippets/applying-payer-rules.ts#example
