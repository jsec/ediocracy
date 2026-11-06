// @ts-check

import { readX12 } from '@ediocracy/parser';

/** @typedef {{ purpose: string, fields: Array<[string, string]> }} SegmentDefinition */
/** @typedef {{ position: string, rawValue: string, displayValue: string, name: string, explanation: string }} WalkthroughField */

/**
 * Shared field definitions for the segments explained in this guide. The
 * segment reference page renders them as field tables. X279A1 remains the
 * source for the complete transaction grammar and situational requirements.
 */
/** @type {Readonly<Record<string, SegmentDefinition>>} */
export const SEGMENT_DEFINITIONS = Object.freeze({
  ISA: {
    purpose: 'Opens an interchange and establishes its fixed control and delimiter positions.',
    fields: [
      ['Authorization type', 'Identifies the format of the authorization information.'],
      ['Authorization value', 'Contains the authorization value. This example leaves the fixed-width value blank.'],
      ['Security type', 'Identifies the format of the security information.'],
      ['Security value', 'Contains the security value. This example leaves the fixed-width value blank.'],
      ['Sender ID type', 'Identifies the type of sender identifier.'],
      ['Sender ID', 'Identifies the sender of this interchange.'],
      ['Receiver ID type', 'Identifies the type of receiver identifier.'],
      ['Receiver ID', 'Identifies the receiver of this interchange.'],
      ['Date', 'Records the interchange date in YYMMDD format.'],
      ['Time', 'Records the interchange time in HHMM format.'],
      ['Repetition separator', 'Separates repeated composite values in this interchange.'],
      ['Envelope version', 'Identifies the interchange control version. This example uses 00501.'],
      ['Control number', 'Identifies this interchange and must match IEA02.'],
      ['Acknowledgment request', 'Indicates whether an interchange acknowledgment is requested.'],
      ['Test or production', 'Indicates whether the interchange is for test, production, or information data.'],
      ['Component separator', 'Separates component values within a composite element.'],
    ],
  },
  GS: {
    purpose: 'Opens a functional group inside the interchange.',
    fields: [
      ['Group type', 'Identifies a group of application-related transaction sets.'],
      ['Sender code', 'Identifies the party sending the transmission.'],
      ['Receiver code', 'Identifies the party receiving the transmission.'],
      ['Date', 'Records the functional group date.'],
      ['Time', 'Records the functional group time.'],
      ['Group control number', 'Identifies this group and must match GE02.'],
      ['Agency', 'Identifies the agency responsible for the implementation convention.'],
      ['Version', 'Identifies the implementation convention that the group uses.'],
    ],
  },
  ST: {
    purpose: 'Opens a transaction set inside the functional group.',
    fields: [
      ['Transaction set type', 'Identifies this response as transaction set 271.'],
      ['Control number', 'Identifies this transaction and must match SE02.'],
      ['Guide version', 'Identifies the implementation convention that the transaction uses.'],
    ],
  },
  BHT: {
    purpose: 'Supplies beginning-of-hierarchical-transaction context.',
    fields: [
      ['Hierarchy structure', 'Identifies the hierarchical structure that the transaction uses.'],
      ['Purpose', 'States the purpose of this transaction set.'],
      ['Reference', 'Provides the transaction reference used in this response.'],
      ['Date', 'Records the date the transaction was created in the business application.'],
      ['Time', 'Records the time the transaction was created in the business application.'],
    ],
  },
  HL: {
    purpose: 'Establishes one hierarchical level and its optional parent relationship.',
    fields: [
      ['Level ID', 'Identifies this hierarchy level.'],
      ['Parent level ID', 'Identifies the parent level. It is blank at the top level.'],
      ['Level type', 'Identifies the kind of entity represented by this level.'],
      ['Has child levels', 'Indicates whether this level has subordinate levels.'],
    ],
  },
  NM1: {
    purpose: 'Identifies the party for the current hierarchy level.',
    fields: [
      ['Party role', 'Identifies the party role that this name loop represents.'],
      ['Person or organization', 'Identifies whether the party is an individual or organization.'],
      ['Last name or organization', 'Supplies the party name used in this response.'],
      ['First name', 'Supplies the person’s first name when present.'],
      ['Middle name', 'Supplies the person’s middle name when present.'],
      ['Prefix', 'Supplies a name prefix when present.'],
      ['Suffix', 'Supplies a name suffix when present.'],
      ['ID type', 'Identifies the type of identifier in NM109.'],
      ['ID', 'Supplies the party identifier of the type named in NM108.'],
    ],
  },
  TRN: {
    purpose: 'Returns a trace number sent in the 270 so that you can match the response to its request.',
    fields: [
      ['Trace type', 'Identifies the type of trace number.'],
      ['Trace number', 'Supplies the trace number.'],
      ['Company that assigned the trace', 'Identifies the company that assigned the trace number.'],
      ['Additional company ID', 'Supplies an additional identifier for the originating company.'],
    ],
  },
  LS: {
    purpose: 'Opens a named loop in the current benefit context.',
    fields: [
      ['Loop ID', 'Names the loop that opens here and must match LE01.'],
    ],
  },
  LE: {
    purpose: 'Closes the named loop opened by LS.',
    fields: [
      ['Loop ID', 'Names the loop that closes here and must match LS01.'],
    ],
  },
  HSD: {
    purpose: 'Supplies a quantity, unit, or period that limits the surrounding benefit.',
    fields: [
      ['Quantity type', 'Identifies what HSD02 counts.'],
      ['Quantity', 'Supplies the quantity.'],
      ['Unit', 'Identifies the unit of the quantity.'],
      ['Interval', 'Supplies a frequency or interval value.'],
      ['Period type', 'Identifies the time period that HSD06 counts.'],
      ['Number of periods', 'Supplies the number of time periods.'],
      ['Delivery pattern', 'Identifies a delivery or calendar pattern.'],
      ['Delivery time', 'Identifies a delivery time pattern.'],
    ],
  },
  REF: {
    purpose: 'Supplies an identifier whose meaning depends on its qualifier and loop.',
    fields: [
      ['ID type', 'Identifies the type of identifier in REF02.'],
      ['ID', 'Supplies the identifier.'],
      ['Description', 'Supplies a description of the identifier when present.'],
    ],
  },
  EB: {
    purpose: 'Reports one qualified eligibility or benefit statement in the current subscriber context.',
    fields: [
      ['Benefit status', 'States the eligibility or benefit status that this statement represents.'],
      ['Coverage level', 'Identifies the coverage level when supplied.'],
      ['Service type', 'Identifies the service type that this statement covers.'],
      ['Insurance type', 'Identifies the insurance type when supplied.'],
      ['Plan description', 'Provides the plan or coverage description used in this response.'],
    ],
  },
  DTP: {
    purpose: 'Supplies a date or date period related to the current benefit context.',
    fields: [
      ['Date type', 'Identifies what the date represents.'],
      ['Date format', 'Identifies the format of the date value.'],
      ['Date or range', 'Supplies the date or date period.'],
    ],
  },
  MSG: {
    purpose: 'Contains explanatory text for the surrounding response context.',
    fields: [
      ['Message text', 'Contains the explanatory text in this response.'],
    ],
  },
  SE: {
    purpose: 'Closes a transaction set and declares its segment count.',
    fields: [
      ['Segment count', 'Counts segments from ST through SE.'],
      ['Control number', 'Matches ST02 for this transaction.'],
    ],
  },
  GE: {
    purpose: 'Closes a functional group and declares its transaction count.',
    fields: [
      ['Transaction set count', 'Counts transaction sets in this functional group.'],
      ['Group control number', 'Matches GS06 for this functional group.'],
    ],
  },
  IEA: {
    purpose: 'Closes an interchange and declares its group count.',
    fields: [
      ['Group count', 'Counts functional groups in this interchange.'],
      ['Control number', 'Matches ISA13 for this interchange.'],
    ],
  },
});

