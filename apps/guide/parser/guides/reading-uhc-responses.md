---
title: Read UnitedHealthcare responses
---

This page describes how to read a 271 eligibility response from
UnitedHealthcare by using `interpretRoute` with `uhcProfile`. The profile
applies the 271 rules from the UnitedHealthcare 270/271 Standard Companion
Guide, version 9.0 (February 2025). It does the following:

- Gives each error that the companion guide lists its UnitedHealthcare
  meaning.
- Reads each member's coverage dates, other payers, and variable copays from
  the benefit rows.

## Before you begin

Make sure that you have the following:

- A 271 response to a 270 request that you sent to UnitedHealthcare, directly
  or through a clearinghouse such as Optum or Stedi.
- The `@ediocracy/parser` package.

To have the library pick the profile from the `2100A` payer ID in the
response, use `interpretRoute(entry)` instead of passing `uhcProfile`.
For more information, see
[Apply the payer's rules](/parser/guides/reading-271s#apply-the-payers-rules).
When you pass `uhcProfile` yourself, the profile doesn't check the payer ID.

## Read a response

The following example reads a file of 271 responses and prints the
UnitedHealthcare results for each member:

<<< @/parser/snippets/reading-uhc-responses.ts#example

For each item that `read271s` returns,
[`interpretRoute(entry, profile)`](/parser/api/271/routes/functions/interpretRoute)
returns a [`RouteEligibility`](/parser/api/271/routes/type-aliases/RouteEligibility)
object. The object has the following fields:

- `eligibility`: the unchanged result of `interpret271` for the response.
- `errors`: each error that the payer reported, in the same order as
  `eligibility.requestErrors`. When the companion guide lists an error, its
  entry includes the UnitedHealthcare `condition` and `description`.
- `findings`: the problems that the profile found in the response.
- `members`: one [`UhcView`](/parser/api/271/routes/type-aliases/UhcView) object for
  each member, in the same order as `eligibility.members`.

## Checks that the profile doesn't make

The companion guide gives separators, a `2100A` payer, and `2100B` entity
codes for the 270 request only. It doesn't give them for the 271 response,
and a clearinghouse can deliver the response. For these reasons,
`uhcProfile` doesn't check the following:

- The ISA separators. The profile never reports `unexpected-delimiters`.
- The `2100A` `NM1` segment. The profile never reports `unexpected-source`.
- The `2100B` `NM101` element. The profile never reports
  `unexpected-receiver`.
- Placeholder member IDs. The profile never reports `member-id-placeholder`.

## Errors

The companion guide names three `AAA03` codes and doesn't give a level for
them. The
following table shows the condition that `uhcProfile` gives each code:

| `AAA03` | `condition` | Meaning |
| --- | --- | --- |
| `62`, `63` | `date-outside-window` | The requested dates were more than 18 months in the past, or later than the end of the current month. |
| `75` | `search-data-missing` | The 270 request didn't include enough of the member ID, last name, first name, and date of birth to search for the member. |

These conditions apply to an `AAA` segment at the source, receiver,
subscriber, or dependent level. An `AAA` segment on a benefit row gets no
condition, even when it has one of these codes.

The companion guide doesn't list every error that UnitedHealthcare sends, so
the profile doesn't report an unlisted error as a finding. In `errors`, that
entry has `condition` and `description` set to `undefined`.

## UnitedHealthcare view

Each `UhcView` object contains the lists in the following table. Each list
keeps its rows in the order that they appear in the response.

| Field | Rows |
| --- | --- |
| `coverageDates` | `DTP` segments with `DTP01` set to `346`. The member's dates come first, followed by the dates on coverage rows with `EB03` set to `30`. |
| `otherPayers` | Other party rows with `EB01` set to `R`. |
| `variableCopays` | Copay rows (`EB01` set to `B`) with a message that says that the amount varies. Range rows aren't included. |
| `copayRanges` | Pairs of copay rows. The first row has `EB09` set to `8H` (minimum), and the second has `EB09` set to `M2` (maximum). |

### Coverage dates

The `end` field of a coverage date is set only when `DTP02` is `RD8`. The
companion guide uses `RD8` when coverage has ended. When `DTP02` is `D8`, `end` is
`undefined`.

### Other payers

The `name` field of an other payer is the `NM103` element of the `2120`
`NM1` segment. When UnitedHealthcare sends the `EB01` `R` row without a `2120`
`NM1` segment, `name` is `undefined`.

### Variable copays

A copay row is variable when one of its `MSG` segments, with spaces trimmed,
is exactly `AMOUNT VARIES BY LOCATION` or `AMOUNT VARIES BY PRACTITIONER`. The
`variesBy` field is `location` or `practitioner`.

A variable row with `EB09` set to `8H` pairs with the cost share row (`EB01`
set to `A`, `B`, `C`, or `G`) directly after it, when that row meets all of
the following conditions:

- It's a variable copay row.
- Its `EB09` element is `M2`.
- Its `EB02`, `EB03`, and `EB12` elements match the `8H` row.

The `variesBy` field of a range comes from the `8H` row.

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/271/routes/type-aliases/RouteFindingCode) and
[`UhcFindingCode`](/parser/api/271/routes/type-aliases/UhcFindingCode). The profile
reports the following codes:

- `unexpected-coverage-date-format`: a `DTP` segment has `DTP01` set to
  `346` and `DTP02` set to a value other than `D8` or `RD8`. The date isn't
  in `coverageDates`. `interpret271` also reports the segment as
  `invalid-date` in `eligibility.findings`.
- `unpaired-copay-range`: a variable copay row isn't part of a range. The row
  isn't in `copayRanges` or `variableCopays`. The profile reports this code
  for the following rows:
  - A row with `EB09` set to `8H` that the row directly after it doesn't
    complete.
  - A row with `EB09` set to `M2` that doesn't complete an `8H` row.

Copay rows without a variable-amount message are never paired, and they
never cause a finding.

## Limitations

The `UhcView` object doesn't include the following information. To get it,
read `eligibility`.

- Messages that distinguish between several in-network amounts for one
  benefit
- Health reimbursement arrangement (HRA) rows
- Vendor rows
- Benefit limits (`HSD` segments)
