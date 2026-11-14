---
title: Read HCSC responses
---

This page describes how to read a 271 eligibility response from a Health Care
Service Corporation (HCSC) Blue Cross and Blue Shield plan by using
`interpretRoute` with `hcscProfile`. The profile applies the 271 rules from the
HCSC 270/271 companion guides, version 1.1 (February 2026), for the following
plans:

- Blue Cross and Blue Shield of Texas
- Blue Cross and Blue Shield of Illinois
- Blue Cross and Blue Shield of Oklahoma
- Blue Cross and Blue Shield of Montana

Each plan publishes its own guide. The four guides have the same rules for 271
responses. They differ in their payer IDs and in their rules for 270 requests.

The profile does the following:

- Checks the payer in the response.
- Gives each error that the companion guides list its HCSC meaning, and
  reports any other error as a finding.
- Reads each member's group, related plans, and utilization management
  contacts.

::: warning
The profile doesn't cover Blue Cross and Blue Shield of New Mexico, the fifth
HCSC plan. The library has no New Mexico companion guide to follow.
:::

## Before you begin

Make sure that you have the following:

- A 271 response to a 270 request that you sent to one of the four plans,
  either directly or through a clearinghouse.
- The `@ediocracy/parser` package.

To have the library pick the profile from the `2100A` payer ID in the
response, use `interpretRoute(entry)` instead of passing `hcscProfile`.
For more information, see
[Apply the payer's rules](/parser/guides/reading-271s#apply-the-payers-rules).

## Read a response

The following example reads a file of 271 responses and prints the HCSC
results for each member:

<<< @/parser/snippets/reading-hcsc-responses.ts#example

For each item that `read271s` returns,
[`interpretRoute(entry, profile)`](/parser/api/271/routes/functions/interpretRoute)
returns a [`RouteEligibility`](/parser/api/271/routes/type-aliases/RouteEligibility)
object. The object has the following fields:

- `eligibility`: the unchanged result of `interpret271` for the response.
- `errors`: each error that the payer reported, in the same order as
  `eligibility.requestErrors`. When the companion guides list an error, its
  entry includes the HCSC `condition` and `description`.
- `findings`: the problems that the profile found in the response.
- `members`: one [`HcscView`](/parser/api/271/routes/type-aliases/HcscView)
  object for each member, in the same order as `eligibility.members`.

## Payer checks {#payer-checks}

Each companion guide gives the payer IDs that its plan sends. Responses from
the Stedi sandbox contain Stedi's payer ID for the plan instead.
`hcscProfile` accepts each of these IDs:

| Plan | `NM109` values |
| --- | --- |
| Texas | `84980`, `G84980` (Stedi), `HCSV2` (Texas Medicaid) |
| Illinois | `00621`, `G00621` (Stedi), `MCIL2` (Illinois Medicaid) |
| Oklahoma | `00840` |
| Montana | `00751` |
| Medicare Advantage, in all four plans | `HMAPD` |

The profile reports `unexpected-source` when the `2100A` `NM1` segment
doesn't meet all of the following conditions:

- `NM101` is `PR`.
- `NM108` is `PI`.
- `NM109` is one of the values in the table.

The profile doesn't check the following:

- `NM103`. The guides give a short plan name, such as `BCBSTX`, but the Stedi
  sandbox sends the plan's full name.
- The separators and the `ISA` and `GS` sender IDs. A clearinghouse that
  delivers the response replaces them with its own.
- The `2100B` loop and placeholder member IDs. The guides give no rules for
  them.

## Errors

The companion guides list every `AAA03` code that the plans send and the loop
that each code appears in. The profile gives each code the following
`condition`:

| Level | `AAA03` | `condition` | Meaning |
| --- | --- | --- | --- |
| `source` | `42` | `payer-unavailable` | The plan couldn't respond. Send the request again later. |
| `receiver` | `50` | `provider-not-eligible` | The provider can't check eligibility with the plan. |
| `receiver` | `51` | `provider-not-on-file` | The plan has no record of the provider. |
| `subscriber` | `58` | `birth-date-missing` | The date of birth is missing or not valid. |
| `subscriber` | `62` | `date-outside-window` | The date of service is outside the period the plan answers for. |
| `subscriber` | `71` | `birth-date-not-matched` | The date of birth doesn't match the plan's record for the member. |
| `subscriber` | `72` | `member-id-missing` | The member ID is missing or not valid. |
| `subscriber` | `73` | `name-missing` | The member's name is missing or not valid. |
| `subscriber` | `75` | `member-not-found` | No member matches the request. |
| `subscriber` | `76` | `duplicate-member-id` | More than one member has the member ID. |
| `dependent` | `62` | `date-outside-window` | The date of service is outside the period the plan answers for. |
| `dependent` | `64` | `member-id-missing` | The member ID is missing or not valid. |
| `dependent` | `65` | `name-missing` | The member's name is missing or not valid. |
| `benefit` | `62` | `date-outside-window` | The date of service is outside the period the plan answers for. |

The plans return eligibility for dates of service from 12 months before the
current date through the last day of the current month. For a date outside that
period, the plan sends `AAA03` `62`.

Because the guides list every code that the plans send, the profile reports
any other error as an `unlisted-error` finding and sets its `condition` and
`description` to `undefined`. This includes `58` and `71` at the dependent
level, because the guides list these codes only for subscribers.

## HCSC view

Each `HcscView` object contains the fields in the following table. Each list
keeps its rows in the order that they appear in the response.

::: warning
The companion guides don't describe these fields. The profile reads them as
they appear in one Stedi sandbox response for Blue Cross and Blue Shield of
Texas. Other responses might send them differently.
:::

| Field | Contents |
| --- | --- |
| `group` | The member's first `REF` segment with `REF01` set to `6P`. `number` is `REF02`, and `name` is `REF03`. `undefined` when there's no such segment. |
| `relatedPlans` | The `NM1` segments with `NM101` set to `VER` in the `2120` loops of the member's plan coverage rows (`EB03` set to `30`). `name` is `NM103`, and `payerId` is `NM109`. In the sandbox response, these name the Texas and Illinois plans. |
| `utilizationManagement` | Rows with `EB01` set to `U`. `name`, `phone`, and `website` come from the row's first `2120` loop: the name in its `NM1` segment, and the first telephone number and web address in its `PER` segments. `serviceTypes` is `EB03`. |

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/271/routes/type-aliases/RouteFindingCode).
The profile reports the following codes:

- `unexpected-source`: the `2100A` `NM1` segment doesn't meet the conditions
  in [Payer checks](#payer-checks).
- `unlisted-error`: an error whose level and `AAA03` aren't in the table in
  [Errors](#errors).

## Limitations

The profile has the following limitations:

- It doesn't cover Blue Cross and Blue Shield of New Mexico.
- It accepts only two Stedi payer IDs, `G84980` and `G00621`. For a response
  that contains another clearinghouse ID for one of the plans,
  `interpretRoute(entry)` returns `route` set to `undefined`.
- It doesn't apply the companion guides' rules for 270 requests, such as
  member ID prefixes and supported service types.
