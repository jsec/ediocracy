---
title: Read Humana responses
---

This page describes how to read a 271 eligibility response from Humana by
using `interpretRoute` with `humanaProfile`. The profile applies the 271 rules
from the Humana 270/271 Standard Companion Guide, version 2.0 (June 2018). It
does the following:

- Checks the payer and the receiver in the response.
- Gives each error that the companion guide lists its Humana meaning.
- Reads each member's plans, coverage dates, status rows, and HumanaOne billing
  rows.

::: warning
Humana's HIPAA companion guide page links to version 2.0, but this version is
from June 2018. Humana hasn't confirmed that it's still current.
:::

## Before you begin

Make sure that you have the following:

- A 271 response to a 270 request that you sent to Humana, either directly or
  through a clearinghouse.
- The `@ediocracy/parser` package.

The library doesn't detect which payer sent a response. Use `humanaProfile`
only for responses to requests that you sent to Humana.

## Read a response

The following example reads a file of 271 responses and prints the Humana
results for each member:

<<< @/parser/snippets/reading-humana-responses.ts#example

For each item that `read271s` returns,
[`interpretRoute(entry, profile)`](/parser/api/271/routes/functions/interpretRoute)
returns a [`RouteEligibility`](/parser/api/271/routes/type-aliases/RouteEligibility)
object. The object has the following fields:

- `eligibility`: the unchanged result of `interpret271` for the response.
- `errors`: each error that the payer reported, in the same order as
  `eligibility.requestErrors`. When the companion guide lists an error, its
  entry includes the Humana `condition` and `description`.
- `findings`: the problems that the profile found in the response.
- `members`: one [`HumanaView`](/parser/api/271/routes/type-aliases/HumanaView)
  object for each member, in the same order as `eligibility.members`.

## Payer and receiver checks

The companion guide lists the payer IDs and the receiver entity codes in its
table for the 270 request. It also states that the 271 response is only for
the payer ID that the 270 request sent. For these reasons, `humanaProfile`
checks the response against the values in the 270 table:

| Element | Allowed values | Finding |
| --- | --- | --- |
| `2100A` `NM101` and `NM108` | `PR` and `PI` | `unexpected-source` |
| `2100A` `NM109` | `61101` (medical), `61115` (long-term care), `65065` (dental), or `CX021` (CompBenefits dental) | `unexpected-source` |
| `2100B` `NM101` | `1P`, `2B`, `36`, `80`, `FA`, `GP`, or `P5` | `unexpected-receiver` |

The companion guide leaves the ISA and GS rules to Availity. For this reason,
the profile doesn't check the separators or member ID placeholders, and it
never reports `unexpected-delimiters` or `member-id-placeholder`.

## Errors

The companion guide names two `AAA03` codes. The following table shows the
condition that `humanaProfile` gives each code:

| Level | `AAA03` | `condition` | Meaning |
| --- | --- | --- | --- |
| Subscriber | `76` | `duplicate-member-id` | More than one member has this ID. Send the patient's first and last name. |
| Source | `41` | `not-approved-by-cms` | The patient applied for coverage, but CMS hasn't approved it, and Humana has no coverage for them. |

The companion guide doesn't list every error that Humana sends, so the
profile doesn't report an unlisted error as a finding. In `errors`, the entry
for an unlisted error has `condition` and `description` set to `undefined`.

## Humana view

Each `HumanaView` object contains the fields in the following table. Each list
keeps its rows in the order that they appear in the response.

| Field | Contents |
| --- | --- |
| `lineOfBusiness` | `medical` when the `2100A` `NM109` is `61101` or `61115`. `dental` when it's `65065` or `CX021`. `undefined` for any other value. |
| `plans` | One plan for each subscriber or dependent `NM1` segment. Each plan has the benefits that follow its `NM1` segment and its `REF*6P` plan description. |
| `sameIdMembers` | The indexes in `eligibility.members` of other subscribers that have the same member ID. |
| `coverageDates` | `DTP` segments with `DTP01` set to `346`. The UnitedHealthcare profile reads these dates in the same way. |
| `status` | Benefit rows with `EB01` set to `1`, `5`, `6`, `7`, or `V`. |
| `billing` | HumanaOne billing rows, which have `EB01` set to `5` or `7`. |