/** @typedef {'envelope' | 'context' | 'hierarchy' | 'benefit'} SegmentRole */

/** The theme colors each segment ID by its role. */
/** @type {Readonly<Record<string, SegmentRole>>} */
export const SEGMENT_ROLES = Object.freeze({
  ISA: 'envelope',
  GS: 'envelope',
  ST: 'envelope',
  SE: 'envelope',
  GE: 'envelope',
  IEA: 'envelope',
  BHT: 'context',
  TRN: 'context',
  HL: 'hierarchy',
  NM1: 'hierarchy',
  LS: 'hierarchy',
  LE: 'hierarchy',
  EB: 'benefit',
  HSD: 'benefit',
  DTP: 'benefit',
  REF: 'benefit',
  MSG: 'benefit',
});

/** @type {Readonly<Record<SegmentRole, string>>} */
export const ROLE_LABELS = Object.freeze({
  envelope: 'Envelope',
  context: 'Transaction context',
  hierarchy: 'Party hierarchy',
  benefit: 'Benefit',
});

// A segment ID followed by anything but a letter, so `EB01=1` and `NM1` match and `STATUS` does not.
const SEGMENT_ID = new RegExp(`^(?:${Object.keys(SEGMENT_ROLES).join('|')})(?![A-Za-z])`);

