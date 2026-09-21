---
title: Transaction context
description: How ST, BHT, and nearby transaction identifiers orient a 271.
---

Transaction context identifies an X12 transaction and how its
business event is correlated. In a 271, `ST` opens the transaction set and
`BHT` supplies the beginning-of-hierarchical-transaction context.

## ST and SE

`ST01` identifies the transaction set as `271`. `ST02` is the transaction
control number, and `ST03` identifies the implementation convention used in
the example. `SE` closes the set with a segment count and the matching control
number. The [interchange, group, and transaction page](/structure/envelopes/#transaction-set-st-and-se)
shows the complete pair.

## BHT and correlation

`BHT` appears after `ST` and supplies business context for the transaction:

```text
BHT*0022*11*ELIG1010001*20990101*1201~
```

- `BHT01=0022` identifies the hierarchy used by this transaction.
- `BHT02=11` identifies the transaction as a response.
- `BHT03=ELIG1010001` is the reference value in this example.
- `BHT04=20990101` and `BHT05=1201` record the transaction date and time.

The reference value can help correlate messages, but route documentation
defines whether and how it is returned. Do not assume that it remains unchanged
through every intermediary. See the public
[BHT field reference](https://www.stedi.com/edi/x12-005010/segment/BHT).
