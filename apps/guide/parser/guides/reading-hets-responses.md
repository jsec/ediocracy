---
title: Read CMS HETS responses
---

This page explains how to read a 271 eligibility response from CMS HETS with
`interpretRoute` and `hetsProfile`. HETS is the system that answers Medicare
eligibility requests. The profile applies the 271 rules from the CMS HETS
270/271 Companion Guide, version 15-1 (May 2026). It checks the response
against those rules, gives each listed error its HETS meaning, and sorts each
member's benefit rows into Medicare lists.

## Before you begin

You need the following:

- A 271 response to a 270 request that you sent to HETS.
- The `@ediocracy/parser` package.

The library doesn't check which system sent a response. Use `hetsProfile`
only for responses to requests that you sent to HETS.

## Read a response

The following example reads a file of 271 responses and prints the Medicare
results for each member:

<<< @/parser/snippets/reading-hets-responses.ts#example

For each item that `read271s` returns,
[`interpretRoute(entry, profile)`](/parser/api/functions/interpretRoute)
returns a [`RouteEligibility`](/parser/api/type-aliases/RouteEligibility)
object with the following fields:

- `eligibility`: the result of `interpret271` for the response, unchanged.
- `errors`: each error that the payer reported, in the same order as
  `eligibility.requestErrors`, with the HETS `condition` and `description`
  when the guide lists the error.
- `findings`: the problems that the profile found in the response.
- `members`: one [`MedicareView`](/parser/api/type-aliases/MedicareView)
  object for each member, in the same order as `eligibility.members`.

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/type-aliases/RouteFindingCode) and
[`HetsFindingCode`](/parser/api/type-aliases/HetsFindingCode). The profile
reports the following codes:

- `unexpected-delimiters`: the ISA declares separators other than `*`, `|`,
  `~`, and `^`. HETS always uses these separators.
- `unexpected-source`: the `2100A` `NM1` segment doesn't have `NM101` set to
  `PR`, `NM108` set to `PI`, and `NM109` set to `CMS`.
- `unexpected-receiver`: the `2100B` `NM101` element isn't `1P`, `80`, or
  `FA`.
- `member-id-placeholder`: the member's `NM109` element is `MISSING`. HETS
  sends this value with `AAA03` set to `72` when the request had no Medicare
  Beneficiary Identifier (MBI). The `memberId` field still contains
  `MISSING`.
- `unlisted-error`: an `AAA` segment whose level and `AAA03` code aren't in
  the HETS error table.
- `placeholder-address`: HETS couldn't format the beneficiary's address. For
  more information, see [Placeholder address](#placeholder-address).

## Errors

When HETS lists an `AAA03` code for the level of the `AAA` segment, the
entry in `errors` has a `condition` key and a one-line `description`. For
example, `AAA03` set to `72` at the subscriber level has the condition
`mbi-not-matched`. For an error that HETS doesn't list, `condition` and
`description` are `undefined`.

## Medicare views

Each `MedicareView` object contains lists of rows from `eligibility`. Each
list keeps the rows in the order that they appear in the response, including
rows that repeat other rows. A row can be in more than one list.

The following table shows the rows in each list:

| Field | Rows |
| --- | --- |
| `partA`, `partB` | Coverage rows with `EB04` set to `MA` or `MB`. |
| `partACostShares`, `partBCostShares` | Cost share rows with `EB04` set to `MA` or `MB`. |
| `qmb` | Cost share and other party rows with `EB04` set to `QM`. |
| `medicareAdvantage` | Other party rows with `EB01` set to `U` and `EB03` set to `30`. |
| `partD` | Other party rows with `EB01` set to `R` and `EB03` set to `88`. |
| `msp` | Other party rows with `EB01` set to `R`, `EB03` set to `30`, and a Medicare Secondary Payer (MSP) insurance type in `EB04`. |

Medicare Advantage and Part D entries include the following fields:

- `contract`: the `REF` segment with qualifier `18`.
- `plan`: the `REF` segment with qualifier `N6`.
- `planName`: the `REF03` element of the `REF` segment with qualifier `N6`.

MSP entries include the following fields:

- `policyNumber`: the `REF` segment with qualifier `IG`.
- `ref6P`: the `REF` segment with qualifier `6P`, as HETS sent it. HETS uses
  this segment for a group number, a date of loss, or a missing group number,
  so the library doesn't interpret the value.

Qualified Medicare Beneficiary (QMB) rows are only in `qmb`, even when `EB05`
says `Medicare Part A` or `Medicare Part B`.

## Placeholder address

When HETS can't format the address that the Social Security Administration
(SSA) has for the beneficiary, it sends the following placeholder values:

- `N301`: `Refer to MSG for Subscriber address`.
- `N4`: `Baltimore`, `MD`, and `21244`.
- An `EB` row with `EB01` set to `D` and an `MSG` segment that contains
  `Subscriber address - ` followed by the address as SSA sent it.

In that case, `interpretRoute` does the following:

- Adds a `placeholder-address` finding on the `N3` segment.
- Puts the address from the `MSG` segment in `ssaAddress`. When HETS sends
  `Unknown` or no `MSG` segment, `ssaAddress` is `undefined`.

The member's `details.address` in `eligibility` still contains the Baltimore
values.

## Limitations

The `MedicareView` object doesn't include the following rows. You can find
them in `eligibility`.

- Hospital and skilled nursing facility (SNF) spells.
- Home health.
- Hospice.
- End-stage renal disease (ESRD).
- Preventive services.
- Therapy and rehabilitation.
- Medicare Diabetes Prevention Program (MDPP).
- Vaccinations.
- Prior authorization.