/** @param {string} text @returns {SegmentRole | undefined} */
export function segmentRole(text) {
  const match = text.match(SEGMENT_ID);

  return match ? SEGMENT_ROLES[match[0]] : undefined;
}

/** @typedef {{ keyFields: string, usedIn: Array<[string, string]> }} SegmentIndexEntry */

/**
 * The segment index on the reference page. `keyFields` uses backticks for
 * inline code. `usedIn` lists the pages that use the segment as [label, link].
 */
/** @type {Readonly<Record<string, SegmentIndexEntry>>} */
export const SEGMENT_INDEX = Object.freeze({
  ISA: {
    keyFields: '`ISA13` interchange control, fixed separator positions.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Multiple', '/guide/examples/multiple-interchanges']],
  },
  IEA: {
    keyFields: '`IEA01` group count, `IEA02` control value.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Multiple', '/guide/examples/multiple-interchanges']],
  },
  GS: {
    keyFields: '`GS06` group control value, functional-group identity.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Medicare secondary', '/guide/examples/medicare-secondary-payer']],
  },
  GE: {
    keyFields: '`GE01` transaction count, `GE02` matching control value.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Multiple', '/guide/examples/multiple-interchanges']],
  },
  ST: {
    keyFields: '`ST01=271`, `ST02` transaction control, `ST03=005010X279A1`.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Medicare Advantage', '/guide/examples/medicare-advantage']],
  },
  SE: {
    keyFields: '`SE01` count from `ST` through `SE`, `SE02` matching control.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Multiple', '/guide/examples/multiple-interchanges']],
  },
  BHT: {
    keyFields: 'Transaction purpose, reference, date, and time values.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Medicare secondary', '/guide/examples/medicare-secondary-payer']],
  },
  TRN: {
    keyFields: '`TRN01=2` referenced trace, `TRN02` trace number, `TRN03` originating company.',
    usedIn: [['Not in the examples. See Transaction context', '/guide/structure/transaction-context']],
  },
  HL: {
    keyFields: '`HL01` level ID, `HL02` parent ID, `HL03` level code, `HL04` child indicator.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Multiple', '/guide/examples/multiple-interchanges']],
  },
  NM1: {
    keyFields: 'Entity identifier, entity type, name, and example identifier values.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['Medicare Advantage', '/guide/examples/medicare-advantage']],
  },
  EB: {
    keyFields: '`EB01` status, `EB03` service type, and nearby plan and context values.',
    usedIn: [['Single', '/guide/examples/single-eb'], ['All complete examples', '/guide/reference/examples']],
  },
  DTP: {
    keyFields: 'Date qualifier, format qualifier, and example date value.',
    usedIn: [['Medicare secondary', '/guide/examples/medicare-secondary-payer'], ['Medicare Advantage', '/guide/examples/medicare-advantage']],
  },
  MSG: {
    keyFields: 'Example message text, read with its surrounding `EB` and hierarchy.',
    usedIn: [
      ['Primary and secondary', '/guide/examples/medicare-primary-commercial-secondary'],
      ['Medicare Advantage', '/guide/examples/medicare-advantage'],
      ['X12-RFI-2628', 'https://x12.org/resources/requests-for-interpretation/rfi-2628-msg-segment-271'],
    ],
  },
  LS: {
    keyFields: 'Opens loop `2120` in the examples. `LS01` must match `LE01`.',
    usedIn: [['Eligibility and benefit statements', '/guide/structure/eligibility-benefits']],
  },
  LE: {
    keyFields: '`LE01` closes the loop that `LS01` opened.',
    usedIn: [['Eligibility and benefit statements', '/guide/structure/eligibility-benefits']],
  },
  HSD: {
    keyFields: '`HSD01` quantity qualifier, `HSD02` quantity, `HSD05` and `HSD06` period.',
    usedIn: [['Eligibility and benefit statements', '/guide/structure/eligibility-benefits']],
  },
  REF: {
    keyFields: '`REF01` qualifier, `REF02` identifier.',
    usedIn: [['Eligibility and benefit statements', '/guide/structure/eligibility-benefits']],
  },
});

