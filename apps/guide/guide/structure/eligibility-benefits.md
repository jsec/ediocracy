---
title: Eligibility and benefit statements
description: Learn how EB and related segments describe a qualified 271 benefit statement.
---

An `EB` segment reports eligibility or benefit information for a specific
context. Its meaning depends on the person and hierarchy that contain it,
the requested service, coverage level, time period, and the values returned by
the payer.

## EB example

The [EB fields](/guide/reference/segments#eb)
show fields used for benefit status, service type, coverage level, insurance
type, time period, amounts, percentages, and quantities. A response can repeat
benefit statements for different services or conditions. Authorization and
network indications can further qualify a statement when the transaction
profile and payer return those values.

The single-benefit example uses a short statement:

```text
EB*1**30**SILVER PPO~
```

- `EB01=1` reports active coverage.
- `EB02` is empty, so this statement does not supply a coverage-level value.
- `EB03=30` identifies health benefit plan coverage as the service type.
- `EB04` is empty, so this statement does not supply an insurance-type value.
- `EB05=SILVER PPO` is the plan description used in this example.

That line provides one statement in its surrounding subscriber context. Read
the other benefit statements, dates, and payer instructions before deciding
the member's coverage or payer order.

## LS and LE example

`LS` and `LE` mark the start and end of a named loop. In this excerpt,
`EB01=R` reports another or additional payer, and the `2120` loop names it:

```text
EB*R**30~
LS*2120~
NM1*PR*2*RIVERBEND HEALTH PLAN~
LE*2120~
```

`LS01=2120` and `LE01=2120` contain the same loop identifier. The `NM1` between
them identifies the related payer in this example. The applicable 271 guide
determines whether a response uses this loop. For field details, see the
[LS fields](/guide/reference/segments#ls) and the
[LE fields](/guide/reference/segments#le).

## DTP example

`DTP` supplies a date, time, or period associated with the surrounding loop:

```text
DTP*291*D8*20990101~
```

- `DTP01=291` identifies the date as a plan date in this example.
- `DTP02=D8` says that `DTP03` contains one date in `CCYYMMDD` form.
- `DTP03=20990101` is January 1, 2099.

For field details, see the [DTP fields](/guide/reference/segments#dtp).

## HSD example

`HSD` limits the benefit in the `EB` before it:

```text
EB*F*IND*96*********Y~
HSD*VS*5***34*6~
```

The X12 code values give `HSD01=VS` as visits and `HSD05=34` as months.
`HSD02=5` supplies the quantity and `HSD06=6` the number of periods.
Read together, the two segments state a limit of five visits in six months.
Payers differ in when they send `HSD`. For field details, see the
[HSD fields](/guide/reference/segments#hsd).

## REF example

`REF` contains an identifier whose meaning depends on its qualifier and loop:

```text
REF*6P*RB12345~
```

`REF01=6P` is the qualifier, and `REF02=RB12345` is the example identifier.
In a `2110C` or `2110D` benefit loop, the 005010X279A1 implementation guide
(X279A1) defines `6P` as Group Number. A route
can put other data in the field, so the same qualifier can contain a different
value on another payer's connection. Read the identifier with its loop and the
applicable payer or intermediary guide. For field details, see the
[REF fields](/guide/reference/segments#ref).

## MSG example

`MSG` adds text to its surrounding benefit context:

```text
EB*1**30**MEDICARE ADVANTAGE PLAN~
MSG*MEDICARE ADVANTAGE COVERAGE REPORTED~
```

`MSG01` contains the text. Its meaning comes from the eligibility or benefit
loop that contains it. For field details, see the
[MSG fields](/guide/reference/segments#msg).
X12 [Request for Interpretation (RFI) 2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271)
describes another 271 use of `MSG`.

## Interpret the whole context

Read an `EB` with its `HL`, `NM1`, dates, identifiers, limits, and explanatory
text. Payer instructions can further restrict the values and qualifiers.
