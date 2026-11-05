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

The library returns each code as the receiver sent it, without a name. The
tables in this section come from the base X12 005010 code lists. The
`005010X231A1` guide might allow only some of these codes.

### Acknowledgment codes

The following table shows the codes that `TA104`, `IK501`, and `AK901` can
have:

| Code | Meaning | `TA104` | `IK501` | `AK901` |
| --- | --- | --- | --- | --- |
| `A` | Accepted. | Yes | Yes | Yes |
| `E` | Accepted, with errors. | Yes | Yes | Yes |
| `M` | Rejected. The message authentication code (MAC) failed. | No | Yes | Yes |
| `P` | Partly accepted. One or more transaction sets were rejected. | No | No | Yes |
| `R` | Rejected. | Yes | Yes | Yes |
| `W` | Rejected. Assurance failed validity tests. | No | Yes | Yes |
| `X` | Rejected. The content couldn't be analyzed after decryption. | No | Yes | Yes |

If a TA1 acknowledgment has the code `E`, don't send the interchange again.

### Segment error codes

The following table shows the codes that `IK304` can have:

| Code | Meaning |
| --- | --- |
| `1` | The segment ID isn't recognized. |
| `2` | The segment is unexpected. |
| `3` | A required segment is missing. |
| `4` | A loop occurs more than the maximum number of times. |
| `5` | A segment occurs more than the maximum number of times. |
| `6` | The segment isn't in the transaction set. |
| `7` | The segment isn't in the correct sequence. |
| `8` | The segment has data element errors. |
| `I4` | A segment that the implementation doesn't use is present. |
| `I6` | A segment that the implementation requires is missing. |
| `I7` | A loop occurs fewer than the minimum number of times. |
| `I8` | A segment occurs fewer than the minimum number of times. |
| `I9` | A segment that the implementation doesn't use in this situation is present. |

### Element error codes

The following table shows the codes that `IK403` can have:

| Code | Meaning |
| --- | --- |
| `1` | A required data element is missing. |
| `2` | A data element that a condition requires is missing. |
| `3` | There are too many data elements. |
| `4` | The data element is too short. |
| `5` | The data element is too long. |
| `6` | The data element has an invalid character. |
| `7` | The code value is invalid. |
| `8` | The date is invalid. |
| `9` | The time is invalid. |
| `10` | An exclusion condition isn't met. |
| `12` | There are too many repetitions. |
| `13` | There are too many components. |
| `I6` | The implementation doesn't use the code value. |
| `I9` | A data element that the implementation requires is missing. |
| `I10` | A data element that the implementation doesn't use is present. |
| `I11` | There are too few repetitions. |
| `I12` | The value doesn't match the pattern of the implementation. |
| `I13` | A data element that the implementation doesn't use in this situation is present. |

### Transaction set syntax error codes

The following table shows the codes that `IK502` to `IK506` can have. These
codes are in the `result.syntaxErrors` field of a transaction set.

| Code | Meaning |
| --- | --- |
| `1` | The transaction set isn't supported. |
| `2` | The transaction set trailer is missing. |
| `3` | The control numbers in the header and the trailer are different. |
| `4` | The number of segments isn't the same as the count in the trailer. |
| `5` | One or more segments have errors. |
| `6` | The transaction set identifier is missing or invalid. |
| `7` | The transaction set control number is missing or invalid. |
| `18` | The transaction set isn't in a functional group. |
| `19` | The implementation convention reference is invalid. |
| `23` | The control number isn't unique in the functional group. |
| `I5` | One or more segments have implementation errors. |
| `I6` | The implementation convention isn't supported. |

Codes `8` to `17` and `24` to `27` are for security and encryption errors.

### Group syntax error codes

The following table shows the codes that `AK905` to `AK909` can have. These
codes are in the `result.syntaxErrors` field of the group.

| Code | Meaning |
| --- | --- |
| `1` | The functional group isn't supported. |
| `2` | The version of the functional group isn't supported. |
| `3` | The functional group trailer is missing. |
| `4` | The control numbers in `GS` and `GE` are different. |
| `5` | The number of transaction sets isn't the same as the count in the trailer. |
| `6` | The group control number has a syntax error. |
| `19` | The group control number isn't unique in the interchange. |

Codes `10` to `18` and `23` to `26` are for security and encryption errors.

### TA1 note codes

The following table shows the codes that `TA105` can have:

| Code | Meaning |
| --- | --- |
| `000` | There's no error. |
| `001` | The control numbers in `ISA` and `IEA` are different. |
| `002` | The control standards identifier isn't supported. |
| `003` | The version of the controls isn't supported. |
| `004` | The segment terminator is invalid. |
| `005` | The sender ID qualifier is invalid. |
| `006` | The sender ID is invalid. |
| `007` | The receiver ID qualifier is invalid. |
| `008` | The receiver ID is invalid. |
| `009` | The receiver ID is unknown. |
| `010` | The authorization information qualifier is invalid. |
| `011` | The authorization information is invalid. |
| `012` | The security information qualifier is invalid. |
| `013` | The security information is invalid. |
| `014` | The interchange date is invalid. |
| `015` | The interchange time is invalid. |
| `016` | The standards identifier is invalid. |
| `017` | The version ID is invalid. |
| `018` | The control number is invalid. |
| `019` | The acknowledgment requested value is invalid. |
| `020` | The test indicator is invalid. |
| `021` | The number of included groups is invalid. |
| `022` | The control structure is invalid. |
| `023` | The file ended too early. |
| `024` | The interchange content is invalid. For example, a `GS` segment is invalid. |
| `025` | The control number is a duplicate. |
| `026` | The data element separator is invalid. |
| `027` | The component element separator is invalid. |
| `028` to `031` | The deferred delivery request or the grade of service is invalid. |

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