/** @param {SegmentDefinition} definition @param {string[]} fields @returns {string} */
function segmentExplanation(definition, fields) {
  const purpose = definition.purpose;

  switch (fields[0]) {
    case 'ISA':
      return `${purpose} Its control number is ${fields[13]}.`;
    case 'IEA':
      return `${purpose} It closes the interchange with control number ${fields[2]}.`;
    case 'GS':
      return `${purpose} Its group control number is ${fields[6]}.`;
    case 'GE':
      return `${purpose} It closes group ${fields[2]}.`;
    case 'ST':
      return `${purpose} This transaction is ${fields[1]} with control number ${fields[2]}.`;
    case 'SE':
      return `${purpose} It closes transaction ${fields[2]}.`;
    case 'HL':
      if (fields[2]) {
        return `${purpose} This level is ${fields[1]} under parent ${fields[2]}.`;
      }

      return `${purpose} This level is ${fields[1]} at the top of the hierarchy.`;
    case 'EB':
      return `${purpose} Its status is ${fields[1]} and its service type is ${fields[3] || '(empty)'}.`;
    default:
      return purpose;
  }
}

/** @type {Readonly<Record<string, Record<string, string>>>} */
const CODE_EXPLANATIONS = Object.freeze({
  ISA01: { '00': 'The value 00 means no authorization information is present.' },
  ISA03: { '00': 'The value 00 means no security information is present.' },
  ISA05: { ZZ: 'ZZ is the mutually defined sender identifier qualifier.' },
  ISA07: { ZZ: 'ZZ is the mutually defined receiver identifier qualifier.' },
  ISA14: { '0': 'The value 0 means no interchange acknowledgment is requested.' },
  ISA15: { T: 'The value T marks the interchange as test data.' },
  GS01: { HB: 'The value HB marks a group of eligibility responses.' },
  GS07: { X: 'The value X names X12 as the agency that maintains the standard.' },
  ST01: { '271': 'The value 271 identifies an eligibility, coverage, or benefit response.' },
  BHT01: { '0022': 'The value 0022 means that the levels are payer, provider, subscriber, and dependent.' },
  BHT02: { '11': 'The value 11 marks the transaction as a response.' },
  HL03: {
    '20': 'The value 20 identifies an information-source hierarchy level.',
    '21': 'The value 21 identifies an information-receiver hierarchy level.',
    '22': 'The value 22 identifies a subscriber hierarchy level.',
  },
  HL04: {
    '0': 'The value 0 indicates that this level has no child levels.',
    '1': 'The value 1 indicates that this level has child levels.',
  },
  NM101: {
    PR: 'The value PR identifies the payer party.',
    '1P': 'The value 1P identifies the provider party.',
    IL: 'The value IL identifies the insured or subscriber party.',
  },
  NM102: {
    '1': 'The value 1 identifies an individual person.',
    '2': 'The value 2 identifies an organization.',
  },
  NM108: {
    PI: 'The value PI marks the ID as a payer ID.',
    XX: 'The value XX marks the ID as a National Provider Identifier (NPI).',
  },
  EB01: { '1': 'The value 1 means that the member has active coverage.' },
  EB03: { '30': 'The value 30 identifies health benefit plan coverage as the service type.' },
  DTP01: { '291': 'The value 291 means that the date is when the plan is in effect.' },
  DTP02: { D8: 'The value D8 identifies a single date in CCYYMMDD format.' },
});

