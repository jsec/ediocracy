---
title: Eligibility and benefit statements
description: Learn how EB and related segments describe a qualified 271 benefit statement.
pageClass: edi-numbered
---

An `EB` segment reports eligibility or benefit information for a specific
context. Its meaning depends on the person and hierarchy that contain it,
the requested service, coverage level, time period, and the values returned by
the payer.

## EB example

::: aside Before you decide
Read the other benefit statements, dates, and payer instructions before
deciding the member's coverage or payer order.
:::

::: aside Field tables
[EB →](/guide/reference/segments#eb)
:::

The `EB` fields cover benefit status, service type, coverage level, insurance
type, time period, amounts, percentages, and quantities. A response can repeat
benefit statements for different services or conditions. Authorization and
network indications can further qualify a statement when the transaction
profile and payer return those values.

The single-benefit example uses a short statement:

<X12Annotated
  :lines="['EB*1**30**SILVER PPO~']"
  :fields="[
    ['EB01', 'reports active coverage.'],
    ['EB02', 'is empty, so this statement does not supply a coverage-level value.'],
    ['EB03', 'identifies health benefit plan coverage as the service type.'],
    ['EB04', 'is empty, so this statement does not supply an insurance-type value.'],
    ['EB05', 'is the plan description used in this example.'],
  ]"
/>

That line provides one statement in its surrounding subscriber context.

## LS and LE example

::: aside Guide-dependent
The applicable 271 guide determines whether a response uses this loop.
:::

::: aside Field tables
[LS →](/guide/reference/segments#ls) [LE →](/guide/reference/segments#le)
:::

`LS` and `LE` mark the start and end of a named loop. In this excerpt,
`EB01=R` reports another or additional payer, and the `2120` loop names it:

<X12Annotated
  :lines="['EB*R**30~', 'LS*2120~', 'NM1*PR*2*RIVERBEND HEALTH PLAN~', 'LE*2120~']"
  :fields="[
    ['LS01', 'opens loop 2120.'],
    ['NM103', 'identifies the related payer in this example.'],
    ['LE01', 'closes the same loop identifier as LS01.'],
  ]"
/>

## DTP example

::: aside Reads as
Plan date: January 1, 2099.
:::

::: aside Field tables
[DTP →](/guide/reference/segments#dtp)
:::

`DTP` supplies a date, time, or period associated with the surrounding loop:

<X12Annotated
  :lines="['DTP*291*D8*20990101~']"
  :fields="[
    ['DTP01', 'identifies the date as a plan date in this example.'],
    ['DTP02', 'says that DTP03 contains one date in CCYYMMDD form.'],
    ['DTP03', 'is January 1, 2099.'],
  ]"
/>

## HSD example

::: aside Reads as
A limit of five visits in six months.
:::

::: aside Payer variation
Payers differ in when they send `HSD`.
:::

::: aside Field tables
[HSD →](/guide/reference/segments#hsd)
:::

`HSD` limits the benefit in the `EB` before it:

<X12Annotated
  :lines="['EB*F*IND*96*********Y~', 'HSD*VS*5***34*6~']"
  :fields="[
    ['HSD01', 'is visits.'],
    ['HSD02', 'supplies the quantity.'],
    ['HSD05', 'is months.'],
    ['HSD06', 'supplies the number of periods.'],
  ]"
/>

## REF example

::: aside Caution
Read the identifier with its loop and the applicable payer or intermediary
guide.
:::

::: aside Field tables
[REF →](/guide/reference/segments#ref)
:::

`REF` contains an identifier whose meaning depends on its qualifier and loop:

<X12Annotated
  :lines="['REF*6P*RB12345~']"
  :fields="[
    ['REF01', 'is the qualifier.'],
    ['REF02', 'is the example identifier.'],
  ]"
/>

In a `2110C` or `2110D` benefit loop, the 005010X279A1 implementation guide
(X279A1) defines `6P` as Group Number. A route can put other data in the
field, so the same qualifier can contain a different value on another payer's
connection.

## MSG example

::: aside Related
X12 [Request for Interpretation (RFI) 2628](https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271)
describes another 271 use of `MSG`.
:::

::: aside Field tables
[MSG →](/guide/reference/segments#msg)
:::

`MSG` adds text to its surrounding benefit context:

<X12Annotated
  :lines="['EB*1**30**MEDICARE ADVANTAGE PLAN~', 'MSG*MEDICARE ADVANTAGE COVERAGE REPORTED~']"
  :fields="[
    ['MSG01', 'contains the text. Its meaning comes from the eligibility or benefit loop that contains it.'],
  ]"
/>

## Interpret the whole context

Read an `EB` with its `HL`, `NM1`, dates, identifiers, limits, and explanatory
text. Payer instructions can further restrict the values and qualifiers.
{.edi-pull}
