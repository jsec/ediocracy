// @ts-check

import { validateExample } from '../../scripts/lib/validate-example.mjs';

const STEDI_SEGMENT_URL = 'https://www.stedi.com/edi/x12-005010/segment';

/** @typedef {{ purpose: string, reference: string, fields: Array<[string, string]> }} SegmentDefinition */
/** @typedef {{ position: string, rawValue: string, displayValue: string, name: string, explanation: string }} WalkthroughField */

/**
 * Shared field definitions for the segments represented by the public examples.
 * The definitions describe public field references; X279A1 remains the source
 * for the complete transaction grammar and situational requirements.
 */
/** @type {Readonly<Record<string, SegmentDefinition>>} */
export const SEGMENT_DEFINITIONS = Object.freeze({
  ISA: {
    purpose: 'Opens an interchange and establishes its fixed control and delimiter positions.',
    reference: `${STEDI_SEGMENT_URL}/ISA`,
    fields: [
      ['Authorization Information Qualifier', 'Identifies the format of the authorization information.'],
      ['Authorization Information', 'Carries the authorization value; this example leaves the fixed-width value blank.'],
      ['Security Information Qualifier', 'Identifies the format of the security information.'],
      ['Security Information', 'Carries the security value; this example leaves the fixed-width value blank.'],
      ['Interchange ID Qualifier', 'Identifies the type of sender identifier.'],
      ['Interchange Sender ID', 'Identifies the sender of this interchange.'],
      ['Interchange ID Qualifier', 'Identifies the type of receiver identifier.'],
      ['Interchange Receiver ID', 'Identifies the receiver of this interchange.'],
      ['Interchange Date', 'Records the interchange date in YYMMDD format.'],
      ['Interchange Time', 'Records the interchange time in HHMM format.'],
      ['Repetition Separator', 'Separates repeated composite values in this interchange.'],
      ['Interchange Control Version Number', 'Identifies the interchange control version, 00501 here.'],
      ['Interchange Control Number', 'Identifies this interchange and must match IEA02.'],
      ['Acknowledgment Requested', 'Indicates whether an interchange acknowledgment is requested.'],
      ['Interchange Usage Indicator', 'Indicates whether the interchange is for test, production, or information data.'],
      ['Component Element Separator', 'Separates component values within a composite element.'],
    ],
  },
  GS: {
    purpose: 'Opens a functional group inside the interchange.',
    reference: `${STEDI_SEGMENT_URL}/GS`,
    fields: [
      ['Functional Identifier Code', 'Identifies a group of application-related transaction sets.'],
      ["Application Sender's Code", 'Identifies the party sending the transmission.'],
      ["Application Receiver's Code", 'Identifies the party receiving the transmission.'],
      ['Date', 'Records the functional group date.'],
      ['Time', 'Records the functional group time.'],
      ['Group Control Number', 'Identifies this group and must match GE02.'],
      ['Responsible Agency Code', 'Identifies the agency responsible for the implementation convention.'],
      ['Version / Release / Industry Identifier Code', 'Identifies the implementation convention used by the group.'],
    ],
  },
  ST: {
    purpose: 'Opens a transaction set inside the functional group.',
    reference: `${STEDI_SEGMENT_URL}/ST`,
    fields: [
      ['Transaction Set Identifier Code', 'Identifies this response as transaction set 271.'],
      ['Transaction Set Control Number', 'Identifies this transaction and must match SE02.'],
      ['Implementation Convention Reference', 'Identifies the implementation convention used by the transaction.'],
    ],
  },
  BHT: {
    purpose: 'Supplies beginning-of-hierarchical-transaction context.',
    reference: `${STEDI_SEGMENT_URL}/BHT`,
    fields: [
      ['Hierarchical Structure Code', 'Identifies the hierarchical structure used by the transaction.'],
      ['Transaction Set Purpose Code', 'States the purpose of this transaction set.'],
      ['Reference Identification', 'Provides the transaction reference used in this response.'],
      ['Date', 'Records the date the transaction was created in the business application.'],
      ['Time', 'Records the time the transaction was created in the business application.'],
    ],
  },
  HL: {
    purpose: 'Establishes one hierarchical level and its optional parent relationship.',
    reference: `${STEDI_SEGMENT_URL}/HL`,
    fields: [
      ['Hierarchical ID Number', 'Identifies this hierarchy level.'],
      ['Hierarchical Parent ID Number', 'Identifies the parent level. It is blank at the top level.'],
      ['Hierarchical Level Code', 'Identifies the kind of entity represented by this level.'],
      ['Hierarchical Child Code', 'Indicates whether this level has subordinate levels.'],
    ],
  },
  NM1: {
    purpose: 'Identifies the party attached to the current hierarchy level.',
    reference: `${STEDI_SEGMENT_URL}/NM1`,
    fields: [
      ['Entity Identifier Code', 'Identifies the party role represented by this name loop.'],
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
  EB: {
    purpose: 'Reports one qualified eligibility or benefit statement in the current subscriber context.',
    reference: `${STEDI_SEGMENT_URL}/EB`,
    fields: [
      ['Eligibility or Benefit Information Code', 'States the eligibility or benefit status represented by this statement.'],
      ['Coverage Level Code', 'Identifies the coverage level when supplied.'],
      ['Service Type Code', 'Identifies the service type covered by this statement.'],
      ['Insurance Type Code', 'Identifies the insurance type when supplied.'],
      ['Plan Coverage Description', 'Provides the plan or coverage description used in this response.'],
    ],
  },
  DTP: {
    purpose: 'Supplies a date or date period related to the current benefit context.',
    reference: `${STEDI_SEGMENT_URL}/DTP`,
    fields: [
      ['Date/Time Qualifier', 'Identifies what the date represents.'],
      ['Date Time Period Format Qualifier', 'Identifies the format of the date value.'],
      ['Date Time Period', 'Supplies the date or date period.'],
    ],
  },
  MSG: {
    purpose: 'Carries explanatory text associated with the surrounding response context.',
    reference: `${STEDI_SEGMENT_URL}/MSG`,
    fields: [
      ['Free-Form Message Text', 'Provides the explanatory text carried by this response.'],
    ],
  },
  SE: {
    purpose: 'Closes a transaction set and declares its segment count.',
    reference: `${STEDI_SEGMENT_URL}/SE`,
    fields: [
      ['Number of Included Segments', 'Counts segments from ST through SE.'],
      ['Transaction Set Control Number', 'Matches ST02 for this transaction.'],
    ],
  },
  GE: {
    purpose: 'Closes a functional group and declares its transaction count.',
    reference: `${STEDI_SEGMENT_URL}/GE`,
    fields: [
      ['Number of Transaction Sets Included', 'Counts transaction sets in this functional group.'],
      ['Group Control Number', 'Matches GS06 for this functional group.'],
    ],
  },
  IEA: {
    purpose: 'Closes an interchange and declares its group count.',
    reference: `${STEDI_SEGMENT_URL}/IEA`,
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
 * Build the ordered, source-backed data used by the Astro walkthrough.
 * This is intentionally limited to source segment and field views.
 *
 * @param {string} source
 * @returns {{ displaySource: string, interchanges: Array<{ ordinal: number, raw: string, segments: Array<{ ordinal: number, name: string, raw: string, explanation: string, reference: string, fields: WalkthroughField[] }> }> }}
 */
export function buildWalkthrough(source) {
  const validation = validateExample(source);
  if (validation.errors.length > 0) {
    const codes = validation.errors.map(({ code }) => code).join(', ');
    throw new Error(`Cannot build walkthrough: ${codes}`);
  }

  const interchanges = validation.interchanges.map((raw, interchangeIndex) => {
    const elementSeparator = raw[3];
    const segmentTerminator = raw[105];
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
        reference: definition.reference,
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