/** @param {SegmentDefinition} definition @param {string[]} fields @returns {WalkthroughField[]} */
function fieldsForSegment(definition, fields) {
  return fields.slice(1).map((rawValue, index) => {
    const position = `${fields[0]}${String(index + 1).padStart(2, '0')}`;
    const field = definition.fields[index];

    if (!field) {
      throw new Error(`Unsupported field position: ${position}`);
    }

    const isBlank = rawValue.trim() === '';
    const blankLabel = rawValue === '' ? '(empty)' : `(blank: ${rawValue.length} spaces)`;
    const displayValue = isBlank ? blankLabel : rawValue;
    const codeExplanation = CODE_EXPLANATIONS[position]?.[rawValue.trim()];

    return {
      position,
      rawValue,
      displayValue,
      name: field[0],
      explanation: codeExplanation ? `${field[1]} ${codeExplanation}` : field[1],
    };
  });
}

/**
 * Build the ordered, source-backed data used by the example walkthrough.
 * This is intentionally limited to source segment and field views.
 *
 * @param {string} source
 * @returns {{ displaySource: string, interchanges: Array<{ ordinal: number, raw: string, segments: Array<{ ordinal: number, name: string, raw: string, explanation: string, fields: WalkthroughField[] }> }> }}
 */
export function buildWalkthrough(source) {
  const document = readX12(source);

  if (document.findings.length > 0) {
    const codes = document.findings.map((finding) => finding.code).join(', ');
    throw new Error(`Cannot build walkthrough: ${codes}`);
  }

  const interchanges = document.interchanges.map((interchange, interchangeIndex) => {
    const elementSeparator = interchange.delimiters.element;
    const segmentTerminator = interchange.delimiters.segment;
    const raw = source.slice(
      interchange.header.offset,
      source.indexOf(segmentTerminator, interchange.trailer.offset) + 1,
    );
    const segments = raw.split(segmentTerminator).filter(Boolean).map((segment, segmentIndex) => {
      const fields = segment.split(elementSeparator);
      const name = fields[0];
      const definition = SEGMENT_DEFINITIONS[name];

      if (!definition) {
        throw new Error(`Unsupported segment name: ${name}`);
      }

      return {
        ordinal: segmentIndex + 1,
        name,
        raw: `${segment}${segmentTerminator}`,
        explanation: segmentExplanation(definition, fields),
        fields: fieldsForSegment(definition, fields),
      };
    });

    return {
      ordinal: interchangeIndex + 1,
      raw,
      segments,
    };
  });

  return {
    displaySource: interchanges
      .flatMap((interchange) => interchange.segments.map((segment) => segment.raw))
      .join('\n'),
    interchanges,
  };
}
