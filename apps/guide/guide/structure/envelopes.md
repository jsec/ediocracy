---
title: Interchanges, groups, and transactions
description: How ISA, GS, and ST containers nest inside a 271 interchange.
---

X12 documentation uses *envelope* for the header-and-trailer pairs that delimit
parts of a message. An interchange contains functional groups, and each group
contains transaction sets.

## Interchange: ISA and IEA

`ISA` starts the interchange, and `IEA` ends it. This pair comes from the
[single-benefit response](/guide/examples/single-eb):

```text
ISA*00*          *00*          *ZZ*CEDARVALLEYHP  *ZZ*OAKSTMEDGROUP  *990101*1201*^*00501*000000101*0*T*:~
...
IEA*1*000000101~
```

- `ISA01` through `ISA04` show that the example does not supply authorization
  or security information. The spaces still fill fixed-width positions.
- `ISA05`/`ISA06` identify the sender, and `ISA07`/`ISA08` identify the
  receiver. Both use `ZZ`, the mutually defined qualifier.
- `ISA09` and `ISA10` contain the interchange date and time. `ISA11`, `ISA12`,
  and `ISA16` establish the repetition separator, control version, and
  component separator. `ISA15=T` marks the interchange as test data.
- `ISA13` is the interchange control number. The same value appears in
  `IEA02`.
- `IEA01=1` reports one functional group in this interchange.

See the [ISA](/guide/reference/segments#isa) and
[IEA](/guide/reference/segments#iea) field tables.

## Functional group: GS and GE

`GS` and `GE` surround a functional group:

```text
GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP*20990101*1201*101*X*005010X279A1~
...
GE*1*101~
```

- `GS01=HB` identifies the functional group as eligibility, coverage, or
  benefit information.
- `GS02` and `GS03` contain the application sender and receiver codes.
- `GS04` and `GS05` contain the group date and time.
- `GS06=101` is the group control number. It matches `GE02`.
- `GS07=X` identifies X12 as the responsible agency, while
  `GS08=005010X279A1` identifies the implementation convention used here.
- `GE01=1` reports one transaction set in the group.

See the [GS](/guide/reference/segments#gs) and
[GE](/guide/reference/segments#ge) field tables.

## Transaction set: ST and SE

`ST` and `SE` surround one business transaction:

```text
ST*271*0101*005010X279A1~
...
SE*10*0101~
```

- `ST01=271` identifies an eligibility, coverage, or benefit response.
- `ST02=0101` is the transaction control number. It matches `SE02`.
- `ST03=005010X279A1` identifies the implementation convention used by the
  transaction.
- `SE01=10` counts every segment from `ST` through `SE`, including both.

See the [ST](/guide/reference/segments#st) and
[SE](/guide/reference/segments#se) field tables.

These pairs close in reverse order: `ST`/`SE`, then `GS`/`GE`, then
`ISA`/`IEA`. A file can contain more than one interchange, as shown by
[X12 RFI 1585](https://x12.org/resources/requests-for-interpretation/rfi-1585-reporting-multi-isas-999).
Each route can set its own file and batching rules.
