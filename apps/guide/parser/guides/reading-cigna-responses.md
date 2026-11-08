---
title: Read Cigna responses
---

This page describes how to read a 271 eligibility response from Cigna
Healthcare by using `interpretRoute` with `cignaProfile`. The profile applies
the 271 rules from the Cigna Healthcare 270/271 Companion Guide, version 3.0
(August 2026). The companion guide states that it applies to all Cigna
Healthcare customers. The profile does the following:

- Checks the payer in the response.
- Gives each error that the companion guide lists its Cigna meaning.
- Reads each member's plan network, provider participation, care management
  level, attribution, HRA balances, and partner arrangements.

## Before you begin

Make sure that you have the following:

- A 271 response to a 270 request that you sent to Cigna, either directly or
  through a clearinghouse.
- The `@ediocracy/parser` package.

To have the library pick the profile from the `2100A` payer ID in the
response, use `interpretRoute(entry)` instead of passing `cignaProfile`.
For more information, see
[Apply the payer's rules](/parser/guides/reading-271s#apply-the-payers-rules).

## Read a response

The following example reads a file of 271 responses and prints the Cigna
results for each member:

<<< @/parser/snippets/reading-cigna-responses.ts#example

For each item that `read271s` returns,
[`interpretRoute(entry, profile)`](/parser/api/271/routes/functions/interpretRoute)
returns a [`RouteEligibility`](/parser/api/271/routes/type-aliases/RouteEligibility)
object. The object has the following fields:

- `eligibility`: the unchanged result of `interpret271` for the response.
- `errors`: each error that the payer reported, in the same order as
  `eligibility.requestErrors`. When the companion guide lists an error, its
  entry includes the Cigna `condition` and `description`.
- `findings`: the problems that the profile found in the response.
- `members`: one [`CignaView`](/parser/api/271/routes/type-aliases/CignaView)
  object for each member, in the same order as `eligibility.members`.

## Payer checks {#payer-checks}

The companion guide gives a Cigna tax ID for each Cigna company that sends
responses. The guide's examples use two other tax IDs, and responses from the
Stedi sandbox can contain Cigna's clearinghouse payer ID instead.
`cignaProfile` accepts each of these IDs. It accepts each tax ID with or
without the hyphen:

| Company | `NM109` values |
| --- | --- |
| CGLIC | `06-1059331`, `061059331`, `06-0303370`, `060303370` |
| CHLIC | `59-1031071`, `591031071`, `59-1056496`, `591056496` |
| Cigna Behavioral Health | `41-1648670`, `411648670` |
| Cigna Dental Health | `59-2308055`, `592308055` |
| Clearinghouse payer ID | `62308` |

The profile reports `unexpected-source` when the `2100A` `NM1` segment
doesn't meet all of the following conditions:

- `NM101` is `PR`.
- `NM108` is `FI` or `PI`.
- `NM109` is one of the values in the table.

The companion guide says that the response uses the separators that the
request used, it gives no rules for the `2100B` loop, and it names no
placeholder member IDs. For these reasons,
the profile never reports `unexpected-delimiters`, `unexpected-receiver`, or
`member-id-placeholder`.

## Errors

The companion guide lists the `AAA03` codes that Cigna sends when it can't
identify the member. Each condition has one code for a subscriber and one for
a dependent:

| Subscriber `AAA03` | Dependent `AAA03` | `condition` | Meaning |
| --- | --- | --- | --- |
| `75` | `67` | `member-not-found` | No member matches the request. |
| `76` | `68` | `multiple-members-found` | More than one member matches the request, and Cigna can't choose one. |
| `72` | `64` | `member-id-not-matched` | The member ID is missing or doesn't match. |
| `73` | `65` | `name-not-matched` | The member's name is missing or doesn't match. |
| `58` | `58` | `birth-date-not-matched` | The date of birth is missing or doesn't match. |

The companion guide doesn't list every error that Cigna sends, so the profile
doesn't report an unlisted error as a finding. In `errors`, the entry for an
unlisted error has `condition` and `description` set to `undefined`.

## Cigna view

Each `CignaView` object contains the fields in the following table. Each list
keeps its rows in the order that they appear in the response.

| Field | Contents |
| --- | --- |
| `network` | The member's `REF` segment with `REF01` set to `N6`. `name` is `REF02`, and `description` is `REF03`. `undefined` when there's no such segment. |
| `participation` | `in-network` or `out-of-network` when a message on a row with `EB01` set to `1` and `EB03` set to `30` says that the provider is in or out of network. Otherwise, `undefined`. |
| `careManagement` | The first message on a row with `EB01` set to `1` that is `PHS` or `PHS+`, or that ends in `Care Management`, exactly as Cigna sent it. Otherwise, `undefined`. |
| `isCareLink` | `true` when a row with `EB01` set to `1` and `EB03` set to `30` has `CareLink` in `EB05`. |
| `sharedRiskNetworks` | Rows with `EB01` set to `N`. `manager` is the name of the organization in the row's `2120` loop. |
| `attribution` | Patient attribution rows. For more information, see [Attribution](#attribution). |
| `hraBalances` | Health reimbursement arrangement (HRA) balances. For more information, see [HRA balances](#hra-balances). |
| `partners` | Partner arrangement rows. For more information, see [Partners](#partners). |

### Attribution

An attribution row says whether Cigna assigns the member to the provider who
sent the request. A row is an attribution row when it meets all of the
following conditions:

- `EB01` is `CB`, `D`, or `E`.
- `EB06` is `25`.
- One of its messages starts with `Attribution Status`.

The `status` field comes from `EB01`: `CB` is `yes`, `D` is `no`, and `E` is
`not-applicable`. The `start` and `end` fields are the dates in the `DTP`
segments with `DTP01` set to `356` and `357`.

### HRA balances

An HRA balance is a row with `EB01` set to `F` and the message
`HRA Balance` (`kind` is `starting`) or `HRA remaining Balance` (`kind` is
`remaining`). The `amount` field is `EB07`.

### Partners

When another organization shares the administration of the member's plan,
Cigna sends a row with `EB01` set to `U`. Each partner entry has the
following fields:

- `name`: the name in the row's `2120` loop. When the row has no `2120` loop,
  `name` is `EB05`.
- `phone`: the first telephone number in the `PER` segments of the `2120` loop.
- `messages`: the row's messages, exactly as Cigna sent them.

The profile doesn't read rows with `EB01` set to `I` as partners, because
Cigna also uses `I` for benefits that aren't covered.

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/271/routes/type-aliases/RouteFindingCode) and
[`CignaFindingCode`](/parser/api/271/routes/type-aliases/CignaFindingCode).
The profile reports the following codes:

- `unexpected-source`: the `2100A` `NM1` segment doesn't meet the conditions
  in [Payer checks](#payer-checks).
- `attribution-status-mismatch`: an attribution message says `Yes`, `No`, or
  `Not applicable`, but `EB01` isn't the matching code: `CB` for `Yes`, `D` for
  `No`, or `E` for `Not applicable`. The row stays in `attribution`, and its
  `status` comes from `EB01`.

## Limitations

The `CignaView` object doesn't include the following information. To get it,
read `eligibility`.

- Messages about the Client Specific Network on cost share rows
- Place of service (`III`) rows
- Which of a member's plans (medical, dental, or behavioral) a row belongs to
