---
title: Eligibility and benefit statements
description: How EB and related context describe a qualified 271 benefit statement.
---

An `EB` segment reports eligibility or benefit information for a specific
context. Its meaning depends on the person and hierarchy around it,
the requested service, coverage level, time period, and the values returned by
the payer.

## EB example

Public [EB element references](https://www.stedi.com/edi/x12-005010/segment/EB)
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

`LS` and `LE` mark the start and end of a named loop. This excerpt adapts the
additional-payer pattern in the UnitedHealthcare companion guide:

```text
EB*R**30~
LS*2120~
NM1*PR*2*RIVERBEND HEALTH PLAN~
LE*2120~
```

`LS01=2120` and `LE01=2120` carry the same loop identifier. The `NM1` between
them identifies the related payer in this example. The applicable 271 guide
determines when this loop is used; the generic [LS](https://www.stedi.com/edi/x12-005010/segment/LS)
and [LE](https://www.stedi.com/edi/x12-005010/segment/LE) references only define
the control pair.

## DTP example

`DTP` supplies a date, time, or period associated with the surrounding loop:

```text
DTP*291*D8*20990101~
```

- `DTP01=291` identifies the date as a plan date in this example.
- `DTP02=D8` says that `DTP03` contains one date in `CCYYMMDD` form.
- `DTP03=20990101` is January 1, 2099.

See the public [DTP field reference](https://www.stedi.com/edi/x12-005010/segment/DTP).

## HSD example

UnitedHealthcare publishes this benefit limitation example:

```text
EB*F*IND*96*********Y~
HSD*VS*5***34*6~
```

In that guide, `HSD01=VS` means visits, `HSD02=5` supplies the quantity,
`HSD05=34` identifies months, and `HSD06=6` supplies the number of periods.
Together, the two segments describe a five-visit limit over six months. Those
code meanings are stated for the UnitedHealthcare example; do not apply the
entire pattern to another payer without checking its guide. See the generic
[HSD field reference](https://www.stedi.com/edi/x12-005010/segment/HSD) and the
[UnitedHealthcare companion guide](https://www.uhcprovider.com/content/dam/provider/docs/public/resources/edi/EDI-270-271-Companion-Guide-005010X279A1.pdf).

## REF example

`REF` carries an identifier whose meaning depends on its qualifier and loop:

```text
REF*6P*RB12345~
```

`REF01=6P` is the qualifier, and `REF02=RB12345` is the example identifier.
The segment alone does not establish what that identifier means. Read it with
its loop and the applicable payer or intermediary guide. See the public
[REF field reference](https://www.stedi.com/edi/x12-005010/segment/REF).

## MSG example

`MSG` adds text to its surrounding benefit context:

```text
EB*1**30**MEDICARE ADVANTAGE PLAN~
MSG*MEDICARE ADVANTAGE COVERAGE REPORTED~
```

`MSG01` contains the text. Its meaning comes from the eligibility or benefit
loop that contains it. See the public
[MSG field reference](https://www.stedi.com/edi/x12-005010/segment/MSG).
X12's [RFI 2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271)
describes another 271 use of `MSG`.

## Interpret the whole context

Read an `EB` with its `HL`, `NM1`, dates, identifiers, limits, and explanatory
text. Payer instructions may further restrict the values and qualifiers.
