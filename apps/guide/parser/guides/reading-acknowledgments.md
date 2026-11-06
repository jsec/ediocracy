---
title: Read 999 and TA1 acknowledgments
---

This page explains how to read the acknowledgments that a receiver can send
in place of a 271 response. You use the `read999s` function for 999
implementation acknowledgments under the `005010X231A1` guide, and the
`readTa1s` function for TA1 interchange acknowledgments.

When you send a 270 request, the reply isn't always a 271 response. For
example, the CMS HIPAA Eligibility Transaction System (HETS) sends one of the
following replies for each 270 request:

- A TA1 acknowledgment.
- A 999 acknowledgment.
- A 271 response.
- A proprietary error message.

## What an acknowledgment confirms

An acknowledgment reports only on syntax:

- A TA1 acknowledgment reports on the `ISA` and `IEA` segments of the
  interchange that you sent.
- A 999 acknowledgment reports on the functional group that you sent, and on
  each transaction set in that group.

An accepted 999 acknowledgment doesn't mean that the receiver processed your
request. In
[request for interpretation (RFI) 2099](https://x12.org/resources/requests-for-interpretation/rfi-2099-999-confirming-claim-receipt),
X12 says that a 999 acknowledgment with the code `A` confirms only that the
transaction has no syntax errors. The answer to a 270 request is the 271
response.

## Before you begin

You need the following:

- A file that contains a 999 or TA1 acknowledgment that a receiver sent in
  reply to your request.
- The `@ediocracy/parser` package.

## Read an acknowledgment

The following example reads a file and prints each TA1 and 999
acknowledgment in it:

<<< @/parser/snippets/reading-acknowledgments.ts#example

The [`readTa1s`](/parser/api/acknowledgements/functions/readTa1s) function returns one item
for each TA1 segment. Each item contains the `interchange` that the segment is
in, and a [`Ta1`](/parser/api/acknowledgements/type-aliases/Ta1) object.

The [`read999s`](/parser/api/acknowledgements/functions/read999s) function returns one item
for each transaction set that has `ST01` set to `999`. Each item contains the
`interchange`, the functional `group`, and a
[`Response999`](/parser/api/acknowledgements/type-aliases/Response999) object. The function
skips all other transaction sets, including 997 acknowledgments.

To read one transaction set, use the
[`read999`](/parser/api/acknowledgements/functions/read999) function.

## The 999 acknowledgment

The following table describes the fields of a `Response999` object:

| Field | Segments | Contents |
| --- | --- | --- |
| `group` | `AK1` | The functional group that the acknowledgment is for. |
| `transactionSets` | Loop 2000 | One item for each `AK2` segment, in order. |
| `result` | `AK9` | The acknowledgment code for the group, the transaction set counts, and the syntax error codes for the group. |
| `findings` | None | The problems that the reader found in the acknowledgment. |

The following table describes the fields of each item in `transactionSets`:

| Field | Segments | Contents |
| --- | --- | --- |
| `id`, `controlNumber`, `convention` | `AK2` | The `ST01`, `ST02`, and `ST03` values of the transaction set that the acknowledgment is for. |
| `segmentErrors` | Loop 2100 | One item for each `IK3` segment. Each item is a segment that has an error. |
| `result` | `IK5` | The acknowledgment code for the transaction set, and its syntax error codes. |

Each segment error contains the following:

- The values of the `IK3` segment.
- In `contexts`, the `CTX` segments that follow the `IK3` segment.
- In `elementErrors`, one item for each `IK4` segment. Each item contains the
  values of the `IK4` segment, and the `CTX` segments that follow it in its
  own `contexts` field.

If the `IK5` or `AK9` segment is missing, the `result` field is `undefined`
and the reader reports `missing-segment`.

### Find the request for an acknowledgment

The library doesn't match an acknowledgment to the request that it's for. To
find the request, compare the values in the following table with the values
that you sent:

| Value in the acknowledgment | Value in your request |
| --- | --- |
| `group.controlNumber` (`AK102`) | `GS06` |
| `transactionSets[].controlNumber` (`AK202`) | `ST02` |
| `contexts[].reference`, when `contexts[].name` is `TRN02` | The trace number in `TRN02` of the subscriber |

### Positions

In a segment error, the `position` field is the position of the segment in
the transaction set. The `ST` segment is position 1.

In an element error, the `position` field is an
[`ElementPosition`](/parser/api/acknowledgements/type-aliases/ElementPosition) object with the
following fields:

- `element`: the position of the element in its segment. The first element
  after the segment ID is position 1.
- `component`: the position of the component, if the error is in a
  component.
- `repetition`: the number of the repetition, if the error is in a
  repetition.

If `IK401` has no element position, the `position` field is `undefined`.

## The TA1 acknowledgment

The following table describes the fields of a `Ta1` object. Each value is a
string, in the form that the receiver sent it.

| Field | Element | Contents |
| --- | --- | --- |
| `controlNumber` | `TA101` | The `ISA13` value of the interchange that you sent. |
| `date` | `TA102` | The date of that interchange, in `YYMMDD` format. |
| `time` | `TA103` | The time of that interchange, in `HHMM` format. |
| `code` | `TA104` | The acknowledgment code. |
| `noteCode` | `TA105` | The note code. |

## Codes

The library returns each code as the receiver sent it, without a name. For
the meaning of each code, see the X12 005010 code lists or the
`005010X231A1` implementation guide, which might allow only some of the codes.

If a TA1 acknowledgment has `TA104` set to `E`, don't send the interchange
again. The receiver accepted it with errors.

## Findings

The `findings` field of a `Response999` object uses the codes from
[`Response999FindingCode`](/parser/api/acknowledgements/type-aliases/Response999FindingCode).
The reader reports the following codes:

- `invalid-number`: a numeric element or component has characters that
  aren't digits. The field for that value is `undefined`.
- `missing-segment`: the acknowledgment has no `AK1` or `AK9` segment, or a
  loop 2000 has no `IK5` segment. The field for that segment is `undefined`.
- `unexpected-segment`: a segment is in a position where the guide doesn't
  allow it, or the acknowledgment has a second `AK1` segment, a second `AK9`
  segment, or a second `IK5` segment in one loop 2000. The reader keeps the
  first segment.
- `unexpected-version`: `ST03` or `GS08` isn't `005010X231A1`.

The `readTa1s` function doesn't report findings.

## Limitations

The library doesn't do the following:

- Read 997 acknowledgments.
- Match an acknowledgment to its request.
- Count the `CTX` segments, or apply other rules from the `005010X231A1`
  guide.
- Give names for codes.