### Plans and dual-eligible members

When a member has both Medicare and Medicaid coverage, Humana returns the
benefits for both. Humana can send them in either of the following ways, and
the view handles both:

- **Two `NM1*IL` segments in one subscriber loop.** The member has two entries
  in `plans`, and each plan has the benefits that follow its `NM1` segment.
  `read271` also reports the second `NM1` segment as `unexpected-segment`.
- **Two subscriber loops with the same member ID.** Each member has one plan,
  and `sameIdMembers` contains the index of the other member.

The profile compares subscribers only. A dependent often has the same member
ID as the subscriber, so comparing dependents would match the wrong members.

Only an `NM1` segment with `NM101` set to `IL` or `03` starts a plan. Another
`NM1` segment, such as a provider's, can follow a benefit row without an `LS`
segment. In that case, the benefits after it stay in the plan before it.

A plan's `description` field is `REF03` of the plan's `REF*6P` segment, for
example `HUMANA EMPLOYERS HEALTH PLAN OF GA,INC`. Its `groupNumber` field is
`REF02`.

### Status

The `isActive` field is `true` when `EB01` is `1` or `5`. Humana uses `6` for
inactive dental coverage and `V` for inactive medical coverage. `interpret271`
doesn't treat `V` as coverage, and it puts `V` rows in
`eligibility.members[n].otherBenefits`.

The `ended` field is the date in the row's `DTP` segment with `DTP01` set to
`349`. When `DTP02` is `RD8`, `ended` is the last date of the range.

### HumanaOne billing

Each billing row has the following fields:

- `premiumPaidTo`: the date in the `DTP` segment with `DTP01` set to `343`.
- `gracePeriod`: the start date (`DTP01` set to `193`) and the end date
  (`DTP01` set to `194`). It's `undefined` when the row has neither date.
- `graceMonth`: `1`, `2`, or `3`, read from a message that contains
  `Grace Period Month` followed by a number.
- `messages`: the row's `MSG` text, exactly as Humana sent it.

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/271/routes/type-aliases/RouteFindingCode) and
[`HumanaFindingCode`](/parser/api/271/routes/type-aliases/HumanaFindingCode).
The profile reports the following codes:

- `unexpected-source` and `unexpected-receiver`: the response has a payer or
  receiver value that isn't in the 270 table. For more information, see
  [Payer and receiver checks](#payer-and-receiver-checks).
- `unexpected-inactive-code`: a row has `EB01` set to `6` on a medical
  response, or set to `V` on a dental response. When `lineOfBusiness` is
  `undefined`, the profile doesn't check the code.
- `missing-benefit-message`: an in-network row (`EB12` set to `Y`) has no
  `MSG` segment, and another in-network cost share or limitation row in the
  same plan has the same `EB01`, `EB02`, `EB03`, and `EB06`. The companion
  guide states that Humana sends a message to tell these rows apart.
- `invalid-grace-month`: a `Grace Period Month` message has a number other
  than 1, 2, or 3.
- `unexpected-coverage-date-format`: a `DTP` segment has `DTP01` set to `346`
  and `DTP02` set to a value other than `D8` or `RD8`.

## Limitations

The `HumanaView` object doesn't include the following information. To get it,
read `eligibility`.

- Which of a dual-eligible member's plans is Medicare and which is Medicaid.
  To find out, read `EB04` on the plan's benefits.
- The meaning of the HumanaOne billing messages. The view returns the text as
  Humana sent it.
- Telemedicine benefits, which Humana marks with a message.
