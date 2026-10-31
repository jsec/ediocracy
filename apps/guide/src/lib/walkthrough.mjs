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
      ['Authorization Information Qualifier', 'Identifies the format of the authorization information.'],
      ['Authorization Information', 'Contains the authorization value. This example leaves the fixed-width value blank.'],
      ['Security Information Qualifier', 'Identifies the format of the security information.'],
      ['Security Information', 'Contains the security value. This example leaves the fixed-width value blank.'],
      ['Interchange ID Qualifier', 'Identifies the type of sender identifier.'],
      ['Interchange Sender ID', 'Identifies the sender of this interchange.'],
      ['Interchange ID Qualifier', 'Identifies the type of receiver identifier.'],
      ['Interchange Receiver ID', 'Identifies the receiver of this interchange.'],
      ['Interchange Date', 'Records the interchange date in YYMMDD format.'],
      ['Interchange Time', 'Records the interchange time in HHMM format.'],
      ['Repetition Separator', 'Separates repeated composite values in this interchange.'],
      ['Interchange Control Version Number', 'Identifies the interchange control version. This example uses 00501.'],
      ['Interchange Control Number', 'Identifies this interchange and must match IEA02.'],
      ['Acknowledgment Requested', 'Indicates whether an interchange acknowledgment is requested.'],
      ['Interchange Usage Indicator', 'Indicates whether the interchange is for test, production, or information data.'],
      ['Component Element Separator', 'Separates component values within a composite element.'],
    ],
  },
  GS: {
    purpose: 'Opens a functional group inside the interchange.',
    fields: [
      ['Functional Identifier Code', 'Identifies a group of application-related transaction sets.'],
      ["Application Sender's Code", 'Identifies the party sending the transmission.'],
      ["Application Receiver's Code", 'Identifies the party receiving the transmission.'],
      ['Date', 'Records the functional group date.'],
      ['Time', 'Records the functional group time.'],
      ['Group Control Number', 'Identifies this group and must match GE02.'],
      ['Responsible Agency Code', 'Identifies the agency responsible for the implementation convention.'],
      ['Version / Release / Industry Identifier Code', 'Identifies the implementation convention that the group uses.'],
    ],
  },
  ST: {
    purpose: 'Opens a transaction set inside the functional group.',
    fields: [
      ['Transaction Set Identifier Code', 'Identifies this response as transaction set 271.'],
      ['Transaction Set Control Number', 'Identifies this transaction and must match SE02.'],
      ['Implementation Convention Reference', 'Identifies the implementation convention that the transaction uses.'],
    ],
  },
  BHT: {
    purpose: 'Supplies beginning-of-hierarchical-transaction context.',
    fields: [
      ['Hierarchical Structure Code', 'Identifies the hierarchical structure that the transaction uses.'],
      ['Transaction Set Purpose Code', 'States the purpose of this transaction set.'],
      ['Reference Identification', 'Provides the transaction reference used in this response.'],
      ['Date', 'Records the date the transaction was created in the business application.'],
      ['Time', 'Records the time the transaction was created in the business application.'],
    ],
  },
  HL: {
    purpose: 'Establishes one hierarchical level and its optional parent relationship.',
    fields: [
      ['Hierarchical ID Number', 'Identifies this hierarchy level.'],
      ['Hierarchical Parent ID Number', 'Identifies the parent level. It is blank at the top level.'],
      ['Hierarchical Level Code', 'Identifies the kind of entity represented by this level.'],
      ['Hierarchical Child Code', 'Indicates whether this level has subordinate levels.'],
    ],
  },
  NM1: {
    purpose: 'Identifies the party for the current hierarchy level.',
    fields: [
      ['Entity Identifier Code', 'Identifies the party role that this name loop represents.'],
      ['Entity Type Qualifier', 'Identifies whether the party is an individual or organization.'],
      ['Name Last or Organization Name', 'Supplies the party name used in this response.'],
      ['Name First', 'Supplies the person’s first name when present.'],
      ['Name Middle', 'Supplies the person’s middle name when present.'],
      ['Name Prefix', 'Supplies a name prefix when present.'],
      ['Name Suffix', 'Supplies a name suffix when present.'],
      ['Identification Code Qualifier', 'Identifies the type of identifier in NM109.'],
      ['Identification Code', 'Supplies the party identifier of the type named in NM108.'],
    ],
  },
  TRN: {
    purpose: 'Returns a trace number sent in the 270 so that you can match the response to its request.',
    fields: [
      ['Trace Type Code', 'Identifies the type of trace number.'],
      ['Reference Identification', 'Supplies the trace number.'],
      ['Originating Company Identifier', 'Identifies the company that assigned the trace number.'],
      ['Reference Identification', 'Supplies an additional identifier for the originating company.'],
    ],
  },
  LS: {
    purpose: 'Opens a named loop in the current benefit context.',
    fields: [
      ['Loop Identifier Code', 'Names the loop that opens here and must match LE01.'],
    ],
  },
  LE: {
    purpose: 'Closes the named loop opened by LS.',
    fields: [
      ['Loop Identifier Code', 'Names the loop that closes here and must match LS01.'],
    ],
  },
  HSD: {
    purpose: 'Supplies a quantity, unit, or period that limits the surrounding benefit.',
    fields: [
      ['Quantity Qualifier', 'Identifies what HSD02 counts.'],
      ['Quantity', 'Supplies the quantity.'],
      ['Unit or Basis for Measurement Code', 'Identifies the unit of the quantity.'],
      ['Sample Selection Modulus', 'Supplies a frequency or interval value.'],
      ['Time Period Qualifier', 'Identifies the time period that HSD06 counts.'],
      ['Number of Periods', 'Supplies the number of time periods.'],
      ['Ship/Delivery or Calendar Pattern Code', 'Identifies a delivery or calendar pattern.'],
      ['Ship/Delivery Pattern Time Code', 'Identifies a delivery time pattern.'],
    ],
  },
  REF: {
    purpose: 'Supplies an identifier whose meaning depends on its qualifier and loop.',
    fields: [
      ['Reference Identification Qualifier', 'Identifies the type of identifier in REF02.'],
      ['Reference Identification', 'Supplies the identifier.'],
      ['Description', 'Supplies a description of the identifier when present.'],
    ],
  },
  EB: {
    purpose: 'Reports one qualified eligibility or benefit statement in the current subscriber context.',
    fields: [
      ['Eligibility or Benefit Information Code', 'States the eligibility or benefit status that this statement represents.'],
      ['Coverage Level Code', 'Identifies the coverage level when supplied.'],
      ['Service Type Code', 'Identifies the service type that this statement covers.'],
      ['Insurance Type Code', 'Identifies the insurance type when supplied.'],
      ['Plan Coverage Description', 'Provides the plan or coverage description used in this response.'],
    ],
  },
  DTP: {
    purpose: 'Supplies a date or date period related to the current benefit context.',
    fields: [
      ['Date/Time Qualifier', 'Identifies what the date represents.'],
      ['Date Time Period Format Qualifier', 'Identifies the format of the date value.'],
      ['Date Time Period', 'Supplies the date or date period.'],
    ],
  },
  MSG: {
    purpose: 'Contains explanatory text for the surrounding response context.',
    fields: [
      ['Free-Form Message Text', 'Contains the explanatory text in this response.'],
    ],
  },
  SE: {
    purpose: 'Closes a transaction set and declares its segment count.',
    fields: [
      ['Number of Included Segments', 'Counts segments from ST through SE.'],
      ['Transaction Set Control Number', 'Matches ST02 for this transaction.'],
    ],
  },
  GE: {
    purpose: 'Closes a functional group and declares its transaction count.',
    fields: [
      ['Number of Transaction Sets Included', 'Counts transaction sets in this functional group.'],
      ['Group Control Number', 'Matches GS06 for this functional group.'],
    ],
  },
  IEA: {
    purpose: 'Closes an interchange and declares its group count.',
    fields: [
      ['Number of Included Functional Groups', 'Counts functional groups in this interchange.'],
      ['Interchange Control Number', 'Matches ISA13 for this interchange.'],
    ],
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
  ISA15: { T: 'The value T is the code for test data.' },
  GS01: { HB: 'The value HB means Eligibility, Coverage or Benefit Information.' },
  GS07: { X: 'The value X identifies the responsible agency as X12.' },
  ST01: { '271': 'The value 271 identifies an eligibility, coverage, or benefit response.' },
  BHT01: { '0022': 'The value 0022 means Information Source, Information Receiver, Subscriber, Dependent.' },
  BHT02: { '11': 'The value 11 means Response.' },
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
    PI: 'The value PI means Payor Identification.',
    XX: 'The value XX means Centers for Medicare and Medicaid Services National Provider Identifier.',
  },
  EB01: { '1': 'The value 1 means Active Coverage.' },
  EB03: { '30': 'The value 30 identifies health benefit plan coverage as the service type.' },
  DTP01: { '291': 'The value 291 means Plan (date/range for which plan is in effect).' },
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

    let displayValue = rawValue;
    if (rawValue === '') {
      displayValue = '(empty)';
    } else if (rawValue.trim() === '') {
      displayValue = `(blank: ${rawValue.length} spaces)`;
    }

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
    const codes = document.findings.map(({ code }) => code).join(', ');
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
    return { ordinal: interchangeIndex + 1, raw, segments };
  });

  return {
    displaySource: interchanges
      .flatMap(({ segments }) => segments.map(({ raw }) => raw))
      .join('\n'),
    interchanges,
  };
}
