---
title: Read CMS HETS responses
---

CMS HETS is the system that answers Medicare eligibility requests. Its
companion guide (version 15-1, May 2026) adds rules to the standard 271. Use
`interpretRoute` with `hetsProfile` for responses to 270 requests that you sent
to HETS. The function checks the response against those rules, gives each
error the HETS meaning, and sorts each member's benefit rows into Medicare
lists.

<<< @/parser/snippets/reading-hets-responses.ts#example

## `interpretRoute`

[`interpretRoute(entry, profile)`](/parser/api/functions/interpretRoute)
takes one item that `read271s` returns and a route profile. It returns a
[`RouteEligibility`](/parser/api/type-aliases/RouteEligibility) object with
the following fields:

- `eligibility`: the result of `interpret271` for the response, unchanged.
- `errors`: every error the payer reported, in the same order as
  `eligibility.requestErrors`, with the route's `condition` and
  `description`.
- `findings`: the problems found by the route's rules.
- `members`: one Medicare view for each member, in the same order as
  `eligibility.members`.

The library doesn't check which system sent the response. You choose
`hetsProfile` because you sent the request to HETS.

## Findings

The `findings` field uses codes from
[`RouteFindingCode`](/parser/api/type-aliases/RouteFindingCode) and
[`HetsFindingCode`](/parser/api/type-aliases/HetsFindingCode):

- `unexpected-delimiters`: the ISA declares separators other than `*`, `|`,
  `~`, and `^`. HETS always uses these separators.
- `unexpected-source`: the 2100A NM1 isn't `PR`, `PI`, `CMS`.
- `unexpected-receiver`: the 2100B NM101 isn't `1P`, `80`, or `FA`.
- `member-id-placeholder`: the member's NM109 is `MISSING`. HETS sends this
  value with AAA03 `72` when the request had no MBI. The `memberId` field
  still contains `MISSING`.
- `unlisted-error`: an AAA whose level and AAA03 aren't in the HETS error
  table.
- `placeholder-address`: HETS couldn't format the beneficiary's address. See
  [Placeholder address](#placeholder-address).

## Errors

Each entry in `errors` has a `condition` key and a one-line `description`
when HETS lists the AAA03 for that level. For example, AAA03 `72` at the
subscriber level has the condition `mbi-not-matched`. The `condition` and
`description` fields are `undefined` for an AAA that HETS doesn't list.

## Medicare views

Each [`MedicareView`](/parser/api/type-aliases/MedicareView) contains lists
of rows from `eligibility`. Each list keeps the rows in their order in the
response, including rows that repeat others. A row can also be in more than
one list.

| Field | Rows |
| --- | --- |
| `partA`, `partB` | Coverage rows with EB04 `MA` or `MB` |
| `partACostShares`, `partBCostShares` | Cost share rows with EB04 `MA` or `MB` |
| `qmb` | Cost share and other party rows with EB04 `QM` |
| `medicareAdvantage` | Other party rows with EB01 `U` and EB03 `30` |
| `partD` | Other party rows with EB01 `R` and EB03 `88` |
| `msp` | Other party rows with EB01 `R`, EB03 `30`, and an MSP insurance type in EB04 |

Medicare Advantage and Part D entries include the `contract` (REF `18`),
`plan` (REF `N6`), and `planName` (REF03 of the REF `N6`). MSP entries
include the `policyNumber` (REF `IG`) and `ref6P` (REF `6P`). HETS uses
REF `6P` for a group number, a date of loss, or a missing group number, so
`ref6P` contains the value as sent.

QMB rows are only in `qmb`, even when EB05 says `Medicare Part A` or
`Medicare Part B`.

## Placeholder address

When HETS can't format the address that SSA has for the beneficiary, it sends
`Refer to MSG for Subscriber address` in N301 and `Baltimore`, `MD`, `21244`
in N4. It adds an EB row with EB01 `D` and an MSG that contains
`Subscriber address - ` followed by the address as SSA sent it.

In that case, `interpretRoute` adds a `placeholder-address` finding on the N3
segment and puts the address from the MSG in `ssaAddress`. The
`ssaAddress` field is `undefined` when HETS sends `Unknown` or no MSG. The
member's `details.address` in `eligibility` still contains the Baltimore
values.

## Not covered yet

The Medicare view doesn't yet cover Hospital and SNF spells, Home Health,
Hospice, ESRD, preventive services, therapy, rehabilitation, MDPP,
vaccinations, or prior authorization. Those rows are still in `eligibility`.
