---
title: Example index
description: Links to complete 271 examples and their EDI downloads.
---

Use these pages to read a segment in its full message context. Each page
explains the scenario and links to the EDI file used by the site.

## Complete examples

| Example | Rendered explanation | Raw download | What to look for |
| --- | --- | --- | --- |
| Single benefit statement | [Read the rendered single-benefit response](/examples/single-eb) | [Download `single-eb.edi`](/examples/single-eb.edi) | One `EB` in one subscriber context. |
| Medicare Secondary Payer context | [Read the rendered Medicare Secondary Payer response](/examples/medicare-secondary-payer) | [Download `medicare-secondary-payer.edi`](/examples/medicare-secondary-payer.edi) | A coordination scenario with subscriber hierarchy, `EB`, and `DTP`. The page explains where payer order must come from. |
| Medicare primary and commercial secondary context | [Read the rendered primary/secondary response](/examples/medicare-primary-commercial-secondary) | [Download `medicare-primary-commercial-secondary.edi`](/examples/medicare-primary-commercial-secondary.edi) | A coordination scenario with related `EB` and `MSG` values. The page explains where payer order must come from. |
| Medicare Advantage context | [Read the rendered Medicare Advantage response](/examples/medicare-advantage) | [Download `medicare-advantage.edi`](/examples/medicare-advantage.edi) | Program context with benefit, date, and message segments. |
| Multiple interchanges | [Read the rendered two-interchange payload](/examples/multiple-interchanges) | [Download `multiple-interchanges.edi`](/examples/multiple-interchanges.edi) | Two complete interchanges in one file. |

## Reading order

Start with [the single-benefit response](/examples/single-eb), then compare
the coordination contexts. Finish with [the multiple-interchange payload](/examples/multiple-interchanges)
to see where one `ISA`/`IEA` interchange ends and the next begins.

All names, identifiers, dates, plan descriptions, and control numbers in these
files were written for this guide. No payer sent these messages. Validate an
implementation against the licensed 005010X279A1 guide and the applicable
companion guide.
