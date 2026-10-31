---
title: Transaction context
description: Learn how ST, BHT, and related transaction identifiers identify a 271 and its business event.
---

Transaction context identifies an X12 transaction and the values that
correlate its business event. In a 271, `ST` opens the transaction set and
`BHT` supplies the beginning-of-hierarchical-transaction context.

## ST and SE

`ST01` identifies the transaction set as `271`. `ST02` is the transaction
control number, and `ST03` identifies the implementation convention used in
the example. `SE` closes the set with a segment count and the matching control
number. For the complete pair, see
[Transaction set: ST and SE](/guide/structure/envelopes#transaction-set-st-and-se).

## BHT and correlation

`BHT` appears after `ST` and supplies business context for the transaction:

```text
BHT*0022*11*ELIG1010001*20990101*1201~
```

- `BHT01=0022` identifies the hierarchy used by this transaction.
- `BHT02=11` identifies the transaction as a response.
- `BHT03=ELIG1010001` is the reference value in this example.
- `BHT04=20990101` and `BHT05=1201` record the transaction date and time.

The 005010X279A1 implementation guide (X279A1) allows a 271 to return `BHT03`
only when the transaction is used in batch mode. A real-time 271 doesn't use
it. This example includes it for illustration. Don't assume that it remains
unchanged through every intermediary. For field details, see the
[BHT fields](/guide/reference/segments#bht).

To match a 271 to its 270, X279A1 uses `TRN` in the subscriber or dependent
loop (`2000C` or `2000D`). The response returns each `TRN` sent in the inquiry,
with `TRN01=2` (referenced transaction trace numbers). The examples in this
guide don't include `TRN`. For field details, see the
[TRN fields](/guide/reference/segments#trn).
